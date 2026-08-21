import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell, Card, Pill, SectionTitle } from "@/components/AppShell";
import { DURATIONS, FAMILIES, TIMES_OF_DAY, WORKOUT_TYPES } from "@/lib/fitness/catalog";
import { generateWorkout } from "@/lib/fitness/engine";
import { useFitness } from "@/lib/fitness/store";
import type { Duration, TimeOfDay, WorkoutTypeId } from "@/lib/fitness/types";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({
    meta: [
      { title: "New session — Nordvital" },
      {
        name: "description",
        content:
          "Pick time of day, available time and one or more categories; the coach builds the rest.",
      },
      { property: "og:title", content: "New session — Nordvital" },
      {
        property: "og:description",
        content: "Pick time of day, available time and categories; the coach builds the rest.",
      },
    ],
  }),
  component: NewWorkout,
});

function defaultTime(): TimeOfDay {
  const h = new Date().getHours();
  if (h < 11) return "morning";
  if (h < 14) return "lunch";
  if (h < 18) return "afternoon";
  return "evening";
}

function NewWorkout() {
  const { state, saveWorkout } = useFitness();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [time, setTime] = useState<TimeOfDay>(defaultTime());
  const [duration, setDuration] = useState<Duration>(20);
  const [types, setTypes] = useState<WorkoutTypeId[]>(state.profile.preferredTypes.slice(0, 1));

  const toggle = (id: WorkoutTypeId) =>
    setTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const create = () => {
    const [primary, ...rest] = types;
    if (!primary) return;
    const workout = generateWorkout(state, {
      type: primary,
      types: rest,
      duration,
      timeOfDay: time,
    });
    saveWorkout(workout);
    void navigate({ to: "/session/$id", params: { id: workout.id } });
  };

  return (
    <AppShell
      title="New session"
      subtitle={`Step ${step} of 3`}
      action={
        step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        ) : null
      }
    >
      <div className="flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <>
          <SectionTitle>Time of day</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {TIMES_OF_DAY.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTime(t.id);
                  setStep(2);
                }}
                className={`card-soft px-4 py-4 text-left transition-all ${
                  time === t.id ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <SectionTitle>Available time</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Pill
                key={d}
                active={duration === d}
                onClick={() => {
                  setDuration(d);
                  setStep(3);
                }}
              >
                {d} min
              </Pill>
            ))}
          </div>
          <Card className="mt-6 bg-secondary/70">
            <p className="text-sm text-muted-foreground">
              Warm-up, main work and cool-down are scaled to the exact time you have.
            </p>
          </Card>
        </>
      )}

      {step === 3 && (
        <>
          {FAMILIES.map((family) => (
            <div key={family.id}>
              <SectionTitle>{family.label}</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {WORKOUT_TYPES.filter((t) => t.family === family.id).map((t) => {
                  const active = types.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      className={`card-soft flex items-center gap-3 px-4 py-3 text-left transition-all ${
                        active ? "border-primary ring-1 ring-primary" : ""
                      }`}
                    >
                      <span aria-hidden className="text-lg">
                        {t.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{t.label}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {t.blurb}
                        </span>
                      </span>
                      {active ? <Check className="size-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Card className="mt-6 bg-secondary/70">
            <p className="text-sm text-muted-foreground">
              Pick one or more categories — the session blends them and adapts to your readiness,
              recent difficulty ratings, soreness and any limitations in your profile.
            </p>
          </Card>

          <button
            type="button"
            onClick={create}
            disabled={types.length === 0}
            className="mt-5 w-full rounded-3xl bg-primary px-6 py-4 text-base font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {types.length === 0
              ? "Select at least one category"
              : `Generate ${duration} min session`}
          </button>
        </>
      )}
    </AppShell>
  );
}
