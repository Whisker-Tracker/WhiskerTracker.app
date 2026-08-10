"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database.types";

const colonySchema = z.object({
  name: z.string().min(2),
  location_name: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  description: z.string().optional(),
});

const catSchema = z.object({
  colony_id: z.uuid(),
  name: z.string().min(1),
  gender: z.enum(["male", "female", "unknown"]),
  tnr_status: z.enum(["unaltered", "trapped", "neutered_spayed", "eartipped"]),
  microchip_id: z.string().optional(),
  distinctive_marks: z.string().optional(),
  notes: z.string().optional(),
  estimated_birth_date: z.string().optional(),
  is_alive: z.boolean().default(true),
  is_adopted: z.boolean().default(false),
});

const catProfileUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  gender: z.enum(["male", "female", "unknown"]),
  tnr_status: z.enum(["unaltered", "trapped", "neutered_spayed", "eartipped"]),
  microchip_id: z.string().optional(),
  notes: z.string().optional(),
  estimated_birth_date: z.string().optional(),
  is_alive: z.boolean(),
  is_adopted: z.boolean(),
  new_disease_name: z.string().optional(),
  new_disease_notes: z.string().optional(),
});

const diseaseTreatmentSchema = z.object({
  cat_disease_id: z.uuid(),
  treatment_name: z.string().min(1),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
  notes: z.string().optional(),
});

const resolveDiseaseSchema = z.object({
  disease_id: z.uuid(),
  resolved_at: z.string().optional(),
});

const addCatDiseaseSchema = z.object({
  cat_id: z.uuid(),
  disease_name: z.string().min(1),
  diagnosed_at: z.string().optional(),
  notes: z.string().optional(),
});

const updateDiseaseSchema = z.object({
  id: z.uuid(),
  disease_name: z.string().min(1),
  diagnosed_at: z.string().optional(),
  resolved_at: z.string().optional(),
  notes: z.string().optional(),
});

const updateTreatmentSchema = z.object({
  id: z.uuid(),
  treatment_name: z.string().min(1),
  started_at: z.string().optional(),
  ended_at: z.string().optional(),
  notes: z.string().optional(),
});

const deleteTreatmentSchema = z.object({
  id: z.uuid(),
});

const deleteDiseaseSchema = z.object({
  id: z.uuid(),
});

const feedingLogSchema = z.object({
  colonyId: z.uuid(),
  catsSeenCount: z.number().int().min(0),
  hoursSpent: z.number().min(0).max(24),
  notes: z.string().max(500).optional(),
});

const managedUserSchema = z.object({
  id: z.uuid().optional(),
  email: z.email().optional(),
  password: z.string().min(8).optional(),
  fullName: z.string().max(120).optional(),
  role: z.enum(["admin", "caretaker", "volunteer"]),
  isActive: z.boolean(),
});

const managedUserDetailsSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string().max(120).optional(),
  role: z.enum(["admin", "caretaker", "volunteer"]),
  isActive: z.boolean(),
  password: z.string().min(8).optional(),
});

async function getCurrentAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  const isAdmin = Boolean(profile?.role === "admin" && profile?.is_active);
  return { supabase, user, isAdmin };
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

type ActionResult = {
  ok: boolean;
  message: string;
};

export async function createColonyAction(formData: FormData) {
  const parsed = colonySchema.safeParse({
    name: formData.get("name"),
    location_name: formData.get("location_name") || undefined,
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const photoUrlValue = formData.get("photo_url");
  const photoUrl = typeof photoUrlValue === "string" && photoUrlValue.length > 0 ? photoUrlValue : null;
  const photo = formData.get("photo");
  const { data: createdColony, error } = await supabase
    .from("colonies")
    .insert({
      ...parsed.data,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !createdColony) {
    return;
  }

  let persistedPhotoUrl: string | null = photoUrl;
  if (!persistedPhotoUrl && photo instanceof File && photo.size > 0) {
    const filePath = `colonies/${createdColony.id}/${Date.now()}-${photo.name}`;
    const upload = await supabase.storage.from("cat-photos").upload(filePath, photo, {
      upsert: false,
      cacheControl: "3600",
    });

    if (!upload.error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("cat-photos").getPublicUrl(filePath);
      persistedPhotoUrl = publicUrl;
    }
  }

  if (persistedPhotoUrl !== null) {
    await supabase.from("colonies").update({ photo_url: persistedPhotoUrl }).eq("id", createdColony.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/es/dashboard");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/en/dashboard");
  revalidatePath("/en/dashboard/colonies");
}

export async function updateColonyAction(input: FormData | {
  id: string;
  name: string;
  location_name?: string;
  latitude: number;
  longitude: number;
  description?: string;
  photo?: File | null;
  photo_url?: string | null;
}) {
  let parsed;
  let photo: File | null = null;
  let photoUrl: string | null | undefined;

  if (input instanceof FormData) {
    parsed = colonySchema.extend({ id: z.uuid() }).safeParse({
      id: input.get("id"),
      name: input.get("name"),
      location_name: input.get("location_name") || undefined,
      latitude: input.get("latitude"),
      longitude: input.get("longitude"),
      description: input.get("description") || undefined,
    });
    const photoValue = input.get("photo");
    const photoUrlValue = input.get("photo_url");
    photo = photoValue instanceof File ? photoValue : null;
    photoUrl = typeof photoUrlValue === "string" && photoUrlValue.length > 0 ? photoUrlValue : undefined;
  } else {
    parsed = colonySchema.extend({ id: z.uuid() }).safeParse(input);
    photo = input.photo ?? null;
    photoUrl = input.photo_url ?? undefined;
  }

  if (!parsed.success) {
    return { ok: false, message: "Invalid colony details." };
  }

  const supabase = await createClient();

  if (photo instanceof File && photo.size > 0 && photoUrl === undefined) {
    const filePath = `colonies/${parsed.data.id}/${Date.now()}-${photo.name}`;
    const upload = await supabase.storage.from("cat-photos").upload(filePath, photo, {
      upsert: false,
      cacheControl: "3600",
    });

    if (upload.error) {
      return { ok: false, message: upload.error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("cat-photos").getPublicUrl(filePath);
    photoUrl = publicUrl;
  }

  const { error } = await supabase
    .from("colonies")
    .update({
      name: parsed.data.name,
      location_name: parsed.data.location_name || null,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      description: parsed.data.description || null,
      ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/es/dashboard");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/en/dashboard");
  revalidatePath("/en/dashboard/colonies");

  return { ok: true, message: "Colony updated." };
}

export async function deleteColonyAction(input: { id: string }) {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid colony id." };
  }

  const supabase = await createClient();

  const { count: aliveCatsCount, error: aliveCatsError } = await supabase
    .from("cats")
    .select("id", { count: "exact", head: true })
    .eq("colony_id", parsed.data.id)
    .eq("is_alive", true);

  if (aliveCatsError) {
    return { ok: false, message: aliveCatsError.message };
  }

  if ((aliveCatsCount ?? 0) > 0) {
    return {
      ok: false,
      message: "This colony cannot be removed while alive cats are linked to it. Move those cats to another colony and try again.",
    };
  }

  const { data: deletedRows, error } = await supabase
    .from("colonies")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!deletedRows || deletedRows.length === 0) {
    return {
      ok: false,
      message: "Colony could not be deleted. Check row-level security delete policy for colonies.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/es/dashboard");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/en/dashboard");
  revalidatePath("/en/dashboard/colonies");

  return { ok: true, message: "Colony deleted." };
}

export async function createCatAction(_previousState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = catSchema.safeParse({
    colony_id: formData.get("colony_id"),
    name: formData.get("name"),
    gender: formData.get("gender"),
    tnr_status: formData.get("tnr_status"),
    microchip_id: formData.get("microchip_id") || undefined,
    distinctive_marks: formData.get("distinctive_marks") || undefined,
    notes: formData.get("notes") || undefined,
    estimated_birth_date: formData.get("estimated_birth_date") || undefined,
    is_alive: formData.get("is_alive") === "on",
    is_adopted: formData.get("is_adopted") === "on",
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid cat details. Please review the form fields." };
  }

  const supabase = await createClient();
  let photoUrl: string | null = null;

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const filePath = `cats/${parsed.data.colony_id}/${Date.now()}-${photo.name}`;
    const upload = await supabase.storage.from("cat-photos").upload(filePath, photo, {
      upsert: false,
      cacheControl: "3600",
    });

    if (upload.error) {
      return { ok: false, message: upload.error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("cat-photos").getPublicUrl(filePath);
    photoUrl = publicUrl;
  }

  const { error } = await supabase.from("cats").insert({
    ...parsed.data,
    estimated_birth_date: parsed.data.estimated_birth_date || null,
    deceased_at: parsed.data.is_alive ? null : new Date().toISOString(),
    adopted_at: parsed.data.is_adopted ? new Date().toISOString() : null,
    photo_url: photoUrl,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cats");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/es/dashboard");
  revalidatePath("/es/dashboard/cats");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/en/dashboard");
  revalidatePath("/en/dashboard/cats");
  revalidatePath("/en/dashboard/colonies");

  return { ok: true, message: "Cat profile saved." };
}

export async function updateCatProfileAction(input: {
  id: string;
  name: string;
  gender: "male" | "female" | "unknown";
  tnr_status: "unaltered" | "trapped" | "neutered_spayed" | "eartipped";
  microchip_id?: string;
  notes?: string;
  estimated_birth_date?: string;
  is_alive: boolean;
  is_adopted: boolean;
  new_disease_name?: string;
  new_disease_notes?: string;
}) {
  const parsed = catProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid cat profile details." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("cats")
    .update({
      name: parsed.data.name,
      gender: parsed.data.gender,
      tnr_status: parsed.data.tnr_status,
      microchip_id: parsed.data.microchip_id || null,
      notes: parsed.data.notes || null,
      estimated_birth_date: parsed.data.estimated_birth_date || null,
      is_alive: parsed.data.is_alive,
      is_adopted: parsed.data.is_adopted,
      deceased_at: parsed.data.is_alive ? null : new Date().toISOString(),
      adopted_at: parsed.data.is_adopted ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  if (parsed.data.new_disease_name?.trim()) {
    const { error: diseaseError } = await supabase.from("cat_diseases").insert({
      cat_id: parsed.data.id,
      disease_name: parsed.data.new_disease_name.trim(),
      notes: parsed.data.new_disease_notes?.trim() || null,
      diagnosed_at: new Date().toISOString().slice(0, 10),
    });

    if (diseaseError) {
      return { ok: false, message: diseaseError.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cats");
  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/es/dashboard");
  revalidatePath("/es/dashboard/cats");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/en/dashboard");
  revalidatePath("/en/dashboard/cats");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");
  revalidatePath("/en/dashboard/colonies");
  return { ok: true, message: "Cat profile updated." };
}

export async function addDiseaseTreatmentAction(formData: FormData): Promise<void> {
  const parsed = diseaseTreatmentSchema.safeParse({
    cat_disease_id: formData.get("cat_disease_id"),
    treatment_name: formData.get("treatment_name"),
    started_at: getFormString(formData, "started_at") || undefined,
    ended_at: getFormString(formData, "ended_at") || undefined,
    notes: getFormString(formData, "notes") || undefined,
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("cat_disease_treatments").insert({
    cat_disease_id: parsed.data.cat_disease_id,
    treatment_name: parsed.data.treatment_name.trim(),
    ...(parsed.data.started_at ? { started_at: parsed.data.started_at } : {}),
    ended_at: parsed.data.ended_at || null,
    notes: parsed.data.notes?.trim() || null,
    created_by: user?.id ?? null,
  });

  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");
}

export async function resolveCatDiseaseAction(formData: FormData): Promise<void> {
  const parsed = resolveDiseaseSchema.safeParse({
    disease_id: formData.get("disease_id"),
    resolved_at: getFormString(formData, "resolved_at") || undefined,
  });

  if (!parsed.success) {
    return;
  }

  const supabase = await createClient();
  const resolvedAt = parsed.data.resolved_at || new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("cat_diseases")
    .update({
      resolved_at: resolvedAt,
    })
    .eq("id", parsed.data.disease_id)
    .is("resolved_at", null);

  if (error) {
    return;
  }

  await supabase
    .from("cat_disease_treatments")
    .update({ ended_at: resolvedAt })
    .eq("cat_disease_id", parsed.data.disease_id)
    .is("ended_at", null);

  revalidatePath("/dashboard/cats");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/es/dashboard/cats");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/en/dashboard/cats");
  revalidatePath("/en/dashboard/colonies");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");
}

export async function addCatDiseaseAction(input: {
  cat_id: string;
  disease_name: string;
  diagnosed_at?: string;
  notes?: string;
}) {
  const parsed = addCatDiseaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid disease details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("cat_diseases").insert({
    cat_id: parsed.data.cat_id,
    disease_name: parsed.data.disease_name.trim(),
    diagnosed_at: parsed.data.diagnosed_at || new Date().toISOString().slice(0, 10),
    notes: parsed.data.notes?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/cats");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/es/dashboard/cats");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/en/dashboard/cats");
  revalidatePath("/en/dashboard/colonies");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");

  return { ok: true, message: "Disease added." };
}

export async function updateDiseaseTreatmentAction(input: {
  id: string;
  treatment_name: string;
  started_at?: string;
  ended_at?: string;
  notes?: string;
}) {
  const parsed = updateTreatmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid treatment details." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("cat_disease_treatments")
    .update({
      treatment_name: parsed.data.treatment_name.trim(),
      started_at: parsed.data.started_at || new Date().toISOString().slice(0, 10),
      ended_at: parsed.data.ended_at || null,
      notes: parsed.data.notes?.trim() || null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");

  return { ok: true, message: "Treatment updated." };
}

export async function updateCatDiseaseAction(input: {
  id: string;
  disease_name: string;
  diagnosed_at?: string;
  resolved_at?: string;
  notes?: string;
}) {
  const parsed = updateDiseaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid disease details." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("cat_diseases")
    .update({
      disease_name: parsed.data.disease_name.trim(),
      diagnosed_at: parsed.data.diagnosed_at || new Date().toISOString().slice(0, 10),
      resolved_at: parsed.data.resolved_at || null,
      notes: parsed.data.notes?.trim() || null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/cats");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/es/dashboard/cats");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/en/dashboard/cats");
  revalidatePath("/en/dashboard/colonies");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");

  return { ok: true, message: "Disease updated." };
}

export async function deleteCatDiseaseAction(input: { id: string }) {
  const parsed = deleteDiseaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid disease id." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("cat_diseases").delete().eq("id", parsed.data.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/cats");
  revalidatePath("/dashboard/colonies");
  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/es/dashboard/cats");
  revalidatePath("/es/dashboard/colonies");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/en/dashboard/cats");
  revalidatePath("/en/dashboard/colonies");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");

  return { ok: true, message: "Disease deleted." };
}

export async function deleteDiseaseTreatmentAction(input: { id: string }) {
  const parsed = deleteTreatmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid treatment id." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("cat_disease_treatments").delete().eq("id", parsed.data.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/diseases");
  revalidatePath("/dashboard/treatments");
  revalidatePath("/es/dashboard/diseases");
  revalidatePath("/es/dashboard/treatments");
  revalidatePath("/en/dashboard/diseases");
  revalidatePath("/en/dashboard/treatments");

  return { ok: true, message: "Treatment deleted." };
}

export async function createFeedingLogAction(input: {
  colonyId: string;
  catsSeenCount: number;
  hoursSpent: number;
  notes?: string;
}) {
  const parsed = feedingLogSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid feeding log details." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("feeding_logs").insert({
    colony_id: parsed.data.colonyId,
    user_id: user?.id ?? null,
    cats_seen_count: parsed.data.catsSeenCount,
    hours_spent: parsed.data.hoursSpent,
    notes: parsed.data.notes,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/logs");
  revalidatePath("/dashboard/colonies");
  return { ok: true, message: "Feeding log saved." };
}

export async function createManagedUserAction(input: {
  email: string;
  password: string;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
}) {
  const parsed = managedUserSchema.safeParse({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    role: input.role,
    isActive: input.isActive,
  });

  if (!parsed.success || !parsed.data.email || !parsed.data.password) {
    return { ok: false, message: "Invalid user details." };
  }

  const { isAdmin } = await getCurrentAdminProfile();
  if (!isAdmin) {
    return { ok: false, message: "Only administrators can manage users." };
  }

  if (!hasSupabaseAdminEnv()) {
    return { ok: false, message: "Missing SUPABASE_SERVICE_ROLE_KEY in server environment." };
  }

  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName ?? "",
    },
  });

  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "Could not create user." };
  }

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName ?? null,
      role: parsed.data.role,
      is_active: parsed.data.isActive,
      email: parsed.data.email,
    })
    .eq("id", data.user.id);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  if (!parsed.data.isActive) {
    await adminSupabase.auth.admin.updateUserById(data.user.id, { ban_duration: "876000h" });
  }

  revalidatePath("/dashboard/users");
  return { ok: true, message: "User created." };
}

export async function updateManagedUserAction(input: {
  id: string;
  role: UserRole;
  isActive: boolean;
}) {
  const parsed = managedUserSchema.safeParse({
    id: input.id,
    role: input.role,
    isActive: input.isActive,
  });

  if (!parsed.success || !parsed.data.id) {
    return { ok: false, message: "Invalid user update payload." };
  }

  const { user, isAdmin } = await getCurrentAdminProfile();
  if (!isAdmin || !user) {
    return { ok: false, message: "Only administrators can manage users." };
  }

  if (parsed.data.id === user.id && !parsed.data.isActive) {
    return { ok: false, message: "You cannot disable your own account." };
  }

  if (!hasSupabaseAdminEnv()) {
    return { ok: false, message: "Missing SUPABASE_SERVICE_ROLE_KEY in server environment." };
  }

  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("profiles")
    .update({ role: parsed.data.role, is_active: parsed.data.isActive })
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  const banDuration = parsed.data.isActive ? "none" : "876000h";
  await adminSupabase.auth.admin.updateUserById(parsed.data.id, { ban_duration: banDuration });

  revalidatePath("/dashboard/users");
  return { ok: true, message: "User updated." };
}

export async function updateManagedUserDetailsAction(input: {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
  password?: string;
}) {
  const parsed = managedUserDetailsSchema.safeParse({
    id: input.id,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    isActive: input.isActive,
    password: input.password,
  });

  if (!parsed.success) {
    return { ok: false, message: "Invalid user update payload." };
  }

  const { user, isAdmin } = await getCurrentAdminProfile();
  if (!isAdmin || !user) {
    return { ok: false, message: "Only administrators can manage users." };
  }

  if (parsed.data.id === user.id && !parsed.data.isActive) {
    return { ok: false, message: "You cannot disable your own account." };
  }

  if (!hasSupabaseAdminEnv()) {
    return { ok: false, message: "Missing SUPABASE_SERVICE_ROLE_KEY in server environment." };
  }

  const adminSupabase = createAdminClient();

  const authUpdatePayload: {
    email: string;
    password?: string;
    user_metadata: { full_name: string };
  } = {
    email: parsed.data.email,
    user_metadata: {
      full_name: parsed.data.fullName ?? "",
    },
  };

  if (parsed.data.password) {
    authUpdatePayload.password = parsed.data.password;
  }

  const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(parsed.data.id, authUpdatePayload);
  if (authUpdateError) {
    return { ok: false, message: authUpdateError.message };
  }

  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName ?? null,
      email: parsed.data.email,
      role: parsed.data.role,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.id);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const banDuration = parsed.data.isActive ? "none" : "876000h";
  await adminSupabase.auth.admin.updateUserById(parsed.data.id, { ban_duration: banDuration });

  revalidatePath("/dashboard/users");
  return { ok: true, message: "User details updated." };
}
