import { EXERCISES, exerciseById, typeMeta } from "./catalog";
import type {
  Duration,
  Exercise,
  FitnessState,
  Intensity,
  LimitationId,
  Profile,
  TimeOfDay,
  Workout,
  WorkoutBlock,
  WorkoutTypeId,
} from "./types";

const INTENSITY_ORDER: Intensity[] = ["restorative", "easy", "moderate", "hard"];
const rank = (i: Intensity) => INTENSITY_ORDER.indexOf(i);

const uid = () => Math.random().toString(36).slice(2, 10);

export const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Readiness — the adaptive signal driving every generated session      */
/* ------------------------------------------------------------------ */

export interface Readiness {
  /** 0–100 */
  score: number;
  restDays: number;
  sessions7d: number;
  avgDifficulty: number;
  soreAreas: LimitationId[];
  label: string;
  reasons: string[];
}

export function computeReadiness(state: FitnessState, now = new Date()): Readiness {
  const done = state.workouts
    .filter((w) => w.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1));

  const last = done[0];
  const restDays = last
    ? Math.floor((now.getTime() - new Date(last.completedAt!).getTime()) / 86_400_000)
    : 99;

  const weekAgo = now.getTime() - 7 * 86_400_000;
  const recent = done.filter((w) => new Date(w.completedAt!).getTime() >= weekAgo);
  const sessions7d = recent.length;

  const rated = done.slice(0, 4).filter((w) => w.feedback);
  const avgDifficulty = rated.length
    ? rated.reduce((s, w) => s + w.feedback!.difficulty, 0) / rated.length
    : 3;
  const avgEnergy = rated.length
    ? rated.reduce((s, w) => s + w.feedback!.energy, 0) / rated.length
    : 3;

  const soreAreas = Array.from(
    new Set(
      done
        .slice(0, 2)
        .flatMap((w) => (w.feedback?.soreness ?? []) as string[])
        .filter((s): s is LimitationId => s !== "none"),
    ),
  );

  const reasons: string[] = [];
  let score = 65;

  if (restDays >= 2) {
    score += 15;
    reasons.push(
      restDays >= 99
        ? "First session — starting fresh"
        : `${restDays} rest day${restDays === 1 ? "" : "s"} banked`,
    );
  } else if (restDays === 0) {
    score -= 15;
    reasons.push("You already trained today");
  }
  if (sessions7d >= 5) {
    score -= 12;
    reasons.push(`${sessions7d} sessions this week — high volume`);
  } else if (sessions7d <= 1) {
    score += 5;
  }
  if (avgDifficulty >= 4) {
    score -= 12;
    reasons.push("Recent sessions felt hard");
  } else if (avgDifficulty <= 2 && rated.length) {
    score += 10;
    reasons.push("Recent sessions felt easy");
  }
  if (avgEnergy >= 4) {
    score += 8;
    reasons.push("Energy has been high");
  } else if (avgEnergy <= 2 && rated.length) {
    score -= 10;
    reasons.push("Energy has been low");
  }
  if (soreAreas.length) {
    score -= 8;
    reasons.push(`Soreness reported: ${soreAreas.join(", ")}`);
  }

  score = Math.max(10, Math.min(100, Math.round(score)));
  const label = score >= 80 ? "Primed" : score >= 60 ? "Ready" : score >= 40 ? "Steady" : "Recover";
  return { score, restDays, sessions7d, avgDifficulty, soreAreas, label, reasons };
}

/* ------------------------------------------------------------------ */
/* AI physiotherapist — safe exercise selection                        */
/* ------------------------------------------------------------------ */

export interface PhysioResult {
  exercise: Exercise;
  swappedFor?: string;
}

/** Blocked areas = declared limitations + areas sore in the last two sessions. */
export function guardedAreas(profile: Profile, readiness: Readiness): LimitationId[] {
  return Array.from(new Set([...profile.limitations, ...readiness.soreAreas]));
}

function safeAlternative(ex: Exercise, blocked: LimitationId[]): PhysioResult | null {
  const regression = EXERCISES.find(
    (c) => c.regressionOf === ex.id && !c.loads.some((l) => blocked.includes(l)),
  );
  if (regression) return { exercise: regression, swappedFor: ex.name };
  const sibling = EXERCISES.find(
    (c) =>
      c.id !== ex.id &&
      c.types.some((t) => ex.types.includes(t)) &&
      !c.loads.some((l) => blocked.includes(l)) &&
      rank(c.intensity) <= rank(ex.intensity),
  );
  return sibling ? { exercise: sibling, swappedFor: ex.name } : null;
}

export function physioScreen(ex: Exercise, blocked: LimitationId[]): PhysioResult | null {
  if (!ex.loads.some((l) => blocked.includes(l))) return { exercise: ex };
  return safeAlternative(ex, blocked);
}

/* ------------------------------------------------------------------ */
/* Session generation                                                  */
/* ------------------------------------------------------------------ */

function targetIntensity(readiness: Readiness, timeOfDay: TimeOfDay): Intensity {
  let idx = readiness.score >= 80 ? 3 : readiness.score >= 60 ? 2 : readiness.score >= 40 ? 1 : 0;
  if (timeOfDay === "evening") idx = Math.min(idx, 2);
  if (timeOfDay === "morning" && idx > 0) idx = Math.min(idx, 2);
  return INTENSITY_ORDER[Math.max(0, idx)]!;
}

function splitMinutes(duration: Duration) {
  if (duration <= 10)
    return {
      warmup: Math.max(1, Math.round(duration * 0.2)),
      cooldown: Math.max(1, Math.round(duration * 0.2)),
    };
  return { warmup: Math.round(duration * 0.18), cooldown: Math.round(duration * 0.17) };
}

export interface GenerateInput {
  type: WorkoutTypeId;
  /** Optional extra categories the user selected — exercises are blended across all of them. */
  types?: WorkoutTypeId[];
  duration: Duration;
  timeOfDay: TimeOfDay;
  date?: Date;
}

export function generateWorkout(state: FitnessState, input: GenerateInput): Workout {
  const readiness = computeReadiness(state);
  const blocked = guardedAreas(state.profile, readiness);
  const intensity = targetIntensity(readiness, input.timeOfDay);
  const meta = typeMeta(input.type);

  const selected = Array.from(new Set([input.type, ...(input.types ?? [])]));
  const pool = EXERCISES.filter(
    (e) => e.types.some((t) => selected.includes(t)) && !e.regressionOf,
  );
  const fallback = EXERCISES.filter((e) =>
    e.types.includes(meta.family === "mind" ? "breathing" : "stretching"),
  );
  const source = pool.length ? pool : fallback;

  const warmPool = source.filter((e) => rank(e.intensity) <= 1);
  const mainPool = source
    .filter((e) => rank(e.intensity) <= rank(intensity))
    .sort((a, b) => rank(b.intensity) - rank(a.intensity));
  const coolPool = [
    ...EXERCISES.filter(
      (e) =>
        rank(e.intensity) === 0 &&
        e.types.some((t) => ["stretching", "breathing", "meditation"].includes(t)),
    ),
  ];

  const { warmup, cooldown } = splitMinutes(input.duration);
  const mainMinutes = Math.max(1, input.duration - warmup - cooldown);

  const swaps: string[] = [];
  const usedIds = new Set<string>();
  const take = (
    list: Exercise[],
    count: number,
    minutes: number,
    phase: WorkoutBlock["phase"],
  ): WorkoutBlock[] => {
    const blocks: WorkoutBlock[] = [];
    const per = Math.max(1, Math.round(minutes / Math.max(1, count)));
    let used = 0;
    for (const ex of list) {
      if (blocks.length >= count) break;
      const screened = physioScreen(ex, blocked);
      if (!screened) continue;
      if (usedIds.has(screened.exercise.id)) continue;
      usedIds.add(screened.exercise.id);
      const mins = blocks.length === count - 1 ? Math.max(1, minutes - used) : per;
      used += mins;
      if (screened.swappedFor) swaps.push(`${screened.swappedFor} → ${screened.exercise.name}`);
      blocks.push({
        exerciseId: screened.exercise.id,
        name: screened.exercise.name,
        cue: screened.exercise.cue,
        minutes: mins,
        phase,
        ...(screened.swappedFor ? { swappedFor: screened.swappedFor } : {}),
      });
    }
    return blocks;
  };

  const mainCount =
    input.duration <= 10 ? 2 : input.duration <= 20 ? 3 : input.duration <= 45 ? 4 : 5;
  const blocks = [
    ...take(warmPool.length ? warmPool : source, 1, warmup, "warmup"),
    ...take(mainPool.length ? mainPool : source, mainCount, mainMinutes, "main"),
    ...take(coolPool, 1, cooldown, "cooldown"),
  ];

  const physioNote = swaps.length
    ? `Physio adjustments for ${blocked.join(", ")}: ${swaps.join(" · ")}.`
    : blocked.length
      ? `Screened against ${blocked.join(", ")} — everything selected is already low-load for you.`
      : undefined;

  const date = input.date ?? new Date();

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    scheduledFor: date.toISOString(),
    timeOfDay: input.timeOfDay,
    type: input.type,
    types: selected,
    duration: input.duration,
    intensity,
    title:
      selected.length > 1
        ? `${intensityLabel(intensity)} ${selected.map((t) => typeMeta(t).label).join(" + ")}`
        : `${intensityLabel(intensity)} ${meta.label}`,
    coachNote: coachNote(readiness, intensity, input),
    ...(physioNote ? { physioNote } : {}),
    blocks,
  };
}

export const intensityLabel = (i: Intensity) =>
  ({ restorative: "Restorative", easy: "Gentle", moderate: "Balanced", hard: "Challenging" })[i];

function coachNote(readiness: Readiness, intensity: Intensity, input: GenerateInput) {
  const time = {
    morning: "Morning sessions respond well to gradual ramps",
    lunch: "A mid-day reset — keep it crisp so you can get back to your day",
    afternoon: "Your strongest window of the day",
    evening: "Evening work stays sub-maximal so sleep isn't disturbed",
  }[input.timeOfDay];
  const load =
    intensity === "hard"
      ? "You're recovered, so today pushes the top end."
      : intensity === "moderate"
        ? "A solid working session at a sustainable effort."
        : intensity === "easy"
          ? "Kept light — building consistency beats chasing fatigue."
          : "Recovery is the goal today, not output.";
  return `${load} ${time}. Readiness ${readiness.score}/100 (${readiness.label}) from ${readiness.sessions7d} session${readiness.sessions7d === 1 ? "" : "s"} in the last 7 days over ${input.duration} minutes.`;
}

/* ------------------------------------------------------------------ */
/* Weekly plan                                                         */
/* ------------------------------------------------------------------ */

export interface PlannedDay {
  date: string;
  label: string;
  rest: boolean;
  type?: WorkoutTypeId;
  duration?: Duration;
  timeOfDay?: TimeOfDay;
}

export function weeklyPlan(state: FitnessState, from = new Date()): PlannedDay[] {
  const prefs = state.profile.preferredTypes.length
    ? state.profile.preferredTypes
    : (["walking", "yoga", "strength", "stretching"] as WorkoutTypeId[]);
  const target = Math.min(7, Math.max(1, state.profile.weeklyTarget));
  const start = new Date(from);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const trainingDays = new Set<number>();
  const spacing = 7 / target;
  for (let i = 0; i < target; i++) trainingDays.add(Math.round(i * spacing) % 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const rest = !trainingDays.has(i);
    const type = prefs[i % prefs.length]!;
    const hard = typeMeta(type).family === "strength" || typeMeta(type).family === "cardio";
    return {
      date: dayKey(d),
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      rest,
      ...(rest
        ? {}
        : { type, duration: (hard ? 30 : 20) as Duration, timeOfDay: "morning" as TimeOfDay }),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export function computeStats(state: FitnessState, now = new Date()) {
  const done = state.workouts.filter((w) => w.completedAt);
  const days = new Set(done.map((w) => dayKey(w.completedAt!)));

  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  let best = 0;
  let run = 0;
  const sorted = Array.from(days).sort();
  sorted.forEach((d, i) => {
    if (i > 0) {
      const prev = new Date(sorted[i - 1]!);
      prev.setDate(prev.getDate() + 1);
      run = dayKey(prev) === d ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run);
  });

  const weekAgo = now.getTime() - 7 * 86_400_000;
  const thisWeek = done.filter((w) => new Date(w.completedAt!).getTime() >= weekAgo);

  const byType = new Map<WorkoutTypeId, number>();
  done.forEach((w) => byType.set(w.type, (byType.get(w.type) ?? 0) + w.duration));

  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now.getTime() - i * 7 * 86_400_000;
    const startT = end - 7 * 86_400_000;
    const inWeek = done.filter((w) => {
      const t = new Date(w.completedAt!).getTime();
      return t > startT && t <= end;
    });
    return {
      week: i === 0 ? "This wk" : `-${i}w`,
      minutes: inWeek.reduce((s, w) => s + w.duration, 0),
      sessions: inWeek.length,
    };
  }).reverse();

  return {
    totalSessions: done.length,
    totalMinutes: done.reduce((s, w) => s + w.duration, 0),
    streak,
    bestStreak: best,
    weekSessions: thisWeek.length,
    weekMinutes: thisWeek.reduce((s, w) => s + w.duration, 0),
    byType: Array.from(byType, ([type, minutes]) => ({
      type,
      minutes,
      label: typeMeta(type).label,
    })).sort((a, b) => b.minutes - a.minutes),
    last8Weeks,
    avgDifficulty:
      done.filter((w) => w.feedback).reduce((s, w) => s + w.feedback!.difficulty, 0) /
      Math.max(1, done.filter((w) => w.feedback).length),
  };
}

export function goalProgress(
  state: FitnessState,
  goal: { metric: string; period: string; target: number },
) {
  const stats = computeStats(state);
  const now = Date.now();
  const windowMs = (goal.period === "week" ? 7 : 30) * 86_400_000;
  const done = state.workouts.filter(
    (w) => w.completedAt && now - new Date(w.completedAt).getTime() <= windowMs,
  );
  const current =
    goal.metric === "sessions"
      ? done.length
      : goal.metric === "minutes"
        ? done.reduce((s, w) => s + w.duration, 0)
        : stats.streak;
  return { current, pct: Math.min(100, Math.round((current / Math.max(1, goal.target)) * 100)) };
}

export { exerciseById };
