// Day-of-week numbers follow JS getDay(): 0 = Sunday … 6 = Saturday.
export type WeeklyDaysSchedule = {
  kind: 'weekly-days';
  // Sorted, unique. [] means "no schedule set". Length 7 = every day.
  days: number[];
};

export type FrequencySchedule = {
  kind: 'frequency';
  period: 'week' | 'month';
  times: number;
};

export type Schedule = WeeklyDaysSchedule | FrequencySchedule;

// min === max for a fixed target, otherwise a range like 8-10.
export type RepsTarget = {
  min: number;
  max: number;
};

export type TrackingType = 'weight' | 'time';

export const WEIGHTLIFTING_TAGS = [
  'upper',
  'lower',
  'core',
  'push',
  'pull',
  'legs',
] as const;
export const EXERCISE_TAGS = WEIGHTLIFTING_TAGS;
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];

export function visibleTagsForCategory(
  _categoryKey: string,
): readonly ExerciseTag[] {
  return WEIGHTLIFTING_TAGS;
}

export function autoTagsForCategory(_categoryKey: string): ExerciseTag[] {
  return [];
}

export const TAG_LABEL: Record<ExerciseTag, string> = {
  upper: 'Upper',
  lower: 'Lower',
  core: 'Core',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
};

// Only the fields matching the parent exercise's `trackingType` are
// meaningful; the rest are inert.
export type PlannedSet = {
  weight?: number;
  reps?: RepsTarget;
  durationSeconds?: number;
};

export type Exercise = {
  id: string;
  name: string;
  schedule: Schedule;
  trackingType: TrackingType;
  plannedSets: PlannedSet[];
  goalWeight?: number;
  goalDurationSeconds?: number;
  tags?: ExerciseTag[];
};

export type Program = {
  id: string;
  name: string;
  categoryKey: string;
  createdAt: number;
  // When false the program is "shelved" — kept in My Programs but excluded
  // from today's scheduled tasks, frequency goals, and adherence math.
  // Historical instances still count toward progress charts and history.
  active: boolean;
  exercises: Exercise[];
};

// Persistent mirror of every exercise that has ever lived in a program.
// Survives program deletion so orphan instances can still resolve their
// name and tags.
export type LibraryExercise = {
  id: string;
  name: string;
  trackingType: TrackingType;
  tags?: ExerciseTag[];
};

export type RestDayReason = 'sick' | 'injured' | 'other';

// Rest days are "out of program" for adherence — they contribute zero to
// both numerator and denominator. The local-date string doubles as the
// Firestore doc id so re-saving for the same day is an idempotent
// overwrite.
export type RestDay = {
  date: string;
  reason: RestDayReason;
  notes?: string;
  createdAt: number;
};

// JS getDay() convention: 0 = Sunday … 6 = Saturday.
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WeightUnit = 'lb' | 'kg';

export type UserSettings = {
  weekStartDay: WeekStartDay;
  weightUnit: WeightUnit;
  // Used to convert assisted-exercise weights to effective load.
  // Stored in the user's current weightUnit.
  bodyWeight?: number;
};

export const DEFAULT_SETTINGS: UserSettings = {
  weekStartDay: 1,
  weightUnit: 'lb',
  bodyWeight: 150,
};

// Push-a-day record. Source date stops expecting the moved exercises;
// target date picks them up. exerciseIds is a snapshot so program edits
// after the push don't retroactively change what was moved. fromDate
// doubles as the Firestore doc id — one reschedule per source date.
export type Reschedule = {
  fromDate: string;
  toDate: string;
  exerciseIds: string[];
  createdAt: number;
};

export type InstanceSet = {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
};

// `programId` is a soft tag and can dangle after the source program is
// deleted — instances survive the deletion. `exerciseName` and
// `trackingType` are denormalized so orphan instances still render
// without a program/library lookup; both are optional for back-compat
// with instances written before they existed.
export type Instance = {
  id: string;
  programId?: string;
  exerciseId: string;
  exerciseName?: string;
  trackingType?: TrackingType;
  loggedAt: number;
  sets: InstanceSet[];
  notes?: string;
};
