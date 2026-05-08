import type { Exercise, Instance, PlannedSet, Program } from './types';

// Versioned namespace lets us evolve the schema later without colliding with
// stale localStorage from earlier iterations. Per-user data is keyed by the
// Google `sub` (subject identifier), so every Google account that signs in on
// this device gets its own isolated bucket.
const NS = 'zenith:v1';

const KEYS = {
  programs: (userId: string) => `${NS}:user:${userId}:programs`,
  instances: (userId: string) => `${NS}:user:${userId}:instances`,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function uid(): string {
  return crypto.randomUUID();
}

// Translate old exercise shapes to current shape on read so programs created
// before the schema change still work. Cheap insurance — no-op once data is
// already in the new shape.
function migrateExercise(raw: unknown): Exercise {
  const e = raw as Record<string, unknown>;
  // Planned-sets shape exists; just backfill trackingType if missing (older
  // shape predates the weight/time toggle).
  if (Array.isArray(e.plannedSets)) {
    if (e.trackingType !== 'weight' && e.trackingType !== 'time') {
      return { ...(e as unknown as Exercise), trackingType: 'weight' };
    }
    return e as unknown as Exercise;
  }
  // Oldest shape: targetSets + targetReps. Translate to a planned-set list.
  const targetSets = Math.max(1, Number(e.targetSets) || 1);
  const targetReps = Math.max(1, Number(e.targetReps) || 1);
  const goalWeight =
    typeof e.goalWeight === 'number' ? (e.goalWeight as number) : undefined;
  const plannedSets: PlannedSet[] = Array.from({ length: targetSets }, () => ({
    weight: goalWeight,
    reps: { min: targetReps, max: targetReps },
  }));
  return {
    id: String(e.id),
    name: String(e.name ?? ''),
    schedule: (e.schedule as Exercise['schedule']) ?? { days: [] },
    trackingType: 'weight',
    plannedSets,
    goalWeight,
  };
}

function migrateProgram(p: Program): Program {
  return { ...p, exercises: (p.exercises ?? []).map(migrateExercise) };
}

// --- Programs ------------------------------------------------------------

export function loadPrograms(userId: string): Program[] {
  return read<Program[]>(KEYS.programs(userId), []).map(migrateProgram);
}

export function getProgram(userId: string, programId: string): Program | undefined {
  return loadPrograms(userId).find((p) => p.id === programId);
}

export function createProgram(
  userId: string,
  fields: Omit<Program, 'id' | 'createdAt'>,
): Program {
  const program: Program = { ...fields, id: uid(), createdAt: Date.now() };
  const programs = loadPrograms(userId);
  programs.push(program);
  write(KEYS.programs(userId), programs);
  return program;
}

export function updateProgram(userId: string, program: Program): void {
  const programs = loadPrograms(userId).map((p) =>
    p.id === program.id ? program : p,
  );
  write(KEYS.programs(userId), programs);
}

export function deleteProgram(userId: string, programId: string): void {
  write(
    KEYS.programs(userId),
    loadPrograms(userId).filter((p) => p.id !== programId),
  );
  // Cascade: remove instances belonging to this program.
  write(
    KEYS.instances(userId),
    loadInstances(userId).filter((i) => i.programId !== programId),
  );
}

// --- Instances -----------------------------------------------------------

export function loadInstances(userId: string): Instance[] {
  return read<Instance[]>(KEYS.instances(userId), []);
}

export function loadInstancesForProgram(userId: string, programId: string): Instance[] {
  return loadInstances(userId).filter((i) => i.programId === programId);
}

export function loadInstancesForExercise(userId: string, exerciseId: string): Instance[] {
  return loadInstances(userId).filter((i) => i.exerciseId === exerciseId);
}

export function addInstance(
  userId: string,
  fields: Omit<Instance, 'id' | 'loggedAt'>,
): Instance {
  const instance: Instance = { ...fields, id: uid(), loggedAt: Date.now() };
  const instances = loadInstances(userId);
  instances.unshift(instance);
  write(KEYS.instances(userId), instances);
  return instance;
}

export function deleteInstance(userId: string, id: string): void {
  write(
    KEYS.instances(userId),
    loadInstances(userId).filter((i) => i.id !== id),
  );
}
