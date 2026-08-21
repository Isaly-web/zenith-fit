import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, Card, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { dayKey, generateWorkout, weeklyPlan } from "@/lib/fitness/engine";
import { typeMeta } from "@/lib/fitness/catalog";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Weekly plan — Nordvital" },
      {
        name: "description",
        content: "A balanced week built from your preferred types and training frequency.",
      },
      { property: "og:title", content: "Weekly plan — Nordvital" },
      {
        property: "og:description",
        content: "A balanced week built around your training frequency.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { state, saveWorkout } = useFitness();
  const navigate = useNavigate();
  const plan = weeklyPlan(state);
  const today = dayKey(new Date());

  const start = (i: number) => {
    const day = plan[i];
    if (!day || day.rest || !day.type || !day.duration || !day.timeOfDay) return;
    const w = generateWorkout(state, {
      type: day.type,
      duration: day.duration,
      timeOfDay: day.timeOfDay,
      date: new Date(day.date),
    });
    saveWorkout(w);
    void navigate({ to: "/session/$id", params: { id: w.id } });
  };

  return (
    <AppShell
      title="Weekly plan"
      subtitle={`${state.profile.weeklyTarget} sessions per week · rest days spaced automatically`}
      action={
        <Link
          to="/calendar"
          className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
        >
          Calendar
        </Link>
      }
    >
      <div className="space-y-3">
        {plan.map((d, i) => {
          const done = state.workouts.some(
            (w) => w.completedAt && dayKey(w.completedAt) === d.date,
          );
          return (
            <Card
              key={d.date}
              className={`flex items-center gap-4 ${d.date === today ? "ring-1 ring-primary" : ""}`}
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary">
                <span className="text-xs font-medium">{d.label}</span>
              </div>
              <div className="min-w-0 flex-1">
                {d.rest ? (
                  <>
                    <p className="font-medium">Rest & recover</p>
                    <p className="text-sm text-muted-foreground">
                      Light walking or breathing is fine
                    </p>
                  </>
                ) : (
                  <>
                    <p className="truncate font-medium">
                      {typeMeta(d.type!).emoji} {typeMeta(d.type!).label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {d.duration} min · {d.timeOfDay}
                    </p>
                  </>
                )}
              </div>
              {done ? (
                <span className="shrink-0 text-sm text-primary">Done</span>
              ) : d.rest ? null : (
                <button
                  type="button"
                  onClick={() => start(i)}
                  className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                >
                  Start
                </button>
              )}
            </Card>
          );
        })}
      </div>

      <SectionTitle>Adjust the plan</SectionTitle>
      <Card>
        <p className="text-sm text-muted-foreground">
          The plan is generated from your preferred workout types and weekly frequency. Change them
          in your profile and the week rebuilds instantly.
        </p>
        <Link to="/profile" className="mt-3 inline-block text-sm font-medium text-primary">
          Edit preferences →
        </Link>
      </Card>
    </AppShell>
  );
}
