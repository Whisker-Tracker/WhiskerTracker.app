import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardText, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";

interface ColonyDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ColonyDetailPage({ params, searchParams }: Readonly<ColonyDetailPageProps>) {
  const { id } = await params;
  const { tab = "cats" } = await searchParams;

  const supabase = await createClient();
  const { data: colony } = await supabase
    .from("colonies")
    .select("id, name, location_name, latitude, longitude, description")
    .eq("id", id)
    .single();

  if (!colony) {
    notFound();
  }

  const [{ data: cats }, { data: logs }] = await Promise.all([
    supabase.from("cats").select("id, name, gender, tnr_status, microchip_id, photo_url, notes, is_alive").eq("colony_id", id).eq("is_adopted", false),
    supabase.from("feeding_logs").select("id, fed_at, cats_seen_count, hours_spent, food_type, notes").eq("colony_id", id).order("fed_at", { ascending: false }),
  ]);

  const tabs = [
    { key: "cats", label: "Cat Roster" },
    { key: "logs", label: "Feeding Logs" },
    { key: "map", label: "Map Location" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>{colony.name}</CardTitle>
        <CardText className="mt-1">{colony.location_name ?? "Unnamed location"}</CardText>
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
          {(cats ?? []).map((cat) => (
            <Card key={cat.id} className={!cat.is_alive ? "border-slate-300 bg-slate-100" : undefined}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-semibold text-slate-900">{cat.name}</p>
                {!cat.is_alive ? <span className="rounded-full bg-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Fallecido</span> : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">Gender: {cat.gender ?? "unknown"}</p>
              <div className="mt-2">
                <StatusBadge status={cat.tnr_status} />
              </div>
              {cat.microchip_id ? <p className="mt-2 text-xs text-slate-500">Microchip: {cat.microchip_id}</p> : null}
              {cat.notes ? <p className="mt-2 text-sm text-slate-700">{cat.notes}</p> : null}
            </Card>
          ))}
          {(cats ?? []).length === 0 ? <p className="text-sm text-slate-500">No cats in this colony yet.</p> : null}
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="space-y-2">
          {(logs ?? []).map((log) => (
            <Card key={log.id}>
              <p className="text-sm font-semibold text-slate-900">{new Date(log.fed_at).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Food: {log.food_type ?? "unknown"} | Seen: {log.cats_seen_count} | Hours: {log.hours_spent}</p>
              {log.notes ? <p className="mt-2 text-sm text-slate-700">{log.notes}</p> : null}
            </Card>
          ))}
          {(logs ?? []).length === 0 ? <p className="text-sm text-slate-500">No feeding logs yet.</p> : null}
        </div>
      ) : null}

      {tab === "map" ? (
        <Card>
          <CardTitle>Coordinates</CardTitle>
          <p className="mt-2 text-sm text-slate-700">Latitude: {colony.latitude}</p>
          <p className="text-sm text-slate-700">Longitude: {colony.longitude}</p>
        </Card>
      ) : null}
    </div>
  );
}
