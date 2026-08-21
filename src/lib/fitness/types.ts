export type TimeOfDay = "morning" | "lunch" | "afternoon" | "evening";

export type WorkoutTypeId =
  // Mind & recovery
  | "meditation"
  | "breathing"
  | "stretching"
  | "mobility"
  | "yin-yoga"
  | "yoga"
  | "tai-chi"
  | "balance"
  // Cardio
  | "walking"
  | "power-walk"
  | "jogging"
  | "running"
  | "intervals"
  | "cycling"
  | "swimming"
  // Strength
  | "full-body"
  | "upper-body"
  | "lower-body"
  | "core"
  | "squats"
  | "push-ups"
  | "bands"
  | "dumbbells"
  | "kettlebell"
  | "pilates"
  | "strength"
  // Fitness
  | "hiit"
  | "circuit"
  | "cross-trainer"
  | "rowing";

export type Duration = 5 | 10 | 15 | 20 | 30 | 45 | 60 | 90;

/** Body areas the AI physiotherapist screens for. */
export type LimitationId = "knees" | "back" | "shoulders" | "neck" | "hips" | "wrists" | "ankles";

export type Intensity = "restorative" | "easy" | "moderate" | "hard";

export interface Exercise {
  id: string;
  name: string;
  /** Short cue shown while performing. */
  cue: string;
  types: WorkoutTypeId[];
  intensity: Intensity;
  /** Areas this exercise loads — used to filter against user limitations. */
  loads: LimitationId[];
  /** Safer swap when a loaded area is limited. */
  regressionOf?: string;
  /** Relative share of session time. */
  weight?: number;
}

export interface WorkoutBlock {
  exerciseId: string;
  name: string;
  cue: string;
  minutes: number;
  phase: "warmup" | "main" | "cooldown";
  swappedFor?: string;
}

export interface Workout {
  id: string;
  createdAt: string;
  scheduledFor: string;
  timeOfDay: TimeOfDay;
  type: WorkoutTypeId;
  /** All categories the user picked for this session. */
  types?: WorkoutTypeId[];
  duration: Duration;
  intensity: Intensity;
  title: string;
  coachNote: string;
  physioNote?: string;
  blocks: WorkoutBlock[];
  completedAt?: string;
  feedback?: Feedback;
}

export interface Feedback {
  /** 1 = very easy, 5 = very hard */
  difficulty: number;
  /** 1 = drained, 5 = energised */
  energy: number;
  soreness: LimitationId[] | ["none"];
  mood: "great" | "good" | "okay" | "low" | "tired";
  note?: string;
}

export interface Goal {
  id: string;
  title: string;
  metric: "sessions" | "minutes" | "streak";
  target: number;
  period: "week" | "month";
  createdAt: string;
}

export interface Profile {
  name: string;
  limitations: LimitationId[];
  limitationNotes: string;
  preferredTypes: WorkoutTypeId[];
  weeklyTarget: number;
}

export interface FitnessState {
  profile: Profile;
  workouts: Workout[];
  goals: Goal[];
}
