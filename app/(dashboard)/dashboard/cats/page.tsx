import { AddCatForm } from "@/components/forms/add-cat-form";
import { CatManagementGrid } from "@/components/forms/cat-management-grid";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import messages_es from "@/messages/es.json";

export default async function CatsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ colonyId?: string }>;
}>) {
  const { colonyId } = await searchParams;
  const errors = messages_es.errors as Record<string, string>;
  if (!hasSupabaseEnv()) {
    return (
      <Card>
        <CardTitle>{errors.supabaseVariablesMissing}</CardTitle>
        <CardText className="mt-2">{errors.supabaseEnvDesc}</CardText>
      </Card>
    );
  }

  const supabase = await createClient();

  const [{ data: colonies }, { data: cats }, { data: diseases }] = await Promise.all([
    supabase.from("colonies").select("id, name").order("name"),
    supabase
      .from("cats")
      .select("id, name, tnr_status, gender, photo_url, microchip_id, notes, colony_id, estimated_birth_date, is_alive, is_adopted")
      .order("created_at", { ascending: false }),
    supabase
      .from("cat_diseases")
      .select("id, cat_id, disease_name, diagnosed_at, resolved_at, notes")
      .order("diagnosed_at", { ascending: false }),
  ]);

  const colonyNameById = Object.fromEntries((colonies ?? []).map((colony) => [colony.id, colony.name]));
  const diseaseEntries = (diseases ?? []) as Array<{
    id: string;
    cat_id: string;
    disease_name: string;
    diagnosed_at: string;
    resolved_at: string | null;
    notes: string | null;
  }>;
  const diseasesByCatId = diseaseEntries.reduce<Record<string, typeof diseaseEntries>>((acc, entry) => {
    acc[entry.cat_id] ??= [];
    acc[entry.cat_id].push(entry);
    return acc;
  }, {});

  const catsWithDiseases = (cats ?? []).map((cat) => ({
    ...cat,
    diseases: diseasesByCatId[cat.id] ?? [],
  }));

  return (
    <div className="space-y-4">
      <AddCatForm colonies={colonies ?? []} />

      <CatManagementGrid cats={catsWithDiseases} colonyNameById={colonyNameById} initialColonyFilter={colonyId} />
    </div>
  );
}
