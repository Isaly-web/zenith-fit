import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFitness } from "@/lib/fitness/store";
import { SUPPORT_MAILTO } from "@/lib/app-config";

/**
 * Explicit consent for health data (GDPR art. 9(2)(a)): body-area limitations, notes about them,
 * soreness ratings and the physio notes derived from them. A separate, unticked box; not part of
 * the terms. Consent can be withdrawn at any time (see HealthConsentSettings), which erases the data.
 */
export function HealthConsentGate({ children }: { children: ReactNode }) {
  const { healthConsent, grantHealthConsent, hydrated } = useFitness();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!hydrated) return null;
  if (healthConsent) return <>{children}</>;

  const give = async () => {
    setBusy(true);
    const ok = await grantHealthConsent();
    setBusy(false);
    if (ok) toast.success("Consent saved — you can withdraw it any time in your profile");
  };

  return (
    <Card>
      <h3 className="text-sm font-semibold">Consent to health data</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        To adapt sessions to your body, the AI physiotherapist needs the body areas you want to
        protect, your own notes about them and your soreness ratings after sessions. This is health
        data, which is sensitive personal data. We only use it to build and adapt your training
        plan, and we only handle it if you say yes.
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
        <li>Without consent the app still works, but sessions are not adapted to limitations.</li>
        <li>You can withdraw your consent any time in your profile.</li>
        <li>When you withdraw, this health data is erased from your account.</li>
      </ul>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
          className="mt-0.5"
          aria-label="I consent to Nordvital processing my health data"
        />
        <span>
          I consent to Nordvital processing my health data (limitations, notes and soreness) as
          described above and in the{" "}
          <Link to="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </span>
      </label>
      <button
        type="button"
        disabled={!checked || busy}
        onClick={give}
        className="mt-4 w-full rounded-3xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Saving…" : "Give consent"}
      </button>
    </Card>
  );
}

/** Shows the consent status in the profile and lets the user withdraw it (erasing the data). */
export function HealthConsentSettings() {
  const { healthConsent, withdrawHealthConsent, hydrated } = useFitness();
  const [busy, setBusy] = useState(false);

  if (!hydrated || !healthConsent) return null;

  const withdraw = async () => {
    setBusy(true);
    const ok = await withdrawHealthConsent();
    setBusy(false);
    if (ok) toast.success("Consent withdrawn — your health data has been erased");
  };

  return (
    <Card className="mt-6">
      <h3 className="text-sm font-semibold">Health data consent</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        You have consented to us processing your limitations, notes and soreness ratings. Questions?{" "}
        <a href={SUPPORT_MAILTO} className="underline">
          Contact support
        </a>
        .
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className="mt-4 w-full rounded-3xl border border-border bg-card px-6 py-3 text-sm font-medium text-destructive disabled:opacity-50"
          >
            Withdraw consent
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw consent?</AlertDialogTitle>
            <AlertDialogDescription>
              Your limitations, notes, soreness ratings and physio notes will be erased from your
              account. Sessions will no longer be adapted to them. Your workouts, goals and the rest
              of your profile are kept. You can give consent again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={withdraw}>Withdraw and erase</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
