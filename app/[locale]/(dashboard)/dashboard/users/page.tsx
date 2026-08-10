import { Card, CardText, CardTitle } from "@/components/ui/card";
import { UserManagementForm } from "@/components/forms/user-management-form";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";

export default async function UsersPage() {
  const errors = await getTranslations("errors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card>
        <CardTitle>{errors("userMgmtUnauthorizedTitle")}</CardTitle>
        <CardText className="mt-2">{errors("userMgmtUnauthorizedDesc")}</CardText>
      </Card>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile?.is_active || profile.role !== "admin") {
    return (
      <Card>
        <CardTitle>{errors("adminRequiredTitle")}</CardTitle>
        <CardText className="mt-2">{errors("adminRequiredDesc")}</CardText>
      </Card>
    );
  }

  if (!hasSupabaseAdminEnv()) {
    return (
      <Card>
        <CardTitle>{errors("missingAdminKeyTitle")}</CardTitle>
        <CardText className="mt-2">{errors("missingAdminKeyDesc")}</CardText>
      </Card>
    );
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, created_at")
    .order("created_at", { ascending: false });

  return <UserManagementForm users={users ?? []} currentUserId={user.id} />;
}
