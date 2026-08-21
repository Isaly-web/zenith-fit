import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { AppShell, Card, Pill, SectionTitle } from "@/components/AppShell";
import { useFitness } from "@/lib/fitness/store";
import { LIMITATIONS, WORKOUT_TYPES } from "@/lib/fitness/catalog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Nordvital" },
      {
        name: "description",
        content: "Tell the coach about your limitations, preferred workouts and weekly frequency.",
      },
      { property: "og:title", content: "Your profile — Nordvital" },
      {
        property: "og:description",
        content: "Limitations, preferred workouts and weekly frequency.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { state, updateProfile } = useFitness();
  const navigate = useNavigate();
  const p = state.profile;

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/login" });
  };

  return (
    <AppShell title="You" subtitle="Everything here shapes the sessions you get">
      <Card>
        <label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Name</label>
        <input
          value={p.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="Your name"
          className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
        />
      </Card>

      <SectionTitle>Physical limitations</SectionTitle>
      <Card>
        <p className="mb-3 text-sm text-muted-foreground">
          The AI physiotherapist avoids exercises that load these areas and substitutes safe
          alternatives instead.
        </p>
        <div className="flex flex-wrap gap-2">
          {LIMITATIONS.map((l) => (
            <Pill
              key={l.id}
              active={p.limitations.includes(l.id)}
              onClick={() =>
                updateProfile({
                  limitations: p.limitations.includes(l.id)
                    ? p.limitations.filter((x) => x !== l.id)
                    : [...p.limitations, l.id],
                })
              }
            >
              {l.label}
            </Pill>
          ))}
        </div>
        <textarea
          value={p.limitationNotes}
          onChange={(e) => updateProfile({ limitationNotes: e.target.value })}
          rows={3}
          placeholder="Notes — e.g. left knee meniscus, no deep flexion"
          className="mt-3 w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-primary"
        />
      </Card>

      <SectionTitle>Preferred workout types</SectionTitle>
      <Card>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_TYPES.map((t) => (
            <Pill
              key={t.id}
              active={p.preferredTypes.includes(t.id)}
              onClick={() =>
                updateProfile({
                  preferredTypes: p.preferredTypes.includes(t.id)
                    ? p.preferredTypes.filter((x) => x !== t.id)
                    : [...p.preferredTypes, t.id],
                })
              }
            >
              {t.emoji} {t.label}
            </Pill>
          ))}
        </div>
      </Card>

      <SectionTitle>Weekly frequency</SectionTitle>
      <Card>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Pill
              key={n}
              active={p.weeklyTarget === n}
              onClick={() => updateProfile({ weeklyTarget: n })}
            >
              {n}×
            </Pill>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Rest days are spread evenly across the week around this number.
        </p>
      </Card>

      <button
        type="button"
        onClick={() => toast.success("Preferences saved")}
        className="mt-6 w-full rounded-3xl bg-primary px-6 py-4 text-base font-medium text-primary-foreground"
      >
        Done
      </button>

      <button
        type="button"
        onClick={signOut}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl border border-border bg-card px-6 py-4 text-sm font-medium text-muted-foreground"
      >
        <LogOut className="size-4" />
        Sign out
      </button>
    </AppShell>
  );
}
