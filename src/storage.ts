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
  Reschedule,
  RestDay,
  UserSettings,
} from './types';
import { DEFAULT_SETTINGS } from './types';

// `userId` is the Firebase Auth UID — passed in rather than read from
// auth state so the storage API stays caller-agnostic.

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

function reschedulesCol(userId: string) {
  if (!db) throw new Error('Firestore is not configured.');
  return collection(db, 'users', userId, 'reschedules');
}

function settingsDoc(userId: string) {
  if (!db) throw new Error('Firestore is not configured.');
  return doc(db, 'users', userId, 'settings', 'preferences');
}

export function uid(): string {
  return crypto.randomUUID();
}

// Promotes the legacy `{ days: [...] }` shape into the discriminated union.
// Idempotent.
function migrateSchedule(raw: unknown): Exercise['schedule'] {
  const s = raw as { kind?: string; days?: unknown; period?: unknown; times?: unknown } | undefined;
  if (s && (s.kind === 'weekly-days' || s.kind === 'frequency')) {
    return s as Exercise['schedule'];
  }
  return {
    kind: 'weekly-days',
    days: Array.isArray(s?.days) ? (s!.days as number[]) : [],
  };
}

// Returns null for exercises that no longer fit the current model (legacy
// cardio entries). Caller filters those out at load time.
function migrateExercise(raw: unknown): Exercise | null {
  const e = raw as Record<string, unknown>;
  if (Array.isArray(e.plannedSets)) {
    if (e.trackingType === 'cardio') return null;
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

function migrateProgram(p: Program): Program {
  // Drop the legacy `rollupGoals` field if it still exists in Firestore.
  // Pre-`active` programs default to active so we don't silently disable
  // anyone's daily plan on load.
  const { rollupGoals: _legacy, ...rest } = p as Program & {
    rollupGoals?: unknown;
  };
  return {
    ...rest,
    active: typeof rest.active === 'boolean' ? rest.active : true,
    exercises: (rest.exercises ?? [])
      .map(migrateExercise)
      .filter((e): e is Exercise => e !== null),
  };
}

// Firestore disallows `undefined`, so recursively strip those fields
// before writing. Optional fields on our types may legitimately omit
// values.
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

// Library entries are never deleted by program writes — removing an
// exercise from a program leaves its library entry intact so historical
// instances can still resolve their name and tags.
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

// Removes only the program doc. Instances keep their dangling programId
// so progress survives across program changes and new programs with the
// same exercise name pick up historical data via name-based grouping.
export async function deleteProgram(
  userId: string,
  programId: string,
): Promise<void> {
  await deleteDoc(doc(programsCol(userId), programId));
}

// --- Instances -----------------------------------------------------------

export function subscribeInstances(
  userId: string,
  cb: (instances: Instance[]) => void,
): () => void {
  const q = query(instancesCol(userId), orderBy('loggedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    // Legacy cardio logs still exist in Firestore for some accounts;
    // skip them so the UI never tries to render the old shape.
    cb(
      snap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .filter((i) => i.trackingType !== 'cardio') as Instance[],
    );
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
    cb(
      snap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .filter((e) => e.trackingType !== 'cardio') as LibraryExercise[],
    );
  });
}

// Idempotent — safe to call on every app load. Cheap when the library
// is already in sync (two reads, zero writes).
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

// --- Reschedules ---------------------------------------------------------

export function subscribeReschedules(
  userId: string,
  cb: (reschedules: Reschedule[]) => void,
): () => void {
  const q = query(reschedulesCol(userId), orderBy('fromDate', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Reschedule));
  });
}

export async function saveReschedule(
  userId: string,
  reschedule: Reschedule,
): Promise<void> {
  await setDoc(
    doc(reschedulesCol(userId), reschedule.fromDate),
    stripUndefined(reschedule),
  );
}

export async function deleteReschedule(
  userId: string,
  fromDate: string,
): Promise<void> {
  await deleteDoc(doc(reschedulesCol(userId), fromDate));
}

// --- Settings ------------------------------------------------------------

// Missing doc and missing fields both fall through to DEFAULT_SETTINGS so
// a fresh account works without ever writing here.
export function subscribeSettings(
  userId: string,
  cb: (settings: UserSettings) => void,
): () => void {
  return onSnapshot(settingsDoc(userId), (snap) => {
    const raw = (snap.data() ?? {}) as Partial<UserSettings>;
    const wsd = raw.weekStartDay;
    const validWeekStart =
      typeof wsd === 'number' && wsd >= 0 && wsd <= 6 && Number.isInteger(wsd);
    cb({
      weekStartDay: validWeekStart
        ? (wsd as UserSettings['weekStartDay'])
        : DEFAULT_SETTINGS.weekStartDay,
      weightUnit:
        raw.weightUnit === 'lb' || raw.weightUnit === 'kg'
          ? raw.weightUnit
          : DEFAULT_SETTINGS.weightUnit,
      bodyWeight:
        typeof raw.bodyWeight === 'number' && raw.bodyWeight > 0
          ? raw.bodyWeight
          : undefined,
    });
  });
}

export async function saveSettings(
  userId: string,
  settings: UserSettings,
): Promise<void> {
  await setDoc(settingsDoc(userId), stripUndefined(settings));
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

// Same on-disk shape as exportData so the standard import flow re-loads it.
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

// Merge by id, existing records win on conflict — re-importing the same
// file is a safe no-op.
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
