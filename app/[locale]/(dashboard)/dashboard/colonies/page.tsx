import { getTranslations } from "next-intl/server";

import { AddColonyForm } from "@/components/forms/add-colony-form";
import { ColonyListView } from "@/components/forms/colony-list-view";
import { ColonyMap, type ColonyMapItem } from "@/components/map/colony-map";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export default async function ColoniesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const errors = await getTranslations("errors");
  const coloniesT = await getTranslations("colonies");
  const catsT = await getTranslations("cats");

  if (!hasSupabaseEnv()) {
    return (
      <Card>
        <CardTitle>{errors("supabaseVariablesMissing")}</CardTitle>
        <CardText className="mt-2">{errors("supabaseEnvDesc")}</CardText>
      </Card>
    );
  }

  const supabase = await createClient();

  const [{ data: colonies }, { data: cats }, { data: logs }] = await Promise.all([
    supabase.from("colonies").select("id, name, location_name, latitude, longitude, description, photo_url").order("created_at"),
    supabase.from("cats").select("id, colony_id, tnr_status, is_alive, is_adopted"),
    supabase.from("feeding_logs").select("id, colony_id, fed_at").order("fed_at", { ascending: false }),
  ]);

  const mapItems: ColonyMapItem[] = (colonies ?? []).map((colony) => {
    const colonyCats = (cats ?? []).filter((cat) => cat.colony_id === colony.id && cat.is_alive && !cat.is_adopted);
    const latestLog = (logs ?? []).find((log) => log.colony_id === colony.id);
    return {
      id: colony.id,
      name: colony.name,
      locationName: colony.location_name,
      latitude: colony.latitude,
      longitude: colony.longitude,
      description: colony.description ?? null,
      photoUrl: colony.photo_url ?? null,
      catCount: colonyCats.length,
      eartippedCount: colonyCats.filter((cat) => cat.tnr_status === "eartipped").length,
      tnrCounts: {
        unaltered: colonyCats.filter((cat) => cat.tnr_status === "unaltered").length,
        trapped: colonyCats.filter((cat) => cat.tnr_status === "trapped").length,
        neutered_spayed: colonyCats.filter((cat) => cat.tnr_status === "neutered_spayed").length,
        eartipped: colonyCats.filter((cat) => cat.tnr_status === "eartipped").length,
      },
      lastFedAt: latestLog?.fed_at ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <AddColonyForm />

      <Card>
        <CardTitle>{coloniesT("mapTitle")}</CardTitle>
        <CardText className="mt-1">{coloniesT("mapHint")}</CardText>
        <div className="mt-4">
          <ColonyMap
            colonies={mapItems}
            labels={{
              locationNotNamed: coloniesT("noLocation"),
              tapPinHint: coloniesT("mapHint"),
              tnrDistribution: coloniesT("tnrDistribution"),
              lastFed: coloniesT("lastFed"),
              noRecentLogs: coloniesT("noRecentLogs"),
              catsTracked: coloniesT("catsTracked"),
              statusUnaltered: catsT("tnrStatusUnaltered"),
              statusTrapped: catsT("tnrStatusTrapped"),
              statusNeuteredSpayed: catsT("tnrStatusNeutered"),
              statusEartipped: catsT("tnrStatusEartipped"),
            }}
          />
        </div>
      </Card>

      <ColonyListView
        locale={locale}
        colonies={mapItems.map((colony) => ({
          id: colony.id,
          name: colony.name,
          locationName: colony.locationName,
          latitude: colony.latitude,
          longitude: colony.longitude,
          description: colony.description ?? null,
          photoUrl: colony.photoUrl ?? null,
          catCount: colony.catCount,
          eartippedCount: colony.eartippedCount,
          aliveLinkedCatsCount: (cats ?? []).filter((cat) => cat.colony_id === colony.id && cat.is_alive).length,
        }))}
        labels={{
          view: coloniesT("view"),
          edit: coloniesT("editColony"),
          save: coloniesT("save"),
          cancel: coloniesT("cancel"),
          noLocation: coloniesT("noLocation"),
          catsTracked: coloniesT("catsTracked"),
          eartipped: coloniesT("eartippedShort"),
          editTitle: coloniesT("editColony"),
          editHint: coloniesT("editHint"),
          name: coloniesT("colonyName"),
          location: coloniesT("location"),
          latitude: coloniesT("latitude"),
          longitude: coloniesT("longitude"),
          description: coloniesT("description"),
        }}
      />
    </div>
  );
}
