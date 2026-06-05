// An instance can outlive the program it was logged under (dangling
// programId) or its source exercise. Resolution walks:
//   1. denormalized `inst.exerciseName`
//   2. the program's nested exercise (if the program still exists)
//   3. the persistent library mirror (survives program deletion)
//   4. global catalog by slug / name / fuzzy match

import {
  findGlobalByName,
  GLOBAL_EXERCISES,
  suggestExercises,
} from './exercise-library';
import type {
  Exercise,
  ExerciseTag,
  Instance,
  LibraryExercise,
  Program,
  TrackingType,
} from './types';

export function resolveExerciseName(
  inst: Instance,
  programs: Program[],
  library: LibraryExercise[] = [],
): string | null {
  if (inst.exerciseName) return inst.exerciseName;
  const program = programs.find((p) => p.id === inst.programId);
  const ex = program?.exercises.find((e) => e.id === inst.exerciseId);
  if (ex) return ex.name;
  const libEx = library.find((e) => e.id === inst.exerciseId);
  return libEx?.name ?? null;
}

export function resolveTrackingType(
  inst: Instance,
  programs: Program[],
  library: LibraryExercise[] = [],
): TrackingType {
  if (inst.trackingType) return inst.trackingType;
  const program = programs.find((p) => p.id === inst.programId);
  const ex = program?.exercises.find((e) => e.id === inst.exerciseId);
  if (ex) return ex.trackingType;
  const libEx = library.find((e) => e.id === inst.exerciseId);
  if (libEx) return libEx.trackingType;
  // Fully orphaned — infer from the set shape.
  for (const s of inst.sets) {
    if (s.durationSeconds !== undefined) return 'time';
    if (s.weight !== undefined && s.reps !== undefined) return 'weight';
  }
  return 'weight';
}

// Exact alias match first, then a fuzzy fallback at the same threshold as
// the "Did you mean…" suggester so "Calf Raises" matches "Calf Raise" and
// "Overhead Dumbbell Press" matches "Overhead Press".
function catalogTagsFor(name: string): ExerciseTag[] | null {
  const exact = findGlobalByName(name);
  if (exact) return exact.tags;
  const [top] = suggestExercises(name, 1);
  return top ? top.tags : null;
}

export function resolveExerciseTags(
  inst: Instance,
  programs: Program[],
  library: LibraryExercise[] = [],
): ExerciseTag[] {
  const program = programs.find((p) => p.id === inst.programId);
  const ex = program?.exercises.find((e) => e.id === inst.exerciseId);
  if (ex?.tags && ex.tags.length > 0) return ex.tags;
  const lib = library.find((e) => e.id === inst.exerciseId);
  if (lib?.tags && lib.tags.length > 0) return lib.tags;
  const bySlug = GLOBAL_EXERCISES.find((g) => g.slug === inst.exerciseId);
  if (bySlug) return bySlug.tags;
  const name = inst.exerciseName ?? ex?.name ?? lib?.name;
  if (name) {
    const fromCatalog = catalogTagsFor(name);
    if (fromCatalog) return fromCatalog;
  }
  return [];
}

// Catalog-backed inference when the user hasn't explicitly set any tags.
// Mirrors `resolveExerciseTags` so the chips on a row match what the chart
// filter resolves to.
export function effectiveExerciseTags(ex: Exercise): ExerciseTag[] {
  if (ex.tags && ex.tags.length > 0) return ex.tags;
  return catalogTagsFor(ex.name) ?? [];
}
