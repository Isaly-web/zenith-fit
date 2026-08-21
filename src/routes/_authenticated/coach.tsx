import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, Stethoscope, TrendingUp } from "lucide-react";
import { AppShell, Card, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import {
  computeReadiness,
  computeStats,
  generateWorkout,
  guardedAreas,
} from "@/lib/fitness/engine";
import { EXERCISES, typeMeta } from "@/lib/fitness/catalog";
import type { Duration, TimeOfDay, WorkoutTypeId } from "@/lib/fitness/types";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI coach & physiotherapist — Nordvital" },
      {
        name: "description",
        content:
          "Recovery guidance, physio screening of your limitations and a recommended next session.",
      },
      { property: "og:title", content: "AI coach & physiotherapist — Nordvital" },
      {
        property: "og:description",
        content: "Recovery guidance and physio screening of your limitations.",
      },
    ],
  }),
  component: CoachPage,
});

function recommend(
  score: number,
  prefs: WorkoutTypeId[],
): { type: WorkoutTypeId; duration: Duration; time: TimeOfDay } {
  const hour = new Date().getHours();
  const time: TimeOfDay =
    hour < 11 ? "morning" : hour < 14 ? "lunch" : hour < 18 ? "afternoon" : "evening";
  if (score < 40) return { type: "breathing", duration: 10, time };
  if (score < 60)
    return {
      type:
        prefs.find((p) => ["yoga", "walking", "stretching", "tai-chi"].includes(p)) ?? "stretching",
      duration: 20,
      time,
    };
  return { type: prefs[0] ?? "strength", duration: score >= 80 ? 45 : 30, time };
}

function CoachPage() {
  const { state, saveWorkout } = useFitness();
  const navigate = useNavigate();
  const readiness = computeReadiness(state);
  const stats = computeStats(state);
  const blocked = guardedAreas(state.profile, readiness);
  const rec = recommend(readiness.score, state.profile.preferredTypes);

  const avoided = EXERCISES.filter(
    (e) => e.loads.some((l) => blocked.includes(l)) && !e.regressionOf,
  );
  const swaps = avoided
    .map((e) => ({
      from: e.name,
      to: EXERCISES.find(
        (c) => c.regressionOf === e.id && !c.loads.some((l) => blocked.includes(l)),
      )?.name,
    }))
    .filter((s) => s.to)
    .slice(0, 6);

  const start = () => {
    const w = generateWorkout(state, {
      type: rec.type,
      duration: rec.duration,
      timeOfDay: rec.time,
    });
    saveWorkout(w);
    void navigate({ to: "/session/$id", params: { id: w.id } });
  };

  return (
    <AppShell title="AI coach" subtitle="Reading your history, recovery and body signals">
      <Card className="bg-primary text-primary-foreground">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-2xl">Recommended next</p>
            <p className="mt-1 text-sm opacity-85">
              {typeMeta(rec.type).label} · {rec.duration} min · {rec.time}
            </p>
            <p className="mt-3 text-sm opacity-85">
              {readiness.score < 40
                ? "Your recent load and ratings point to fatigue. Keep it restorative today and your next hard session will land better."
                : readiness.score < 60
                  ? "Moderate readiness — a steady aerobic or mobility session keeps momentum without digging a hole."
                  : "You're recovered enough to add load. Take the harder option while the window is open."}
            </p>
            <button
              type="button"
              onClick={start}
              className="mt-4 rounded-full bg-primary-foreground/15 px-5 py-2.5 text-sm font-medium"
            >
              Build this session
            </button>
          </div>
        </div>
      </Card>

      <SectionTitle>Physiotherapist review</SectionTitle>
      <Card className="flex gap-3">
        <Stethoscope className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No limitations or soreness registered. Add anything sensitive in your profile and
              every future session is screened automatically.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Currently protecting{" "}
                <span className="font-medium text-foreground">{blocked.join(", ")}</span>. Exercises
                loading these areas are replaced with safer variants:
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {swaps.map((s) => (
                  <li key={s.from} className="text-muted-foreground">
                    <span className="line-through">{s.from}</span>{" "}
                    <span className="text-primary">→ {s.to}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Card>

      <SectionTitle>What the data says</SectionTitle>
      <Card className="flex gap-3">
        <TrendingUp className="mt-0.5 size-5 shrink-0 text-primary" />
        <ul className="min-w-0 space-y-2 text-sm text-muted-foreground">
          <li>
            {stats.totalSessions} sessions logged · {stats.totalMinutes} minutes total.
          </li>
          <li>
            Perceived difficulty averages {stats.avgDifficulty.toFixed(1)}/5 —{" "}
            {stats.avgDifficulty > 3.6
              ? "sessions are trending hard, so intensity is being pulled back."
              : stats.avgDifficulty < 2.4
                ? "sessions feel easy, so intensity will step up."
                : "well calibrated."}
          </li>
          <li>
            {stats.weekSessions} of your {state.profile.weeklyTarget} weekly sessions completed.
          </li>
          {readiness.reasons.map((r) => (
            <li key={r}>{r}.</li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
