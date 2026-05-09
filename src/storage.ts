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
import type { Exercise, Instance, PlannedSet, Program } from './types';

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

export function uid(): string {
  return crypto.randomUUID();
}

// Translate older program shapes to the current shape on read so imports of
// older exports still work.
function migrateExercise(raw: unknown): Exercise {
  const e = raw as Record<string, unknown>;
  if (Array.isArray(e.plannedSets)) {
    if (e.trackingType !== 'weight' && e.trackingType !== 'time') {
      return { ...(e as unknown as Exercise), trackingType: 'weight' };
    }
    return e as unknown as Exercise;
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
    schedule: (e.schedule as Exercise['schedule']) ?? { days: [] },
    trackingType: 'weight',
    plannedSets,
    goalWeight,
  };
}

function migrateProgram(p: Program): Program {
  return { ...p, exercises: (p.exercises ?? []).map(migrateExercise) };
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

export async function createProgram(
  userId: string,
  fields: Omit<Program, 'id' | 'createdAt'>,
): Promise<Program> {
  const program: Program = { ...fields, id: uid(), createdAt: Date.now() };
  await setDoc(doc(programsCol(userId), program.id), stripUndefined(program));
  return program;
}

export async function updateProgram(
  userId: string,
  program: Program,
): Promise<void> {
  await setDoc(doc(programsCol(userId), program.id), stripUndefined(program));
}

export async function deleteProgram(
  userId: string,
  programId: string,
): Promise<void> {
  // Cascade: remove instances belonging to this program. Done in a batch so a
  // partial failure doesn't orphan instances.
  if (!db) throw new Error('Firestore is not configured.');
  const instancesSnap = await getDocs(instancesCol(userId));
  const batch = writeBatch(db);
  batch.delete(doc(programsCol(userId), programId));
  instancesSnap.docs.forEach((d) => {
    if ((d.data() as Instance).programId === programId) {
      batch.delete(d.ref);
    }
  });
  await batch.commit();
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

export async function deleteInstance(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(instancesCol(userId), id));
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
