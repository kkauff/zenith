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

export type TrackingType = 'weight' | 'time' | 'band' | 'count';

export const BAND_COLORS = [
  'Yellow',
  'Orange',
  'Red',
  'Blue',
  'Grey',
  'Purple',
  'Black',
] as const;
export type BandColor = (typeof BAND_COLORS)[number];

export const WEIGHTLIFTING_TAGS = [
  'upper',
  'lower',
  'core',
  'push',
  'pull',
  'legs',
] as const;

export const WARMUP_TAGS = ['upper', 'lower', 'pre-run', 'pre-lift'] as const;

export const EXERCISE_TAGS = [
  'upper',
  'lower',
  'core',
  'push',
  'pull',
  'legs',
  'pre-run',
  'pre-lift',
] as const;
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];

// Movement patterns are a finer dimension than the coarse tags above:
// they capture *how* a compound lift moves so one exercise can be
// substituted for another sharing a pattern (e.g. a hotel gym swap).
// Only movements that have real substitutes carry these; most isolation
// work is left unlabeled and simply isn't offered as a swap.
//
// `single-leg` is a *modifier*, not a peer of the primary patterns below:
// two exercises only substitute when they share a primary pattern AND have
// the same single-leg status (see SINGLE_LEG / substitutesFor). That keeps a
// Bulgarian split squat (squat + single-leg) from swapping with a bilateral
// back squat, while still letting it swap with lunges.
export const MOVEMENT_PATTERNS = [
  'horizontal-push',
  'vertical-push',
  'horizontal-pull',
  'vertical-pull',
  'squat',
  'hinge',
  'hamstring-curl',
  'single-leg',
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number];

// The unilateral modifier — see the note above.
export const SINGLE_LEG: MovementPattern = 'single-leg';

export const MOVEMENT_LABEL: Record<MovementPattern, string> = {
  'horizontal-push': 'Horizontal push',
  'vertical-push': 'Vertical push',
  'horizontal-pull': 'Horizontal pull',
  'vertical-pull': 'Vertical pull',
  squat: 'Squat',
  hinge: 'Hinge',
  'hamstring-curl': 'Hamstring curl',
  'single-leg': 'Single leg',
};

export function visibleTagsForCategory(
  categoryKey: string,
): readonly ExerciseTag[] {
  if (categoryKey === 'warmup') return WARMUP_TAGS;
  if (categoryKey === 'rehab') return [] as ExerciseTag[];
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
  'pre-run': 'Pre-run',
  'pre-lift': 'Pre-lift',
};

// Only the fields matching the parent exercise's `trackingType` are
// meaningful; the rest are inert.
export type PlannedSet = {
  weight?: number;
  reps?: RepsTarget;
  durationSeconds?: number;
  bandColor?: string;
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
  movements?: MovementPattern[];
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
  // Required for rehab programs — describes the rehabilitation goal.
  purpose?: string;
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
  bandColor?: string;
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
