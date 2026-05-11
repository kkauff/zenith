// Helpers for working with logged instances across programs.
//
// Programs are tags rather than containers, so an instance might outlive the
// program it was logged under (dangling `programId`) or its source exercise
// (the exercise was removed from the program). Resolution order:
//   1. `inst.exerciseName` — denormalized at log time on newer instances.
//   2. The program's nested exercise (if the program still exists).
//   3. The persistent exercise library — survives program deletion, so
//      orphan instances logged after the library was introduced still
//      resolve to a real name.
//   4. null → caller decides on an "Unknown exercise" fallback.

import { findGlobalByName, GLOBAL_EXERCISES } from './exercise-library';
import type {
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
  // Fully orphaned instance with no library record — infer from set shape.
  for (const s of inst.sets) {
    if (s.durationSeconds !== undefined) return 'time';
    if (s.weight !== undefined && s.reps !== undefined) return 'weight';
  }
  return 'weight';
}

// Resolve an instance's exercise tags by walking program → library → global
// catalog. Three catalog matches in order of precision: by slug (ad-hoc
// logs from the home picker), by program/library exercise name, and by
// the denormalized `inst.exerciseName`. The name fallbacks recover tags
// for custom program exercises whose name happens to match a catalog item
// (e.g. a user-built program with "Plank" — same name, different id).
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
    const byName = findGlobalByName(name);
    if (byName) return byName.tags;
  }
  return [];
}
