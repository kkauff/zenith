// Day-of-week numbers follow JS convention: 0 = Sunday, 6 = Saturday.
export type Schedule = {
  // Sorted, unique. [] means "no schedule set". Length 7 = every day.
  days: number[];
};

// A reps "target" is either a fixed number (min === max) or a range like 8-10.
export type RepsTarget = {
  min: number;
  max: number;
};

// What the exercise is measured by. 'weight' is the standard sets×reps×lbs
// model. 'time' is for body holds / planks / hangs where each set is a
// duration. Sets within an exercise all use the same type.
export type TrackingType = 'weight' | 'time';

// Planned sets describe what the user *intends* to do — first set might be a
// warmup at light weight, working sets at a higher weight, etc. Fields are
// optional and the exercise's `trackingType` decides which apply.
export type PlannedSet = {
  // weight tracking
  weight?: number;
  reps?: RepsTarget;
  // time tracking
  durationSeconds?: number;
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
};

export type Program = {
  id: string;
  name: string;
  categoryKey: string; // matches a key in templates.ts
  createdAt: number;
  // Exercises are embedded — they're conceptually part of the program and
  // there's no need to share them across programs yet.
  exercises: Exercise[];
};

// One actually-logged set. Fields used depend on the exercise's trackingType.
export type InstanceSet = {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
};

// One logged session of one exercise.
export type Instance = {
  id: string;
  programId: string;
  exerciseId: string;
  loggedAt: number;
  sets: InstanceSet[];
  notes?: string;
};
