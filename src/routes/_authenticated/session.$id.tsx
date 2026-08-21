import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Sparkles } from "lucide-react";
import { AppShell, Card, Pill, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { LIMITATIONS, typeMeta } from "@/lib/fitness/catalog";
import type { Feedback, LimitationId } from "@/lib/fitness/types";

export const Route = createFileRoute("/_authenticated/session/$id")({
  head: () => ({
    meta: [
      { title: "Session — Nordvital" },
      {
        name: "description",
        content: "Your generated session, block by block, with physio-safe swaps.",
      },
      { property: "og:title", content: "Session — Nordvital" },
      { property: "og:description", content: "Your generated session, block by block." },
    ],
  }),
  component: SessionPage,
});

const MOODS: Feedback["mood"][] = ["great", "good", "okay", "low", "tired"];

function SessionPage() {
  const { id } = Route.useParams();
  const { state, completeWorkout } = useFitness();
  const navigate = useNavigate();
  const workout = state.workouts.find((w) => w.id === id);

  const [phase, setPhase] = useState<"session" | "feedback">("session");
  const [difficulty, setDifficulty] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [soreness, setSoreness] = useState<LimitationId[]>([]);
  const [mood, setMood] = useState<Feedback["mood"]>("good");
  const [note, setNote] = useState("");

  if (!workout) {
    return (
      <AppShell title="Session not found">
        <Card>
          <p className="text-sm text-muted-foreground">This session no longer exists.</p>
          <Link to="/new" className="mt-4 inline-block text-sm font-medium text-primary">
            Generate a new one →
          </Link>
        </Card>
      </AppShell>
    );
  }

  const save = () => {
    completeWorkout(workout.id, {
      difficulty,
      energy,
      soreness: soreness.length ? soreness : ["none"],
      mood,
      note,
    });
    toast.success("Logged — your next session just adapted");
    void navigate({ to: "/" });
  };

  if (phase === "feedback") {
    return (
      <AppShell title="How did that feel?" subtitle="Four answers shape every future session">
        <SectionTitle>How difficult was today's workout?</SectionTitle>
        <Scale value={difficulty} onChange={setDifficulty} low="Very easy" high="Very hard" />

        <SectionTitle>How is your energy level?</SectionTitle>
        <Scale value={energy} onChange={setEnergy} low="Drained" high="Energised" />

        <SectionTitle>Do you have soreness?</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Pill active={soreness.length === 0} onClick={() => setSoreness([])}>
            None
          </Pill>
          {LIMITATIONS.map((l) => (
            <Pill
              key={l.id}
              active={soreness.includes(l.id)}
              onClick={() =>
                setSoreness((s) => (s.includes(l.id) ? s.filter((x) => x !== l.id) : [...s, l.id]))
              }
            >
              {l.label}
            </Pill>
          ))}
        </div>

        <SectionTitle>How do you feel today?</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Pill key={m} active={mood === m} onClick={() => setMood(m)}>
              {m}
            </Pill>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything the coach should know? (optional)"
          className="mt-3 w-full rounded-2xl border border-border bg-card p-4 text-sm outline-none focus:border-primary"
          rows={3}
        />

        <button
          type="button"
          onClick={save}
          className="mt-5 w-full rounded-3xl bg-primary px-6 py-4 text-base font-medium text-primary-foreground"
        >
          Save & adapt
        </button>
      </AppShell>
    );
  }

  const meta = typeMeta(workout.type);

  return (
    <AppShell
      title={workout.title}
      subtitle={`${meta.emoji} ${meta.label} · ${workout.duration} min · ${workout.timeOfDay}`}
    >
      <Card className="flex gap-3 bg-secondary/60">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">{workout.coachNote}</p>
      </Card>

      {workout.physioNote && (
        <Card className="mt-3 flex gap-3 bg-sand/60">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">{workout.physioNote}</p>
        </Card>
      )}

      <SectionTitle>Session</SectionTitle>
      <div className="space-y-3">
        {workout.blocks.map((b, i) => (
          <Card key={`${b.exerciseId}-${i}`} className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-sm font-medium">
              {b.minutes}′
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {b.phase}
              </p>
              <p className="font-medium">{b.name}</p>
              <p className="text-sm text-muted-foreground">{b.cue}</p>
              {b.swappedFor && (
                <p className="mt-1 text-xs text-primary">Physio swap for {b.swappedFor}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {workout.completedAt ? (
        <Card className="mt-5 text-center text-sm text-muted-foreground">
          Completed {new Date(workout.completedAt).toLocaleString()}
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setPhase("feedback")}
          className="mt-6 w-full rounded-3xl bg-primary px-6 py-4 text-base font-medium text-primary-foreground"
        >
          Finish workout
        </button>
      )}
    </AppShell>
  );
}

function Scale({
  value,
  onChange,
  low,
  high,
}: {
  value: number;
  onChange: (n: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-12 flex-1 rounded-2xl border text-sm transition-all ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
