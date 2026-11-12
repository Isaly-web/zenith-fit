import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORT_MAILTO } from "@/lib/app-config";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Nordvital" },
      {
        name: "description",
        content: "Sign in or create an account to get your adaptive daily workout.",
      },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup" | "forgot";

function translateAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("Invalid login credentials")) return "Wrong email or password.";
  if (message.includes("User already registered"))
    return "An account with that email already exists.";
  if (message.includes("Password should be at least"))
    return "Password must be at least 8 characters.";
  return message || "Something went wrong. Please try again.";
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ageOk, setAgeOk] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !ageOk) {
      toast.error("You must be at least 18 to create an account.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        void navigate({ to: "/" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/" },
        });
        if (error) throw error;
        toast.success("Account created! Check your inbox if verification is required.");
        void navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("If that account exists, we've sent a reset link.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";

  return (
    <div className="flex min-h-screen items-center justify-center surface-tint px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="size-6" />
          </div>
          <h1 className="font-display text-3xl text-foreground">Nordvital</h1>
          <p className="mt-1 text-sm text-muted-foreground">Adaptive workouts, built around you</p>
        </div>

        <div className="card-soft p-6">
          <h2 className="mb-4 font-display text-xl text-foreground">{title}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            )}
            {mode === "signup" && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  required
                  checked={ageOk}
                  onChange={(e) => setAgeOk(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>I am at least 18 years old</span>
              </label>
            )}
            <Button type="submit" disabled={busy} className="w-full rounded-3xl">
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary"
                >
                  Need an account? Sign up
                </button>
              </>
            )}
            {mode !== "signin" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-primary"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          This service is for people aged 18 or older.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          By continuing you agree this is a demo product built by{" "}
          <Link to="/" className="underline">
            Isaly
          </Link>
          .
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/terms" className="underline">
            Terms
          </Link>{" "}
          ·{" "}
          <Link to="/privacy" className="underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <a href={SUPPORT_MAILTO} className="underline">
            Support
          </a>
        </p>
      </div>
    </div>
  );
}
