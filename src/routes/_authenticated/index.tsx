import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, ArrowRight, ShieldCheck, Clock, History, Target, Sparkles } from "lucide-react";
import { AppShell, Card, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { computeReadiness, computeStats, weeklyPlan, dayKey } from "@/lib/fitness/engine";
import { typeMeta } from "@/lib/fitness/catalog";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Nordvital — your adaptive daily workout" },
      {
        name: "description",
        content:
          "Today's session, readiness score, streak and physio-safe adjustments in one calm dashboard.",
      },
      { property: "og:title", content: "Nordvital — your adaptive daily workout" },
      {
        property: "og:description",
        content: "Today's session, readiness score, streak and physio-safe adjustments.",
      },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 14) return "Midday";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { state, hydrated } = useFitness();
  const readiness = computeReadiness(state);
  const stats = computeStats(state);
  const plan = weeklyPlan(state);
  const today = plan.find((d) => d.date === dayKey(new Date()));
  const upcoming = state.workouts.find((w) => !w.completedAt);

  return (
    <AppShell
      title={`${greeting()}${state.profile.name ? `, ${state.profile.name}` : ""}`}
      subtitle={new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
      action={
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-accent/60 px-3 py-1.5 text-sm font-medium text-accent-foreground">
          <Flame className="size-4" />
          {hydrated ? stats.streak : 0}
        </div>
      }
    >
      <Card className="relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Readiness</p>
            <p className="font-display text-5xl leading-none">{readiness.score}</p>
            <p className="mt-1 text-sm font-medium text-primary">{readiness.label}</p>
          </div>
          <div
            className="size-20 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(var(--moss) ${readiness.score * 3.6}deg, var(--muted) 0deg)`,
              mask: "radial-gradient(circle, transparent 58%, #000 59%)",
              WebkitMask: "radial-gradient(circle, transparent 58%, #000 59%)",
            }}
          />
        </div>
        <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
          {(readiness.reasons.length
            ? readiness.reasons
            : ["Fresh start — let's build a baseline"]
          ).map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-primary">·</span>
              {r}
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle>Coach says</SectionTitle>
      <Card className="flex gap-3 bg-secondary/70">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          {motivation(
            readiness.score,
            stats.streak,
            stats.weekSessions,
            state.profile.weeklyTarget,
          )}
        </p>
      </Card>

      <SectionTitle>Today</SectionTitle>
      {upcoming ? (
        <Link to="/session/$id" params={{ id: upcoming.id }}>
          <Card className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Ready to start
              </p>
              <p className="truncate font-display text-2xl">{upcoming.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {upcoming.duration} min · {upcoming.timeOfDay}
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-primary" />
          </Card>
        </Link>
      ) : (
        <Link to="/new">
          <Card className="flex items-center justify-between gap-4 bg-primary text-primary-foreground">
            <div className="min-w-0">
              <p className="font-display text-2xl">Generate today's session</p>
              <p className="mt-1 text-sm opacity-80">
                {today && !today.rest && today.type
                  ? `Plan suggests ${typeMeta(today.type).label} · ${today.duration} min`
                  : "Rest day in your plan — a gentle option still works"}
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0" />
          </Card>
        </Link>
      )}

      {state.profile.limitations.length > 0 && (
        <Card className="mt-4 flex gap-3 bg-sand/50">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Physio mode active — exercises loading{" "}
            <span className="font-medium text-foreground">
              {state.profile.limitations.join(", ")}
            </span>{" "}
            are automatically swapped for safe alternatives.
          </p>
        </Card>
      )}

      <SectionTitle>This week</SectionTitle>
      <Card>
        <div className="flex justify-between">
          {plan.map((d) => {
            const trained = state.workouts.some(
              (w) => w.completedAt && dayKey(w.completedAt) === d.date,
            );
            return (
              <div key={d.date} className="flex flex-col items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{d.label}</span>
                <span
                  className={`grid size-8 place-items-center rounded-full text-[11px] ${
                    trained
                      ? "bg-primary text-primary-foreground"
                      : d.rest
                        ? "bg-muted text-muted-foreground"
                        : "border border-dashed border-primary/50 text-primary"
                  }`}
                >
                  {trained ? "✓" : d.rest ? "–" : d.duration}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
          <Stat label="Sessions" value={stats.weekSessions} />
          <Stat label="Minutes" value={stats.weekMinutes} />
          <Stat label="Best streak" value={stats.bestStreak} />
        </div>
      </Card>

      <SectionTitle>Shortcuts</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <ShortcutLink to="/history" label="Workout history" icon={<History className="size-4" />} />
        <ShortcutLink to="/goals" label="Goals" icon={<Target className="size-4" />} />
        <ShortcutLink to="/calendar" label="Calendar" icon={<Clock className="size-4" />} />
        <ShortcutLink to="/new" label="New workout" icon={<ArrowRight className="size-4" />} />
      </div>
    </AppShell>
  );
}

function motivation(score: number, streak: number, weekSessions: number, target: number) {
  if (streak >= 3)
    return `${streak} days in a row — that consistency is what actually moves the needle. Keep today simple and protect the streak.`;
  if (weekSessions >= target)
    return "Weekly target already met. Anything extra today is a bonus, so pick something you enjoy.";
  if (score < 40)
    return "Your body is asking for a lighter day. Ten minutes of breathing or mobility still counts as showing up.";
  if (score >= 80) return "You're fresh and recovered — this is the day to take the harder option.";
  return "Small, repeatable sessions beat heroic ones. Start the session and let the coach handle the rest.";
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-2xl">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ShortcutLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="card-soft flex items-center gap-2 px-4 py-4 text-sm font-medium">
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}
