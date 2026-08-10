import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Card, CardText, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";

interface ColonyDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ColonyDetailPage({ params, searchParams }: Readonly<ColonyDetailPageProps>) {
  const { locale, id } = await params;
  const { tab = "cats" } = await searchParams;
  const t = await getTranslations();
  const backHref = locale === "en" ? "/dashboard/colonies" : `/${locale}/dashboard/colonies`;

  const supabase = await createClient();
  const { data: colony } = await supabase
    .from("colonies")
    .select("id, name, location_name, latitude, longitude, description")
    .eq("id", id)
    .single();

  if (!colony) {
    notFound();
  }

  const [{ data: cats }, { data: logs }, { data: diseases }] = await Promise.all([
    supabase
      .from("cats")
      .select("id, name, tnr_status, gender, photo_url, microchip_id, notes, estimated_birth_date, is_alive, is_adopted")
      .eq("colony_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("feeding_logs").select("id, fed_at, cats_seen_count, hours_spent, food_type, notes").eq("colony_id", id).order("fed_at", { ascending: false }),
    supabase
      .from("cat_diseases")
      .select("id, cat_id, disease_name, diagnosed_at, resolved_at, notes")
      .order("diagnosed_at", { ascending: false }),
  ]);

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

  const tabs = [
    { key: "cats", label: t("cats.title") },
    { key: "logs", label: t("logs.title") },
    { key: "map", label: t("colonies.mapLocation") },
  ];

  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("colonies.backToColonies")}
      </Link>

      <Card>
        <CardTitle>{colony.name}</CardTitle>
        <CardText className="mt-1">{colony.location_name ?? t("colonies.noLocation")}</CardText>
        {colony.description ? <p className="mt-3 text-sm text-slate-700">{colony.description}</p> : null}
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/dashboard/colonies/${id}?tab=${item.key}`}
            className={
              item.key === tab
                ? "rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "cats" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {catsWithDiseases.map((cat) => {
            const historicalCount = cat.diseases.filter((entry) => Boolean(entry.resolved_at)).length;

            let cardClassName: string | undefined;
            if (!cat.is_alive) {
              cardClassName = "border-slate-300 bg-slate-100";
            } else if (cat.is_adopted) {
              cardClassName = "border-emerald-200 bg-emerald-50";
            }

            return (
            <Card key={cat.id} className={cardClassName}>
              {cat.photo_url ? (
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
                  <Image src={cat.photo_url} alt={cat.name} width={640} height={360} className="h-40 w-full object-cover" />
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">{cat.name}</p>
                <div className="flex gap-1">
                  {!cat.is_alive ? <span className="rounded-full bg-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{t("colonies.deceased")}</span> : null}
                  {cat.is_adopted ? <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{t("colonies.adopted")}</span> : null}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t("colonies.gender")}: {cat.gender ?? "unknown"}</p>
              {cat.estimated_birth_date ? <p className="text-xs text-slate-500">{t("colonies.estimatedBirth")}: {cat.estimated_birth_date}</p> : null}
              <div className="mt-2">
                <StatusBadge status={cat.tnr_status} />
              </div>
              {cat.microchip_id ? <p className="mt-2 text-xs text-slate-500">{t("colonies.microchip")}: {cat.microchip_id}</p> : null}
              {historicalCount > 0 ? <p className="mt-1 text-xs text-slate-600">{t("colonies.historicalDiseases")}: {historicalCount}</p> : null}
              {cat.notes ? <p className="mt-2 text-sm text-slate-700">{cat.notes}</p> : null}
            </Card>
          );})}
          {catsWithDiseases.length === 0 ? <p className="text-sm text-slate-500">{t("cats.noCats")}</p> : null}
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="space-y-2">
          {(logs ?? []).map((log) => (
            <Card key={log.id}>
              <p className="text-sm font-semibold text-slate-900">{new Date(log.fed_at).toLocaleString()}</p>
              <p className="text-xs text-slate-500">{t("logs.foodType")}: {log.food_type ?? t("logs.unknownFood")} | {t("logs.seen")}: {log.cats_seen_count} | {t("logs.hours")}: {log.hours_spent}</p>
              {log.notes ? <p className="mt-2 text-sm text-slate-700">{log.notes}</p> : null}
            </Card>
          ))}
          {(logs ?? []).length === 0 ? <p className="text-sm text-slate-500">{t("logs.noLogs")}</p> : null}
        </div>
      ) : null}

      {tab === "map" ? (
        <Card>
          <CardTitle>{t("colonies.coordinates")}</CardTitle>
          <p className="mt-2 text-sm text-slate-700">{t("colonies.latitude")}: {colony.latitude}</p>
          <p className="text-sm text-slate-700">{t("colonies.longitude")}: {colony.longitude}</p>
        </Card>
      ) : null}
    </div>
  );
}
