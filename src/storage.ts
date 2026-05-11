import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Exercise,
  Instance,
  LibraryExercise,
  PlannedSet,
  Program,
  RestDay,
} from './types';

// Firestore layout:
//   users/{uid}/programs/{programId}
//   users/{uid}/instances/{instanceId}
// `uid` is the Firebase Auth UID (passed in as `userId` to keep the storage
// API caller-agnostic — the auth layer chooses what string to use).

function programsCol(userId: string) {
  if (!db) throw new Error('Firestore is not configured.');
  return collection(db, 'users', userId, 'programs');
}

function instancesCol(userId: string) {
  if (!db) throw new Error('Firestore is not configured.');
  return collection(db, 'users', userId, 'instances');
}

function exercisesCol(userId: string) {
  if (!db) throw new Error('Firestore is not configured.');
  return collection(db, 'users', userId, 'exercises');
}

function restDaysCol(userId: string) {
  if (!db) throw new Error('Firestore is not configured.');
  return collection(db, 'users', userId, 'restDays');
}

export function uid(): string {
  return crypto.randomUUID();
}

// Wrap the legacy `{ days: [...] }` schedule shape into the discriminated
// union we use today. Idempotent — already-migrated values pass through.
function migrateSchedule(raw: unknown): Exercise['schedule'] {
  const s = raw as { kind?: string; days?: unknown; period?: unknown; times?: unknown } | undefined;
  if (s && (s.kind === 'weekly-days' || s.kind === 'frequency')) {
    return s as Exercise['schedule'];
  }
  // Old shape was just { days: number[] } — promote to weekly-days.
  return {
    kind: 'weekly-days',
    days: Array.isArray(s?.days) ? (s!.days as number[]) : [],
  };
}

// Translate older program shapes to the current shape on read so imports of
// older exports still work.
function migrateExercise(raw: unknown): Exercise {
  const e = raw as Record<string, unknown>;
  if (Array.isArray(e.plannedSets)) {
    const out = { ...(e as unknown as Exercise) };
    if (out.trackingType !== 'weight' && out.trackingType !== 'time') {
      out.trackingType = 'weight';
    }
    out.schedule = migrateSchedule(out.schedule);
    return out;
  }
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
    schedule: migrateSchedule(e.schedule),
    trackingType: 'weight',
    plannedSets,
    goalWeight,
  };
}

// Wrap a legacy rollup goal (with `tag` directly) into the new
// discriminated `target` shape. Idempotent.
function migrateRollupGoal(raw: unknown): import('./types').RollupGoal {
  const g = raw as Record<string, unknown>;
  if (g.target && typeof g.target === 'object') {
    return g as unknown as import('./types').RollupGoal;
  }
  return {
    ...(g as unknown as import('./types').RollupGoal),
    target: {
      kind: 'tag',
      tag: g.tag as import('./types').ExerciseTag,
    },
  };
}

function migrateProgram(p: Program): Program {
  return {
    ...p,
    exercises: (p.exercises ?? []).map(migrateExercise),
    rollupGoals: p.rollupGoals
      ? p.rollupGoals.map(migrateRollupGoal)
      : undefined,
  };
}

// Firestore disallows `undefined`. Strip undefined fields recursively so we
// can pass through user-shaped objects (Exercise, PlannedSet, …) that may
// legitimately omit optional values.
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

// --- Programs ------------------------------------------------------------

export function subscribePrograms(
  userId: string,
  cb: (programs: Program[]) => void,
): () => void {
  const q = query(programsCol(userId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => migrateProgram(d.data() as Program)));
  });
}

// Mirror this program's nested exercise definitions into the persistent
// library. Idempotent — repeating the same write is a no-op. Library entries
// are intentionally never deleted by program writes: if you remove an
// exercise from a program, its library entry stays so historical instances
// can still resolve a name.
async function syncProgramToLibrary(
  userId: string,
  program: Program,
): Promise<void> {
  if (!db || program.exercises.length === 0) return;
  const batch = writeBatch(db);
  for (const ex of program.exercises) {
    batch.set(
      doc(exercisesCol(userId), ex.id),
      stripUndefined({
        id: ex.id,
        name: ex.name,
        trackingType: ex.trackingType,
        tags: ex.tags,
        cardioActivity: ex.cardioActivity,
        cardioUnit: ex.cardioUnit,
      }),
    );
  }
  await batch.commit();
}

export async function createProgram(
  userId: string,
  fields: Omit<Program, 'id' | 'createdAt'>,
): Promise<Program> {
  const program: Program = { ...fields, id: uid(), createdAt: Date.now() };
  await setDoc(doc(programsCol(userId), program.id), stripUndefined(program));
  await syncProgramToLibrary(userId, program);
  return program;
}

export async function updateProgram(
  userId: string,
  program: Program,
): Promise<void> {
  await setDoc(doc(programsCol(userId), program.id), stripUndefined(program));
  await syncProgramToLibrary(userId, program);
}

export async function deleteProgram(
  userId: string,
  programId: string,
): Promise<void> {
  // Programs are soft tags — deleting one only removes the program doc.
  // Logged instances keep their (now-dangling) programId so progress carries
  // over across program changes, and a new program with the same exercise
  // name will pick up the historical data via name-based grouping.
  await deleteDoc(doc(programsCol(userId), programId));
}

// --- Instances -----------------------------------------------------------

export function subscribeInstances(
  userId: string,
  cb: (instances: Instance[]) => void,
): () => void {
  const q = query(instancesCol(userId), orderBy('loggedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Instance));
  });
}

export async function addInstance(
  userId: string,
  fields: Omit<Instance, 'id' | 'loggedAt'>,
): Promise<Instance> {
  const instance: Instance = { ...fields, id: uid(), loggedAt: Date.now() };
  await setDoc(doc(instancesCol(userId), instance.id), stripUndefined(instance));
  return instance;
}

export async function updateInstance(
  userId: string,
  instance: Instance,
): Promise<void> {
  await setDoc(doc(instancesCol(userId), instance.id), stripUndefined(instance));
}

export async function deleteInstance(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(instancesCol(userId), id));
}

// --- Exercise library ----------------------------------------------------

export function subscribeExerciseLibrary(
  userId: string,
  cb: (library: LibraryExercise[]) => void,
): () => void {
  const q = query(exercisesCol(userId), orderBy('name'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as LibraryExercise));
  });
}

// One-time backfill for users whose programs predate the library. Walks
// existing programs and writes any exercise definitions that aren't in the
// library yet. Idempotent — safe to call on every app load. Cheap when the
// library is already up to date (a couple of reads, no writes).
export async function backfillExerciseLibrary(userId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not configured.');
  const [progSnap, libSnap] = await Promise.all([
    getDocs(programsCol(userId)),
    getDocs(exercisesCol(userId)),
  ]);
  const existingIds = new Set(libSnap.docs.map((d) => d.id));
  const ops: { ref: ReturnType<typeof doc>; data: LibraryExercise }[] = [];
  for (const progDoc of progSnap.docs) {
    const program = progDoc.data() as Program;
    for (const ex of program.exercises ?? []) {
      if (existingIds.has(ex.id)) continue;
      ops.push({
        ref: doc(exercisesCol(userId), ex.id),
        data: stripUndefined({
          id: ex.id,
          name: ex.name,
          trackingType: ex.trackingType,
          tags: ex.tags,
          cardioActivity: ex.cardioActivity,
          cardioUnit: ex.cardioUnit,
        }) as LibraryExercise,
      });
      existingIds.add(ex.id);
    }
  }
  if (ops.length === 0) return;
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    for (const { ref, data } of ops.slice(i, i + 450)) {
      batch.set(ref, data);
    }
    await batch.commit();
  }
}

// --- Rest days -----------------------------------------------------------

export function subscribeRestDays(
  userId: string,
  cb: (restDays: RestDay[]) => void,
): () => void {
  const q = query(restDaysCol(userId), orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as RestDay));
  });
}

// Idempotent: the date string doubles as the doc id, so saving twice for the
// same day overwrites rather than duplicating.
export async function saveRestDay(
  userId: string,
  restDay: RestDay,
): Promise<void> {
  await setDoc(doc(restDaysCol(userId), restDay.date), stripUndefined(restDay));
}

export async function deleteRestDay(
  userId: string,
  date: string,
): Promise<void> {
  await deleteDoc(doc(restDaysCol(userId), date));
}

// --- Export / Import -----------------------------------------------------

export const EXPORT_VERSION = 1;

export type ExportFile = {
  format: 'zenith';
  version: number;
  exportedAt: string;
  programs: Program[];
  instances: Instance[];
};

export type ImportSummary = {
  programsAdded: number;
  programsSkipped: number;
  instancesAdded: number;
  instancesSkipped: number;
};

export async function exportData(userId: string): Promise<ExportFile> {
  const [progSnap, instSnap] = await Promise.all([
    getDocs(programsCol(userId)),
    getDocs(instancesCol(userId)),
  ]);
  return {
    format: 'zenith',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    programs: progSnap.docs.map((d) => d.data() as Program),
    instances: instSnap.docs.map((d) => d.data() as Instance),
  };
}

// Export a single program plus its instances. Same on-disk shape as
// exportData, so the standard import flow handles re-loading it.
export async function exportProgram(
  userId: string,
  programId: string,
): Promise<ExportFile> {
  const [progSnap, instSnap] = await Promise.all([
    getDocs(programsCol(userId)),
    getDocs(instancesCol(userId)),
  ]);
  const program = progSnap.docs
    .map((d) => d.data() as Program)
    .find((p) => p.id === programId);
  const instances = instSnap.docs
    .map((d) => d.data() as Instance)
    .filter((i) => i.programId === programId);
  return {
    format: 'zenith',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    programs: program ? [program] : [],
    instances,
  };
}

export function parseImportFile(raw: string): ExportFile {
  const data = JSON.parse(raw) as Partial<ExportFile>;
  if (data.format !== 'zenith') {
    throw new Error('Not a Zenith export file.');
  }
  if (typeof data.version !== 'number' || data.version > EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${String(data.version)}`);
  }
  if (!Array.isArray(data.programs) || !Array.isArray(data.instances)) {
    throw new Error('Export file is missing programs or instances.');
  }
  return data as ExportFile;
}

// Merge by id. Existing records win on conflict — re-importing the same file
// is a safe no-op. Writes go through a single batch per collection so the
// import either lands fully or not at all.
export async function importData(
  userId: string,
  file: ExportFile,
): Promise<ImportSummary> {
  if (!db) throw new Error('Firestore is not configured.');

  const [progSnap, instSnap] = await Promise.all([
    getDocs(programsCol(userId)),
    getDocs(instancesCol(userId)),
  ]);
  const existingProgramIds = new Set(progSnap.docs.map((d) => d.id));
  const existingInstanceIds = new Set(instSnap.docs.map((d) => d.id));

  const newPrograms = file.programs
    .map(migrateProgram)
    .filter((p) => !existingProgramIds.has(p.id));
  const newInstances = file.instances.filter(
    (i) => !existingInstanceIds.has(i.id),
  );

  // Firestore batches cap at 500 ops; chunk to be safe.
  const all = [
    ...newPrograms.map((p) => ({
      ref: doc(programsCol(userId), p.id),
      data: stripUndefined(p),
    })),
    ...newInstances.map((i) => ({
      ref: doc(instancesCol(userId), i.id),
      data: stripUndefined(i),
    })),
  ];
  for (let i = 0; i < all.length; i += 450) {
    const batch = writeBatch(db);
    for (const { ref, data } of all.slice(i, i + 450)) {
      batch.set(ref, data);
    }
    await batch.commit();
  }

  return {
    programsAdded: newPrograms.length,
    programsSkipped: file.programs.length - newPrograms.length,
    instancesAdded: newInstances.length,
    instancesSkipped: file.instances.length - newInstances.length,
  };
}
