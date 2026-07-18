import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type {
  Exercise,
  Instance,
  InstanceDraft,
  Program,
  Reschedule,
} from '../types';
import { exercisesForDay, findExercise } from '../today';
import { GLOBAL_EXERCISES, exerciseFromGlobal } from '../exercise-library';
import { summarizeSets } from '../templates';
import { Button } from './ui/button';
import { ExercisePicker, type PickerOption } from './ExercisePicker';
import { SetEditor } from './SetEditor';

type LogInstance = (fields: InstanceDraft) => void;

type Props = {
  date: Date;
  logged: Instance[];
  isRest: boolean;
  programs: Program[];
  activePrograms: Program[];
  reschedules: Reschedule[];
  onLogInstance: LogInstance;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
  onClose: () => void;
};

// A single open editor at a time: either editing an existing logged session
// or logging a new one (missed-from-program or ad-hoc).
type Editor =
  | { mode: 'edit'; inst: Instance; exercise: Exercise }
  | { mode: 'log'; exercise: Exercise; programId?: string };

export function DayEditModal({
  date,
  logged,
  isRest,
  programs,
  activePrograms,
  reschedules,
  onLogInstance,
  onUpdateInstance,
  onDeleteInstance,
  onClose,
}: Props) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape unwinds one layer at a time: the picker dropdown closes itself,
      // then an open inline editor, then the modal.
      if (pickerOpen) return;
      if (editor) setEditor(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, pickerOpen, onClose]);

  const loggedIds = useMemo(
    () => new Set(logged.map((i) => i.exerciseId)),
    [logged],
  );

  // Scheduled that weekday but not logged — the "missed from program" set.
  const missing = useMemo(() => {
    if (isRest) return [];
    return exercisesForDay(activePrograms, date, reschedules).filter(
      (s) => !loggedIds.has(s.exercise.id),
    );
  }, [isRest, activePrograms, date, reschedules, loggedIds]);
  const missingIds = useMemo(
    () => new Set(missing.map((m) => m.exercise.id)),
    [missing],
  );

  // Everything else you could log ad-hoc: any active-program exercise not
  // already logged or listed as missed, plus the global catalog.
  const adhocPool = useMemo(() => {
    const pool: { exercise: Exercise; programId?: string; programName: string }[] =
      [];
    for (const p of activePrograms) {
      for (const e of p.exercises) {
        if (loggedIds.has(e.id) || missingIds.has(e.id)) continue;
        pool.push({ exercise: e, programId: p.id, programName: p.name });
      }
    }
    const programNames = new Set(
      activePrograms.flatMap((p) => p.exercises.map((e) => e.name.toLowerCase())),
    );
    for (const g of GLOBAL_EXERCISES) {
      if (programNames.has(g.name.toLowerCase())) continue;
      pool.push({ exercise: exerciseFromGlobal(g), programName: 'From catalog' });
    }
    return pool;
  }, [activePrograms, loggedIds, missingIds]);

  const pickerOptions: PickerOption[] = useMemo(
    () =>
      adhocPool.map(({ exercise, programName }) => ({
        id: exercise.id,
        name: exercise.name,
        programName,
      })),
    [adhocPool],
  );

  const loggedAtForDay = () => {
    const at = new Date(date);
    at.setHours(12, 0, 0, 0);
    return at.getTime();
  };

  const logNew = (exercise: Exercise, programId: string | undefined) =>
    (sets: Instance['sets'], notes: string) => {
      onLogInstance({
        programId,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        trackingType: exercise.trackingType,
        sets,
        notes: notes.trim() || undefined,
        loggedAt: loggedAtForDay(),
      });
      setEditor(null);
    };

  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${dateLabel}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-lg border border-accent/40 bg-card shadow-glow-accent-sm"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/50 p-4">
          <h2 className="m-0 text-base font-semibold">{dateLabel}</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X aria-hidden className="size-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {/* Logged sessions */}
          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Logged
            </h3>
            {logged.length === 0 && (
              <p className="m-0 text-xs italic text-muted-foreground">
                Nothing logged this day.
              </p>
            )}
            {logged.map((inst) => {
              const resolved = findExercise(programs, inst.exerciseId);
              const name =
                resolved?.exercise.name ?? inst.exerciseName ?? 'Removed exercise';

              if (editor?.mode === 'edit' && editor.inst.id === inst.id) {
                return (
                  <div key={inst.id} className="rounded-lg bg-surface2/60 p-3">
                    <div className="mb-2 text-xs text-muted-foreground">
                      Edit ·{' '}
                      <strong className="font-semibold text-foreground">{name}</strong>
                    </div>
                    <SetEditor
                      exercise={editor.exercise}
                      initial={inst}
                      saveLabel="Save changes"
                      onCancel={() => setEditor(null)}
                      onLog={(sets, notes) => {
                        onUpdateInstance({
                          ...inst,
                          exerciseName: inst.exerciseName ?? editor.exercise.name,
                          trackingType:
                            inst.trackingType ?? editor.exercise.trackingType,
                          sets,
                          notes: notes.trim() || undefined,
                        });
                        setEditor(null);
                      }}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={inst.id}
                  className="flex items-start gap-2 rounded-lg bg-surface2/60 p-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{name}</div>
                    <div className="text-muted-foreground">{summarizeSets(inst)}</div>
                    {inst.notes && (
                      <div className="italic text-muted-foreground">{inst.notes}</div>
                    )}
                  </div>
                  {resolved && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit session"
                      onClick={() =>
                        setEditor({
                          mode: 'edit',
                          inst,
                          exercise: resolved.exercise,
                        })
                      }
                    >
                      <Pencil aria-hidden className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete session"
                    onClick={() => {
                      if (confirm('Delete this logged session?')) {
                        onDeleteInstance(inst.id);
                      }
                    }}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              );
            })}
          </section>

          {/* Missed-from-program quick add */}
          {missing.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Scheduled, not logged
              </h3>
              {missing.map((s) => {
                if (
                  editor?.mode === 'log' &&
                  editor.exercise.id === s.exercise.id
                ) {
                  return (
                    <div key={s.exercise.id} className="rounded-lg bg-surface2/60 p-3">
                      <div className="mb-2 text-xs text-muted-foreground">
                        Log ·{' '}
                        <strong className="font-semibold text-foreground">
                          {s.exercise.name}
                        </strong>
                      </div>
                      <SetEditor
                        exercise={s.exercise}
                        saveLabel="Log session"
                        onCancel={() => setEditor(null)}
                        onLog={logNew(s.exercise, s.program.id)}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={s.exercise.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/60 px-2.5 py-2 text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {s.exercise.name}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 flex-shrink-0"
                      onClick={() =>
                        setEditor({
                          mode: 'log',
                          exercise: s.exercise,
                          programId: s.program.id,
                        })
                      }
                    >
                      Log
                    </Button>
                  </div>
                );
              })}
            </section>
          )}

          {/* Ad-hoc add */}
          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add another exercise
            </h3>
            {editor?.mode === 'log' &&
            !missing.some((m) => m.exercise.id === editor.exercise.id) ? (
              <div className="rounded-lg bg-surface2/60 p-3">
                <div className="mb-2 text-xs text-muted-foreground">
                  Log ·{' '}
                  <strong className="font-semibold text-foreground">
                    {editor.exercise.name}
                  </strong>
                </div>
                <SetEditor
                  exercise={editor.exercise}
                  saveLabel="Log session"
                  onCancel={() => setEditor(null)}
                  onLog={logNew(editor.exercise, editor.programId)}
                />
              </div>
            ) : (
              <ExercisePicker
                options={pickerOptions}
                onOpenChange={setPickerOpen}
                onSelect={(id) => {
                  const found = adhocPool.find((o) => o.exercise.id === id);
                  if (found) {
                    // Picking unmounts the picker (replaced by the editor), so
                    // reset here — its own onOpenChange(false) won't fire.
                    setPickerOpen(false);
                    setEditor({
                      mode: 'log',
                      exercise: found.exercise,
                      programId: found.programId,
                    });
                  }
                }}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
