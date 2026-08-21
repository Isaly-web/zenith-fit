import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { AppShell, Card, Pill, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { goalProgress } from "@/lib/fitness/engine";
import type { Goal } from "@/lib/fitness/types";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals — Nordvital" },
      {
        name: "description",
        content: "Set session, minute and streak targets and track progress live.",
      },
      { property: "og:title", content: "Goals — Nordvital" },
      { property: "og:description", content: "Set session, minute and streak targets." },
    ],
  }),
  component: GoalsPage,
});

const METRICS: { id: Goal["metric"]; label: string }[] = [
  { id: "sessions", label: "Sessions" },
  { id: "minutes", label: "Minutes" },
  { id: "streak", label: "Streak days" },
];

function GoalsPage() {
  const { state, addGoal, removeGoal } = useFitness();
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<Goal["metric"]>("sessions");
  const [target, setTarget] = useState(4);
  const [period, setPeriod] = useState<Goal["period"]>("week");

  const submit = () => {
    if (!title.trim()) return;
    addGoal({ title: title.trim(), metric, target, period });
    setTitle("");
  };

  return (
    <AppShell title="Goals" subtitle="Small, repeatable targets beat big ones">
      {state.goals.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No goals yet — add one below.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {state.goals.map((g) => {
            const { current, pct } = goalProgress(state, g);
            return (
              <Card key={g.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{g.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {current} / {g.target} {g.metric} per {g.period}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove goal"
                    onClick={() => removeGoal(g.id)}
                    className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SectionTitle>New goal</SectionTitle>
      <Card className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Move every weekday"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <Pill key={m.id} active={metric === m.id} onClick={() => setMetric(m.id)}>
              {m.label}
            </Pill>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <Pill active={period === "week"} onClick={() => setPeriod("week")}>
              per week
            </Pill>
            <Pill active={period === "month"} onClick={() => setPeriod("month")}>
              per month
            </Pill>
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-3xl bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground"
        >
          Add goal
        </button>
      </Card>
    </AppShell>
  );
}
