import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { typeMeta } from "@/lib/fitness/catalog";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Workout history — Nordvital" },
      {
        name: "description",
        content: "Every completed session with your difficulty, energy and soreness ratings.",
      },
      { property: "og:title", content: "Workout history — Nordvital" },
      { property: "og:description", content: "Every completed session with your ratings." },
    ],
  }),
  component: HistoryPage,
});

export function HistoryPage() {
  const { state, deleteWorkout } = useFitness();
  const items = [...state.workouts].sort((a, b) =>
    (b.completedAt ?? b.createdAt) < (a.completedAt ?? a.createdAt) ? -1 : 1,
  );

  return (
    <AppShell
      title="History"
      subtitle={`${items.filter((w) => w.completedAt).length} completed sessions`}
    >
      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
          <Link to="/new" className="mt-3 inline-block text-sm font-medium text-primary">
            Generate your first workout →
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((w) => (
            <Card key={w.id} className="flex items-start gap-3">
              <Link to="/session/$id" params={{ id: w.id }} className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {typeMeta(w.type).emoji} {w.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(w.completedAt ?? w.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {w.duration} min · {w.completedAt ? "completed" : "not finished"}
                </p>
                {w.feedback && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Tag>difficulty {w.feedback.difficulty}/5</Tag>
                    <Tag>energy {w.feedback.energy}/5</Tag>
                    <Tag>{w.feedback.mood}</Tag>
                    {w.feedback.soreness[0] !== "none" && (
                      <Tag>sore: {w.feedback.soreness.join(", ")}</Tag>
                    )}
                  </div>
                )}
              </Link>
              <button
                type="button"
                aria-label="Delete session"
                onClick={() => deleteWorkout(w.id)}
                className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">
      {children}
    </span>
  );
}
