import { getTranslations } from "next-intl/server";

import { TreatmentHistoryView } from "@/components/forms/treatment-history-view";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function TreatmentsPage() {
  const errors = await getTranslations("errors");
  const dashboard = await getTranslations("dashboard");

  if (!hasSupabaseEnv()) {
    return (
      <Card>
        <CardTitle>{errors("supabaseVariablesMissing")}</CardTitle>
        <CardText className="mt-2">{errors("supabaseEnvDesc")}</CardText>
      </Card>
    );
  }

  const supabase = await createClient();

  const [{ data: cats }, { data: diseases }, { data: treatments }] = await Promise.all([
    supabase.from("cats").select("id, name").order("name"),
    supabase.from("cat_diseases").select("id, cat_id, disease_name, resolved_at"),
    supabase
      .from("cat_disease_treatments")
      .select("id, cat_disease_id, treatment_name, started_at, ended_at, notes, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const catNameById = Object.fromEntries((cats ?? []).map((cat) => [cat.id, cat.name]));

  return (
    <TreatmentHistoryView
      diseases={diseases ?? []}
      treatments={treatments ?? []}
      catNameById={catNameById}
      title={dashboard("treatments")}
      emptyText={dashboard("noData")}
    />
  );
}
