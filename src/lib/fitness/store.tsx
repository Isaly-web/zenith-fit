import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { HEALTH_CONSENT_VERSION } from "@/lib/app-config";
import type {
  FitnessState,
  Feedback,
  Goal,
  LimitationId,
  Profile,
  Workout,
  WorkoutTypeId,
} from "./types";

/**
 * Supabase-backed persistence, scoped to the signed-in user (see
 * supabase/migrations for the `zenith_fit` schema + RLS). Every route reads
 * this same FitnessState shape as before — only the storage backend changed.
 */

type ProfileRow = Database["zenith_fit"]["Tables"]["profiles"]["Row"];
type WorkoutRow = Database["zenith_fit"]["Tables"]["workouts"]["Row"];
type GoalRow = Database["zenith_fit"]["Tables"]["goals"]["Row"];

const initialState: FitnessState = {
  profile: {
    name: "",
    limitations: [],
    limitationNotes: "",
    preferredTypes: ["yoga", "walking", "strength"],
    weeklyTarget: 4,
  },
  workouts: [],
  goals: [],
};

function rowToProfile(row: ProfileRow): Profile {
  return {
    name: row.name,
    limitations: row.limitations as LimitationId[],
    limitationNotes: row.limitation_notes,
    preferredTypes: row.preferred_types as WorkoutTypeId[],
    weeklyTarget: row.weekly_target,
  };
}

function rowToWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    createdAt: row.created_at,
    scheduledFor: row.scheduled_for,
    timeOfDay: row.time_of_day as Workout["timeOfDay"],
    type: row.type as WorkoutTypeId,
    ...(row.types ? { types: row.types as WorkoutTypeId[] } : {}),
    duration: row.duration as Workout["duration"],
    intensity: row.intensity as Workout["intensity"],
    title: row.title,
    coachNote: row.coach_note,
    ...(row.physio_note ? { physioNote: row.physio_note } : {}),
    blocks: row.blocks as unknown as Workout["blocks"],
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
    ...(row.feedback ? { feedback: row.feedback as unknown as Feedback } : {}),
  };
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    metric: row.metric as Goal["metric"],
    target: row.target,
    period: row.period as Goal["period"],
    createdAt: row.created_at,
  };
}

/** Health data (limitations, soreness, physio notes) is hidden and never written without consent. */
function withoutHealthData(w: Workout): Workout {
  const { physioNote: _physioNote, ...rest } = w;
  return {
    ...rest,
    ...(w.feedback ? { feedback: { ...w.feedback, soreness: ["none"] } } : {}),
  };
}

function workoutToRow(
  w: Workout,
  userId: string,
  healthConsent: boolean,
): Database["zenith_fit"]["Tables"]["workouts"]["Insert"] {
  if (!healthConsent) w = withoutHealthData(w);
  return {
    id: w.id,
    user_id: userId,
    created_at: w.createdAt,
    scheduled_for: w.scheduledFor,
    time_of_day: w.timeOfDay,
    type: w.type,
    types: w.types ?? null,
    duration: w.duration,
    intensity: w.intensity,
    title: w.title,
    coach_note: w.coachNote,
    physio_note: w.physioNote ?? null,
    blocks: w.blocks as unknown as Json,
    completed_at: w.completedAt ?? null,
    feedback: (w.feedback ?? null) as unknown as Json | null,
  };
}

function goalToRow(g: Goal, userId: string): Database["zenith_fit"]["Tables"]["goals"]["Insert"] {
  return {
    id: g.id,
    user_id: userId,
    title: g.title,
    metric: g.metric,
    target: g.target,
    period: g.period,
    created_at: g.createdAt,
  };
}

function profileToRow(
  p: Profile,
  userId: string,
  healthConsent: boolean,
): Database["zenith_fit"]["Tables"]["profiles"]["Insert"] {
  return {
    id: userId,
    name: p.name,
    // Without consent the limitation columns are left out of the upsert, so health data that was
    // saved before consent existed is neither used nor overwritten (withdrawing erases it).
    ...(healthConsent ? { limitations: p.limitations, limitation_notes: p.limitationNotes } : {}),
    preferred_types: p.preferredTypes,
    weekly_target: p.weeklyTarget,
  };
}

function reportError(action: string, error: unknown) {
  console.error(`[fitness/store] ${action} failed`, error);
  toast.error(`Couldn't sync — ${action}. Check your connection.`);
}

interface Ctx {
  state: FitnessState;
  hydrated: boolean;
  /** True while the user has an active consent to health data (limitations, soreness, physio notes). */
  healthConsent: boolean;
  grantHealthConsent: () => Promise<boolean>;
  withdrawHealthConsent: () => Promise<boolean>;
  saveWorkout: (w: Workout) => void;
  completeWorkout: (id: string, feedback: Feedback) => void;
  deleteWorkout: (id: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  addGoal: (g: Omit<Goal, "id" | "createdAt">) => void;
  removeGoal: (id: string) => void;
}

const FitnessContext = createContext<Ctx | null>(null);

export function FitnessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FitnessState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const userIdRef = useRef<string | null>(null);
  const [healthConsent, setHealthConsent] = useState(false);
  const consentRef = useRef(false);

  const loadAll = useCallback(async (userId: string) => {
    const [consentResult, profileResult, workoutsResult, goalsResult] = await Promise.all([
      supabase
        .from("consent_events")
        .select("action")
        .eq("purpose", "health_data")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
    ]);

    if (consentResult.error) reportError("loading your consent", consentResult.error);
    const consent = consentResult.data?.action === "granted";
    consentRef.current = consent;
    setHealthConsent(consent);

    let profile = initialState.profile;
    if (profileResult.data) {
      profile = rowToProfile(profileResult.data);
      if (!consent) profile = { ...profile, limitations: [], limitationNotes: "" };
    } else {
      const { data: inserted, error } = await supabase
        .from("profiles")
        .insert(profileToRow(initialState.profile, userId, consent))
        .select()
        .maybeSingle();
      if (error) reportError("creating your profile", error);
      if (inserted) profile = rowToProfile(inserted);
    }

    if (workoutsResult.error) reportError("loading workouts", workoutsResult.error);
    if (goalsResult.error) reportError("loading goals", goalsResult.error);

    setState({
      profile,
      workouts: (workoutsResult.data ?? [])
        .map(rowToWorkout)
        .map((w) => (consent ? w : withoutHealthData(w))),
      goals: (goalsResult.data ?? []).map(rowToGoal),
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const userId = data.session?.user.id ?? null;
      userIdRef.current = userId;
      if (userId) void loadAll(userId);
      else {
        setState(initialState);
        consentRef.current = false;
        setHealthConsent(false);
        setHydrated(true);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (userId === userIdRef.current) return;
      userIdRef.current = userId;
      if (userId) {
        setHydrated(false);
        void loadAll(userId);
      } else {
        setState(initialState);
        consentRef.current = false;
        setHealthConsent(false);
        setHydrated(true);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadAll]);

  const saveWorkout = useCallback((w: Workout) => {
    setState((s) => ({ ...s, workouts: [w, ...s.workouts.filter((x) => x.id !== w.id)] }));
    const userId = userIdRef.current;
    if (!userId) return;
    void supabase
      .from("workouts")
      .insert(workoutToRow(w, userId, consentRef.current))
      .then(({ error }) => {
        if (error) reportError("saving your session", error);
      });
  }, []);

  const completeWorkout = useCallback((id: string, rawFeedback: Feedback) => {
    const feedback: Feedback = consentRef.current
      ? rawFeedback
      : { ...rawFeedback, soreness: ["none"] };
    const completedAt = new Date().toISOString();
    setState((s) => ({
      ...s,
      workouts: s.workouts.map((w) => (w.id === id ? { ...w, completedAt, feedback } : w)),
    }));
    void supabase
      .from("workouts")
      .update({
        completed_at: completedAt,
        feedback: feedback as unknown as WorkoutRow["feedback"],
      })
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportError("logging your feedback", error);
      });
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));
    void supabase
      .from("workouts")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportError("deleting the session", error);
      });
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    const { limitations: _l, limitationNotes: _n, ...nonHealth } = patch;
    const p = consentRef.current ? patch : nonHealth;
    const next = { ...stateRef.current.profile, ...p };
    setState((s) => ({ ...s, profile: next }));
    const userId = userIdRef.current;
    if (!userId) return;
    void supabase
      .from("profiles")
      .upsert(profileToRow(next, userId, consentRef.current))
      .then(({ error }) => {
        if (error) reportError("saving your profile", error);
      });
  }, []);

  const addGoal = useCallback((g: Omit<Goal, "id" | "createdAt">) => {
    const goal: Goal = { ...g, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, goals: [...s.goals, goal] }));
    const userId = userIdRef.current;
    if (!userId) return;
    void supabase
      .from("goals")
      .insert(goalToRow(goal, userId))
      .then(({ error }) => {
        if (error) reportError("saving your goal", error);
      });
  }, []);

  const removeGoal = useCallback((id: string) => {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
    void supabase
      .from("goals")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) reportError("removing the goal", error);
      });
  }, []);

  const grantHealthConsent = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return false;
    const { error } = await supabase.rpc("grant_health_consent", {
      p_version: HEALTH_CONSENT_VERSION,
    });
    if (error) {
      reportError("saving your consent", error);
      return false;
    }
    await loadAll(userId);
    return true;
  }, [loadAll]);

  const withdrawHealthConsent = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return false;
    const { error } = await supabase.rpc("withdraw_health_consent", {
      p_version: HEALTH_CONSENT_VERSION,
    });
    if (error) {
      reportError("withdrawing your consent", error);
      return false;
    }
    await loadAll(userId);
    return true;
  }, [loadAll]);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      healthConsent,
      grantHealthConsent,
      withdrawHealthConsent,
      saveWorkout,
      completeWorkout,
      deleteWorkout,
      updateProfile,
      addGoal,
      removeGoal,
    }),
    [
      state,
      hydrated,
      healthConsent,
      grantHealthConsent,
      withdrawHealthConsent,
      saveWorkout,
      completeWorkout,
      deleteWorkout,
      updateProfile,
      addGoal,
      removeGoal,
    ],
  );

  return createElement(FitnessContext.Provider, { value }, children);
}

export function useFitness() {
  const ctx = useContext(FitnessContext);
  if (!ctx) throw new Error("useFitness must be used inside FitnessProvider");
  return ctx;
}
