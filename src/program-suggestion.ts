import type {
  Exercise,
  InstanceSet,
  PlannedSet,
  Program,
  RepsTarget,
  TrackingType,
} from './types';

export function computeSuggestion(
  planned: PlannedSet[],
  logged: InstanceSet[],
  trackingType: TrackingType,
): PlannedSet[] | null {
  if (planned.length === 0 || planned.length !== logged.length) return null;

  if (trackingType === 'band' || trackingType === 'count') return null;

  if (trackingType === 'time') {
    for (const p of planned) {
      if (p.durationSeconds === undefined) return null;
    }
    for (const l of logged) {
      if (l.durationSeconds === undefined) return null;
    }

    let changed = false;
    const updated = planned.map((p, i) => {
      const l = logged[i];
      if (l.durationSeconds !== p.durationSeconds) {
        changed = true;
        return { ...p, durationSeconds: l.durationSeconds };
      }
      return { ...p };
    });

    return changed ? updated : null;
  }

  for (const p of planned) {
    if (p.weight === undefined || !p.reps) return null;
  }
  for (const l of logged) {
    if (l.weight === undefined || l.reps === undefined) return null;
  }

  // Shift every set's range by the same diff (set 1's deviation from its
  // midpoint) so multi-tiered programs stay proportional.
  const firstRange = planned[0].reps!;
  const firstReps = logged[0].reps!;
  const rangeDiff =
    firstReps < firstRange.min || firstReps > firstRange.max
      ? Math.round(firstReps - (firstRange.min + firstRange.max) / 2)
      : 0;

  let changed = false;
  const updated = planned.map((p, i) => {
    const l = logged[i];
    const next: PlannedSet = { ...p };
    if (l.weight !== p.weight) {
      next.weight = l.weight;
      changed = true;
    }
    if (rangeDiff !== 0 && p.reps) {
      const newMin = Math.max(1, p.reps.min + rangeDiff);
      const newMax = Math.max(newMin, p.reps.max + rangeDiff);
      if (newMin !== p.reps.min || newMax !== p.reps.max) {
        next.reps = { min: newMin, max: newMax };
        changed = true;
      }
    }
    return next;
  });

  return changed ? updated : null;
}

export function applySuggestion(
  program: Program,
  exerciseId: string,
  updatedSets: PlannedSet[],
): Program {
  return {
    ...program,
    exercises: program.exercises.map((e) =>
      e.id === exerciseId ? { ...e, plannedSets: updatedSets } : e,
    ),
  };
}

// Adds `dow` (JS getDay 0–6) to a weekly-days exercise, keeping days
// sorted and deduped. Non-weekly-days exercises are left untouched.
export function scheduleExerciseOnDay(
  program: Program,
  exerciseId: string,
  dow: number,
): Program {
  return {
    ...program,
    exercises: program.exercises.map((e) => {
      if (e.id !== exerciseId || e.schedule.kind !== 'weekly-days') return e;
      if (e.schedule.days.includes(dow)) return e;
      const days = [...e.schedule.days, dow].sort((a, b) => a - b);
      return { ...e, schedule: { ...e.schedule, days } };
    }),
  };
}

export function addExerciseToProgram(
  program: Program,
  exercise: Exercise,
): Program {
  return { ...program, exercises: [...program.exercises, exercise] };
}

// Turns logged sets into planned targets; a fixed rep count becomes a
// min === max range.
export function plannedFromInstanceSets(
  sets: InstanceSet[],
  trackingType: TrackingType,
): PlannedSet[] {
  return sets.map((s) => {
    const reps: RepsTarget | undefined =
      s.reps !== undefined ? { min: s.reps, max: s.reps } : undefined;
    if (trackingType === 'time') return { durationSeconds: s.durationSeconds };
    if (trackingType === 'band') return { bandColor: s.bandColor, reps };
    if (trackingType === 'count') return { reps };
    return { weight: s.weight, reps };
  });
}
