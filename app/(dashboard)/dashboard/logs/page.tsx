import { FeedingLogForm } from "@/components/forms/feeding-log-form";
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

export default async function LogsPage() {
  const errors = messages_es.errors as Record<string, string>;
  const dashboard = messages_es.dashboard as Record<string, string>;
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
  const [{ data: colonies }, { data: logs }] = await Promise.all([
    supabase.from("colonies").select("id, name").order("name"),
    supabase
      .from("feeding_logs")
      .select("id, fed_at, hours_spent, colony_id, colonies(name)"),
  ]);

  const feedingLogs = logs ?? [];

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(dayStart);
  const distanceToMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - distanceToMonday);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const hoursToday = sumHoursSince(feedingLogs, dayStart);
  const hoursWeek = sumHoursSince(feedingLogs, weekStart);
  const hoursMonth = sumHoursSince(feedingLogs, monthStart);
  const hoursYear = sumHoursSince(feedingLogs, yearStart);
  const hoursTotal = feedingLogs.reduce((total, log) => total + Number(log.hours_spent ?? 0), 0);

  const colonyHoursMap = new Map<string, number>();
  for (const log of feedingLogs) {
    const colonyName = log.colonies?.name ?? dashboard.unnamedColony;
    colonyHoursMap.set(colonyName, (colonyHoursMap.get(colonyName) ?? 0) + Number(log.hours_spent ?? 0));
  }

  const colonyHours = Array.from(colonyHoursMap.entries())
    .map(([name, hours]) => ({
      name,
      hours,
      share: hoursTotal > 0 ? (hours / hoursTotal) * 100 : 0,
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
      <FeedingLogForm colonies={colonies ?? []} />

      <Card>
        <CardTitle>{logsKpi.title}</CardTitle>
        <CardText className="mt-1">{logsKpi.subtitle}</CardText>

        {(logs ?? []).length === 0 ? <p className="mt-3 text-sm text-slate-500">{dashboard.noData}</p> : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{logsKpi.today}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatHours(hoursToday)} h</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{logsKpi.week}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatHours(hoursWeek)} h</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{logsKpi.month}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatHours(hoursMonth)} h</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{logsKpi.year}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatHours(hoursYear)} h</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{logsKpi.topColony}</p>
            {topColony ? (
              <>
                <p className="mt-1 text-lg font-semibold text-slate-900">{topColony.name}</p>
                <p className="text-sm text-slate-600">
                  {formatHours(topColony.hours)} h ({formatHours(topColony.share)}%)
                </p>
                {topVsSecondPct !== null ? (
                  <p className="mt-2 text-sm text-slate-700">
                    {formatHours(topVsSecondPct)}% {logsKpi.moreThanSecond}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">{dashboard.noData}</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{logsKpi.breakdown}</p>
            <div className="mt-3 space-y-2">
              {colonyHours.slice(0, 5).map((colony) => (
                <div key={colony.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{colony.name}</span>
                    <span className="text-slate-600">
                      {formatHours(colony.hours)} h ({formatHours(colony.share)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{ width: `${Math.min(100, colony.share)}%` }}
                    />
                  </div>
                </div>
              ))}
              {colonyHours.length === 0 ? <p className="text-sm text-slate-500">{dashboard.noData}</p> : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
