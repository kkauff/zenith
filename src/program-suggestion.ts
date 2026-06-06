import type { InstanceSet, PlannedSet, Program } from './types';

export function computeSuggestion(
  planned: PlannedSet[],
  logged: InstanceSet[],
): PlannedSet[] | null {
  if (planned.length === 0 || planned.length !== logged.length) return null;
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
