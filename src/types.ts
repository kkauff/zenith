// Two ways to schedule an exercise:
//   - weekly-days: pinned to specific weekdays (Mon/Wed/Fri etc.)
//   - frequency:   "X times per week/month" with no specific day attached
//
// Day-of-week numbers follow JS convention: 0 = Sunday, 6 = Saturday.
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

// A reps "target" is either a fixed number (min === max) or a range like 8-10.
export type RepsTarget = {
  min: number;
  max: number;
};

// What the exercise is measured by. 'weight' is the standard sets×reps×lbs
// model. 'time' is for body holds / planks / hangs where each set is a
// duration. 'cardio' captures runs / rides / swims — each set logs both
// distance AND time, with the goal targeting one of the two.
export type TrackingType = 'weight' | 'time' | 'cardio';

// Distinct cardio activities. Keeps the catalog and form pickers grounded
// in real-world choices (rather than letting the user type free-form names
// for the same activity).
export type CardioActivity =
  | 'running'
  | 'treadmill-running'
  | 'outdoor-bike'
  | 'indoor-bike'
  | 'elliptical'
  | 'stairmaster'
  | 'swimming';

export type DistanceUnit = 'miles' | 'km' | 'yards' | 'meters';

// Tags split into two groups:
//   USER-VISIBLE — what shows up as chips in the exercise form. Differs by
//   program category:
//     Weightlifting: body region (upper/lower/core) + movement (push/pull/legs)
//     Cardio:        intensity (zone-2/threshold/vo2-max/sprints/easy)
//   SYSTEM — invisible to the user but applied automatically based on
//   program category. We use this to keep category info on the exercise
//   itself (and, via the library/catalog tag chain, on logged instances
//   after a program is deleted). Treating category as an invisible tag
//   means tag-based rollup matching ("any cardio") needs no special-case.
export const WEIGHTLIFTING_TAGS = [
  'upper',
  'lower',
  'core',
  'push',
  'pull',
  'legs',
] as const;
export const CARDIO_TAGS = [
  'zone-2',
  'threshold',
  'vo2-max',
  'sprints',
  'easy',
] as const;
const SYSTEM_TAGS = ['cardio'] as const;
export const EXERCISE_TAGS = [
  ...WEIGHTLIFTING_TAGS,
  ...CARDIO_TAGS,
  ...SYSTEM_TAGS,
] as const;
export type ExerciseTag = (typeof EXERCISE_TAGS)[number];

// Tags the user can pick from in the form for a given program category.
// System tags ('cardio') aren't included — they're auto-applied at save.
export function visibleTagsForCategory(
  categoryKey: string,
): readonly ExerciseTag[] {
  return categoryKey === 'cardio' ? CARDIO_TAGS : WEIGHTLIFTING_TAGS;
}

// Invisible tags applied to every exercise in a category. Today only the
// 'cardio' category gets one; weightlifting is implicit (no system tag).
export function autoTagsForCategory(categoryKey: string): ExerciseTag[] {
  return categoryKey === 'cardio' ? ['cardio'] : [];
}

// Display labels — kept in one place so ExerciseForm, ProgressPanel, and
// any future filter UIs all use the same wording.
export const TAG_LABEL: Record<ExerciseTag, string> = {
  upper: 'Upper',
  lower: 'Lower',
  core: 'Core',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  'zone-2': 'Zone 2',
  threshold: 'Threshold',
  'vo2-max': 'VO2 Max',
  sprints: 'Sprints',
  easy: 'Easy',
  cardio: 'Cardio',
};

// Planned sets describe what the user *intends* to do — first set might be a
// warmup at light weight, working sets at a higher weight, etc. Fields are
// optional and the exercise's `trackingType` decides which apply.
export type PlannedSet = {
  // weight tracking
  weight?: number;
  reps?: RepsTarget;
  // time tracking
  durationSeconds?: number;
  // cardio tracking — distance is paired with durationSeconds; the unit
  // lives on the parent Exercise.
  distance?: number;
};

export type Exercise = {
  id: string;
  name: string;
  schedule: Schedule;
  trackingType: TrackingType;
  plannedSets: PlannedSet[];
  // Aspirational targets for the exercise overall, separate from per-set
  // values. Only the one matching `trackingType` is meaningful.
  goalWeight?: number;
  goalDurationSeconds?: number;
  goalDistance?: number;
  // Cardio-only descriptors. `cardioGoalKind` decides which of
  // `goalDistance` / `goalDurationSeconds` is the headline target — every
  // logged cardio session captures both regardless.
  cardioActivity?: CardioActivity;
  cardioUnit?: DistanceUnit;
  cardioGoalKind?: 'distance' | 'time';
  // Optional muscle/movement tags. Pre-filled from the global catalog when
  // the user picks a suggested exercise; otherwise chosen in the form.
  tags?: ExerciseTag[];
};

export type Program = {
  id: string;
  name: string;
  categoryKey: string; // matches a key in templates.ts
  createdAt: number;
  // Exercises are embedded — they're conceptually part of the program and
  // there's no need to share them across programs yet.
  exercises: Exercise[];
  // Aggregate "do X amount of [tag] per [period|day]" goals. Tag-matched
  // instances from any program (or ad-hoc catalog logs) count toward
  // these — the program is just the organizational holder.
  rollupGoals?: RollupGoal[];
};

// Rollup goals aggregate amount over time — either across all exercises
// matching a tag, or against a specific exercise. e.g. "30 min cardio on
// M/W/F" (any cardio), "5 mi of Running per week" (specific exercise).
export type RollupMetric = 'time' | 'distance';

// Either match instances by their exercise id (specific exercise) or by a
// tag on the exercise definition / library / catalog (e.g. "any cardio").
export type RollupTarget =
  | { kind: 'tag'; tag: ExerciseTag }
  | { kind: 'exercise'; exerciseId: string };

// Two scheduling shapes:
//   weekly-days: amount is per scheduled day (e.g. 30 min EACH M/W/F).
//   total:       amount is the cumulative target for the whole period.
export type RollupSchedule =
  | { kind: 'weekly-days'; days: number[]; amount: number }
  | { kind: 'total'; period: 'week' | 'month'; amount: number };

export type RollupGoal = {
  id: string;
  target: RollupTarget;
  metric: RollupMetric;
  // Required when metric === 'distance'. For time-based goals the amount
  // in `schedule.amount` is in seconds.
  unit?: DistanceUnit;
  schedule: RollupSchedule;
};

// Persistent library mirror of every exercise that's ever lived in a
// program. Survives program deletion so logged instances can still resolve
// their exercise name even when the source program is gone. Rebuilt
// transparently on program writes; a startup backfill picks up legacy data
// authored before the library existed.
export type LibraryExercise = {
  id: string;
  name: string;
  trackingType: TrackingType;
  tags?: ExerciseTag[];
  cardioActivity?: CardioActivity;
  cardioUnit?: DistanceUnit;
};

// Marks a calendar day where the user explicitly opted to rest (sick /
// injured / other). Treated as "out of program" by the adherence math: the
// day contributes 0 to expected, so it's neither a hit nor a miss. One
// document per local-date — the date key (YYYY-MM-DD) is also the Firestore
// doc ID, so saving twice for the same day is an idempotent overwrite.
export type RestDayReason = 'sick' | 'injured' | 'other';

export type RestDay = {
  // YYYY-MM-DD in local time. Doubles as the Firestore doc id.
  date: string;
  reason: RestDayReason;
  // Free-form note from the user — what's going on, how they're feeling.
  notes?: string;
  createdAt: number;
};

// One actually-logged set. Fields used depend on the exercise's trackingType.
export type InstanceSet = {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  distance?: number;
};

// One logged session of one exercise.
//
// `programId` is a soft tag — the program the user logged this against. The
// program may be deleted later; the instance survives with a dangling
// `programId` so historical progress isn't lost. It can also be omitted
// entirely for logs picked from the global catalog without going through a
// program ("ad-hoc" sessions).
//
// `exerciseName` and `trackingType` are denormalized off the originating
// exercise so progress can keep grouping orphan instances after the
// program (and its nested exercise definition) is gone. Both are optional
// for backwards compatibility — old instances written before this field
// existed fall back to a program lookup at display time.
export type Instance = {
  id: string;
  programId?: string;
  exerciseId: string;
  exerciseName?: string;
  trackingType?: TrackingType;
  // Denormalized for cardio so summary rows can render "3.2 mi" without
  // chasing through library/program lookups. Set on new cardio logs;
  // resolved at display time when missing.
  cardioUnit?: DistanceUnit;
  loggedAt: number;
  sets: InstanceSet[];
  notes?: string;
};
