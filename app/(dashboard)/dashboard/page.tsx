import { Card, CardText, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import messages_es from "@/messages/es.json";

function sumHoursSince(
  logs: Array<{ fed_at: string; hours_spent: number | null }>,
  startDate: Date,
) {
  return logs.reduce((total, log) => {
    const fedAt = new Date(log.fed_at);
    if (fedAt < startDate) return total;
    return total + Number(log.hours_spent ?? 0);
  }, 0);
}

function formatHours(value: number) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function MetricCard({
  label,
  value,
  hint,
  className,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
  className?: string;
}>) {
  return (
    <Card className={className}>
      <CardText>{label}</CardText>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function FeedingMetricTile({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <CardText>{label}</CardText>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TnrDonutCard({
  title,
  hint,
  centerLabel,
  total,
  segments,
}: Readonly<{
  title: string;
  hint: string;
  centerLabel: string;
  total: number;
  segments: Array<{ key: string; label: string; value: number; color: string }>;
}>) {
  let cursor = 0;
  const parts: string[] = [];

  for (const segment of segments) {
    if (segment.value <= 0 || total <= 0) {
      continue;
    }

    const start = (cursor / total) * 100;
    cursor += segment.value;
    const end = (cursor / total) * 100;
    parts.push(`${segment.color} ${start}% ${end}%`);
  }

  const donutBackground = parts.length > 0 ? `conic-gradient(${parts.join(", ")})` : "conic-gradient(#e2e8f0 0% 100%)";

  return (
    <Card>
      <CardText>{title}</CardText>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr] sm:items-center">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-full" style={{ background: donutBackground }}>
          <div className="grid h-18 w-18 place-items-center rounded-full bg-white text-center">
            <p className="text-lg font-semibold text-slate-900">{total}</p>
            <p className="text-[10px] text-slate-500">{centerLabel}</p>
          </div>
        </div>

        <div className="grid gap-1">
          {segments.map((segment) => (
            <p key={segment.key} className="flex items-center justify-between gap-2 text-xs text-slate-700">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
              <span className="font-semibold text-slate-900">{segment.value}</span>
            </p>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const dashboard = messages_es.dashboard as Record<string, string>;
  const errors = messages_es.errors as Record<string, string>;
  const catsLabels = messages_es.cats as Record<string, string>;
  const logsKpi = messages_es.logsKpi as Record<string, string>;

  if (!hasSupabaseEnv()) {
    return (
      <Card>
        <CardTitle>{errors.supabaseVariablesMissing}</CardTitle>
        <CardText className="mt-2">{errors.supabaseEnvDesc}</CardText>
      </Card>
    );
  }

  const supabase = await createClient();

  const [{ count: colonyCount }, { count: catCount }, { count: adoptedCatsCount }, { data: cats }, { data: feedingLogs }] = await Promise.all([
    supabase.from("colonies").select("id", { count: "exact", head: true }),
    supabase.from("cats").select("id", { count: "exact", head: true }).eq("is_alive", true).eq("is_adopted", false),
    supabase.from("cats").select("id", { count: "exact", head: true }).eq("is_adopted", true),
    supabase.from("cats").select("tnr_status").eq("is_alive", true).eq("is_adopted", false),
    supabase.from("feeding_logs").select("fed_at, hours_spent, colonies(name)"),
  ]);

  const eartippedCount = (cats ?? []).filter((cat) => cat.tnr_status === "eartipped").length;
  const unalteredCount = (cats ?? []).filter((cat) => cat.tnr_status === "unaltered").length;
  const trappedCount = (cats ?? []).filter((cat) => cat.tnr_status === "trapped").length;
  const neuteredCount = (cats ?? []).filter((cat) => cat.tnr_status === "neutered_spayed").length;
  const tnrPct = catCount ? Math.round((eartippedCount / catCount) * 100) : 0;

  const tnrSegments = [
    { key: "unaltered", label: catsLabels.tnrStatusUnaltered, value: unalteredCount, color: "#64748b" },
    { key: "trapped", label: catsLabels.tnrStatusTrapped, value: trappedCount, color: "#f59e0b" },
    { key: "neutered_spayed", label: catsLabels.tnrStatusNeutered, value: neuteredCount, color: "#06b6d4" },
    { key: "eartipped", label: catsLabels.tnrStatusEartipped, value: eartippedCount, color: "#0d9488" },
  ];

  const logs = feedingLogs ?? [];
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(dayStart);
  const distanceToMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - distanceToMonday);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const hoursToday = sumHoursSince(logs, dayStart);
  const hoursWeek = sumHoursSince(logs, weekStart);
  const hoursMonth = sumHoursSince(logs, monthStart);
  const hoursYear = sumHoursSince(logs, yearStart);
  const totalHours = logs.reduce((total, log) => total + Number(log.hours_spent ?? 0), 0);

  const colonyHoursMap = new Map<string, number>();
  for (const log of logs) {
    const colonyName = log.colonies?.name ?? dashboard.unnamedColony;
    colonyHoursMap.set(colonyName, (colonyHoursMap.get(colonyName) ?? 0) + Number(log.hours_spent ?? 0));
  }

  const colonyHours = Array.from(colonyHoursMap.entries())
    .map(([name, hours]) => ({
      name,
      hours,
      share: totalHours > 0 ? (hours / totalHours) * 100 : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  const topColony = colonyHours[0] ?? null;
  const secondColony = colonyHours[1] ?? null;
  const topVsSecondPct =
    topColony && secondColony && secondColony.hours > 0
      ? ((topColony.hours - secondColony.hours) / secondColony.hours) * 100
      : null;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={dashboard.coloniesCount}
          value={String(colonyCount ?? 0)}
          hint={dashboard.mappedTerritories}
          className="!border-rose-200 !bg-rose-50"
        />
        <MetricCard
          label={dashboard.catsCount}
          value={String(catCount ?? 0)}
          hint={dashboard.acrossAllColonies}
          className="!border-sky-200 !bg-sky-50"
        />
        <MetricCard
          label={dashboard.eartippedCount}
          value={`${tnrPct}%`}
          hint={`${eartippedCount} ${dashboard.eartippedPercentage}`}
          className="!border-amber-200 !bg-amber-50"
        />
        <MetricCard
          label={dashboard.adoptedCats}
          value={String(adoptedCatsCount ?? 0)}
          hint={dashboard.adoptedCatsHint}
          className="!border-emerald-200 !bg-emerald-50"
        />
        <TnrDonutCard
          title={dashboard.tnrDonutTitle}
          hint={dashboard.tnrDonutHint}
          centerLabel={dashboard.cats}
          total={catCount ?? 0}
          segments={tnrSegments}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardText>{logsKpi.title}</CardText>
          <p className="mt-1 text-xs text-slate-500">{logsKpi.subtitle}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FeedingMetricTile label={logsKpi.today} value={`${formatHours(hoursToday)} h`} />
            <FeedingMetricTile label={logsKpi.week} value={`${formatHours(hoursWeek)} h`} />
            <FeedingMetricTile label={logsKpi.month} value={`${formatHours(hoursMonth)} h`} />
            <FeedingMetricTile label={logsKpi.year} value={`${formatHours(hoursYear)} h`} />
          </div>
        </Card>

        <Card>
          <CardText>{logsKpi.topColony}</CardText>
          {topColony ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <CardText>{topColony.name}</CardText>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{formatHours(topColony.hours)} h</p>
                <p className="mt-2 text-xs text-slate-500">{formatHours(topColony.share)}% {logsKpi.totalShare}</p>
                {topVsSecondPct !== null ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {formatHours(topVsSecondPct)}% {logsKpi.moreThanSecond}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                {colonyHours.slice(0, 4).map((colony) => (
                  <div key={colony.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sm text-slate-600">{colony.name}</span>
                      <span className="text-xs text-slate-500">
                        {formatHours(colony.hours)} h ({formatHours(colony.share)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, colony.share)}%` }} />
                    </div>
                  </div>
                ))}
                {colonyHours.length === 0 ? <p className="text-sm text-slate-500">{dashboard.noData}</p> : null}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{dashboard.noData}</p>
          )}
        </Card>
      </section>
    </div>
  );
}
