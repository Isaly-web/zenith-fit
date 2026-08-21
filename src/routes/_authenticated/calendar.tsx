import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell, Card, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { dayKey } from "@/lib/fitness/engine";
import { typeMeta } from "@/lib/fitness/catalog";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Nordvital" },
      { name: "description", content: "Every training day at a glance, month by month." },
      { property: "og:title", content: "Calendar — Nordvital" },
      { property: "og:description", content: "Every training day at a glance." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { state } = useFitness();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = new Map<string, typeof state.workouts>();
  state.workouts
    .filter((w) => w.completedAt)
    .forEach((w) => {
      const k = dayKey(w.completedAt!);
      byDay.set(k, [...(byDay.get(k) ?? []), w]);
    });

  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const selectedWorkouts = byDay.get(selected) ?? [];

  return (
    <AppShell title="Calendar" subtitle="Your training rhythm over time">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="grid size-9 place-items-center rounded-full bg-secondary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-xl">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="grid size-9 place-items-center rounded-full bg-secondary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <span key={`e-${i}`} />;
            const key = dayKey(d);
            const has = byDay.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`aspect-square rounded-2xl text-sm transition-colors ${
                  selected === key ? "ring-1 ring-primary" : ""
                } ${has ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground"}`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </Card>

      <SectionTitle>
        {new Date(selected).toLocaleDateString(undefined, { day: "numeric", month: "long" })}
      </SectionTitle>
      {selectedWorkouts.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No sessions logged on this day.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {selectedWorkouts.map((w) => (
            <Link key={w.id} to="/session/$id" params={{ id: w.id }}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {typeMeta(w.type).emoji} {w.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {w.duration} min · difficulty {w.feedback?.difficulty ?? "–"}/5
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
