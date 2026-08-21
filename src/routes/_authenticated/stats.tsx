import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { AppShell, Card, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { computeStats } from "@/lib/fitness/engine";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistics & streaks — Nordvital" },
      {
        name: "description",
        content: "Weekly volume, streaks and how your training splits across disciplines.",
      },
      { property: "og:title", content: "Statistics & streaks — Nordvital" },
      { property: "og:description", content: "Weekly volume, streaks and training split." },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const { state } = useFitness();
  const stats = computeStats(state);
  const maxMinutes = Math.max(1, ...stats.byType.map((t) => t.minutes));

  return (
    <AppShell
      title="Statistics"
      subtitle="Consistency first, intensity second"
      action={
        <Link
          to="/history"
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
        >
          History
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Current streak" value={`${stats.streak} d`} />
        <Metric label="Best streak" value={`${stats.bestStreak} d`} />
        <Metric label="Total sessions" value={stats.totalSessions} />
        <Metric label="Total minutes" value={stats.totalMinutes} />
      </div>

      <SectionTitle>Minutes per week</SectionTitle>
      <Card className="pl-0 pr-2">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.last8Weeks}>
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="minutes" radius={10} fill="var(--moss)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Training split</SectionTitle>
      <Card>
        {stats.byType.length === 0 ? (
          <p className="text-sm text-muted-foreground">Complete a session to see your split.</p>
        ) : (
          <ul className="space-y-3">
            {stats.byType.map((t) => (
              <li key={t.type}>
                <div className="flex justify-between text-sm">
                  <span>{t.label}</span>
                  <span className="text-muted-foreground">{t.minutes} min</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(t.minutes / maxMinutes) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SectionTitle>Goals</SectionTitle>
      <Link to="/goals" className="card-soft block px-5 py-4 text-sm font-medium">
        Manage goals →
      </Link>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="font-display text-3xl leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </Card>
  );
}
