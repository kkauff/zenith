import { useState } from 'react';
import { ArrowLeft, Download, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Exercise, Instance, Program, RollupGoal } from '../types';
import {
  cardioActivityLabel,
  formatDistance,
  formatDuration,
  formatPlannedSets,
  formatSchedule,
  getCategory,
} from '../templates';
import * as store from '../storage';
import { summarizeRollup, summarizeRollupSchedule } from '../rollup';
import { ConfirmDialog } from './ConfirmDialog';
import { ExerciseForm } from './ExerciseForm';
import { RollupGoalForm } from './RollupGoalForm';
import { SetEditor } from './SetEditor';
import { Button } from './ui/button';
import { Card, CardTitle } from './ui/card';
import { Input } from './ui/input';

type Props = {
  userId: string;
  program: Program;
  instances: Instance[];
  onBack: () => void;
  onUpdate: (program: Program) => void;
  onDelete: () => void;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
};

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'program';
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ProgramDetail({
  userId,
  program,
  instances,
  onBack,
  onUpdate,
  onDelete,
  onUpdateInstance,
  onDeleteInstance,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await store.exportProgram(userId, program.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenith-${safeFilename(program.name)}-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(false);
    }
  };

  const category = getCategory(program.categoryKey);
  const CategoryIcon = category?.Icon;

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(program.name);
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [addingRollup, setAddingRollup] = useState(false);
  const [editingRollupId, setEditingRollupId] = useState<string | null>(null);

  // Group recent instances by exercise so each row shows its latest session.
  const lastByExercise = new Map<string, Instance>();
  for (const inst of instances) {
    if (!lastByExercise.has(inst.exerciseId)) {
      lastByExercise.set(inst.exerciseId, inst);
    }
  }

  const saveName = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onUpdate({ ...program, name: trimmed });
    setEditingName(false);
  };

  const cancelRename = () => {
    setDraftName(program.name);
    setEditingName(false);
  };

  const addExercise = (ex: Exercise) => {
    onUpdate({ ...program, exercises: [...program.exercises, ex] });
    setAddingExercise(false);
  };

  const updateExercise = (ex: Exercise) => {
    onUpdate({
      ...program,
      exercises: program.exercises.map((e) => (e.id === ex.id ? ex : e)),
    });
    setEditingExerciseId(null);
  };

  const removeExercise = (id: string) => {
    if (!confirm('Remove this exercise from the program?')) return;
    onUpdate({
      ...program,
      exercises: program.exercises.filter((e) => e.id !== id),
    });
  };

  const addRollup = (goal: RollupGoal, autoExercise?: Exercise) => {
    onUpdate({
      ...program,
      exercises: autoExercise
        ? [...program.exercises, autoExercise]
        : program.exercises,
      rollupGoals: [...(program.rollupGoals ?? []), goal],
    });
    setAddingRollup(false);
  };

  const updateRollup = (goal: RollupGoal, autoExercise?: Exercise) => {
    onUpdate({
      ...program,
      exercises: autoExercise
        ? [...program.exercises, autoExercise]
        : program.exercises,
      rollupGoals: (program.rollupGoals ?? []).map((g) =>
        g.id === goal.id ? goal : g,
      ),
    });
    setEditingRollupId(null);
  };

  const removeRollup = (id: string) => {
    if (!confirm('Remove this rollup goal?')) return;
    onUpdate({
      ...program,
      rollupGoals: (program.rollupGoals ?? []).filter((g) => g.id !== id),
    });
  };

  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {editingName ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') cancelRename();
            }}
            aria-label="Program name"
          />
        ) : (
          <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
            {program.name}
          </h1>
        )}
        {editingName ? (
          <>
            <Button size="sm" onClick={saveName}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelRename}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="iconSm"
              onClick={handleExport}
              disabled={exporting}
              aria-label="Export program"
            >
              <Download aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="iconSm"
              onClick={() => {
                setDraftName(program.name);
                setEditingName(true);
              }}
              aria-label="Rename program"
            >
              <Pencil aria-hidden />
            </Button>
            <Button
              variant="destructive"
              size="iconSm"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete program"
            >
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
      </header>

      <p className="m-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        {CategoryIcon && <CategoryIcon aria-hidden className="size-4" />}
        {category?.name ?? program.categoryKey}
      </p>

      <Card>
        <CardTitle className="mb-5">Exercises</CardTitle>

        {program.exercises.length === 0 && !addingExercise && (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            No exercises yet. Tap “Add exercise” below to start.
          </p>
        )}

        {program.exercises.length > 0 && (
          <ul className="flex flex-col gap-2 list-none m-0 p-0">
            {program.exercises.map((ex) => {
              if (editingExerciseId === ex.id) {
                return (
                  <li key={ex.id} className="rounded-lg bg-surface2 p-3.5">
                    <ExerciseForm
                      categoryKey={program.categoryKey}
                      initial={ex}
                      onSave={updateExercise}
                      onCancel={() => setEditingExerciseId(null)}
                    />
                  </li>
                );
              }
              const last = lastByExercise.get(ex.id);
              const goal = (() => {
                if (
                  ex.trackingType === 'time' &&
                  ex.goalDurationSeconds !== undefined
                ) {
                  return ` · goal ${formatDuration(ex.goalDurationSeconds)}`;
                }
                if (ex.trackingType === 'weight' && ex.goalWeight !== undefined) {
                  return ` · goal ${ex.goalWeight} lb`;
                }
                if (ex.trackingType === 'cardio') {
                  if (
                    ex.cardioGoalKind === 'time' &&
                    ex.goalDurationSeconds !== undefined
                  ) {
                    return ` · goal ${formatDuration(ex.goalDurationSeconds)}`;
                  }
                  if (
                    ex.cardioGoalKind === 'distance' &&
                    ex.goalDistance !== undefined &&
                    ex.cardioUnit
                  ) {
                    return ` · goal ${formatDistance(ex.goalDistance, ex.cardioUnit)}`;
                  }
                }
                return '';
              })();
              const middleLine =
                ex.trackingType === 'cardio'
                  ? ex.cardioActivity
                    ? cardioActivityLabel(ex.cardioActivity)
                    : 'Cardio'
                  : formatPlannedSets(ex.plannedSets, ex.trackingType);
              return (
                <li
                  key={ex.id}
                  className="flex items-start gap-2 rounded-lg bg-surface2 p-3.5"
                >
                  <div className="flex-1 min-w-0">
                    <div>
                      <strong className="font-semibold">{ex.name}</strong>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatSchedule(ex.schedule)} · {middleLine}
                      {goal}
                    </div>
                    {last && (
                      <div className="mt-1 text-xs text-primary text-glow-primary">
                        Last: {summarizeSets(last)} ·{' '}
                        {new Date(last.loggedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="secondary"
                      size="iconSm"
                      onClick={() => setEditingExerciseId(ex.id)}
                      aria-label={`Edit ${ex.name}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => removeExercise(ex.id)}
                      aria-label={`Remove ${ex.name}`}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {addingExercise && (
          <div className="mt-3 rounded-lg bg-surface2 p-3.5">
            <ExerciseForm
              categoryKey={program.categoryKey}
              onSave={addExercise}
              onCancel={() => setAddingExercise(false)}
            />
          </div>
        )}

        {!addingExercise && editingExerciseId === null && (
          <Button
            onClick={() => setAddingExercise(true)}
            className="mt-3 w-full"
          >
            <Plus aria-hidden /> Add exercise
          </Button>
        )}
      </Card>

      {program.categoryKey === 'cardio' && (
        <Card>
          <CardTitle className="mb-5">Cardio goals</CardTitle>

          {(program.rollupGoals ?? []).length === 0 && !addingRollup && (
            <p className="italic text-sm text-muted-foreground py-2 m-0">
              Aggregate cardio goals — e.g. “5 mi of Running per week” or
              “6 hr of any cardio per week” or “30 min cardio on Mondays.”
            </p>
          )}

          {(program.rollupGoals ?? []).length > 0 && (
            <ul className="flex flex-col gap-2 list-none m-0 p-0">
              {(program.rollupGoals ?? []).map((g) => {
                if (editingRollupId === g.id) {
                  return (
                    <li key={g.id} className="rounded-lg bg-surface2 p-3.5">
                      <RollupGoalForm
                        program={program}
                        initial={g}
                        onSave={updateRollup}
                        onCancel={() => setEditingRollupId(null)}
                      />
                    </li>
                  );
                }
                return (
                  <li
                    key={g.id}
                    className="flex items-start gap-2 rounded-lg bg-surface2 p-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div>
                        <strong className="font-semibold">
                          {summarizeRollup(g, program)}
                        </strong>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {summarizeRollupSchedule(g)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="iconSm"
                        onClick={() => setEditingRollupId(g.id)}
                        aria-label="Edit cardio goal"
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => removeRollup(g.id)}
                        aria-label="Remove cardio goal"
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {addingRollup && (
            <div className="mt-3 rounded-lg bg-surface2 p-3.5">
              <RollupGoalForm
                program={program}
                onSave={addRollup}
                onCancel={() => setAddingRollup(false)}
              />
            </div>
          )}

          {!addingRollup && editingRollupId === null && (
            <Button
              onClick={() => setAddingRollup(true)}
              className="mt-3 w-full"
            >
              <Plus aria-hidden /> Add cardio goal
            </Button>
          )}
        </Card>
      )}

      <Card>
        <CardTitle className="mb-5">Recent sessions</CardTitle>
        {instances.length === 0 ? (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            No sessions logged yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 list-none m-0 p-0">
            {instances.slice(0, 20).map((inst) => {
              const ex = program.exercises.find((e) => e.id === inst.exerciseId);
              if (editingInstanceId === inst.id && ex) {
                return (
                  <li key={inst.id} className="rounded-lg bg-surface2 p-3.5">
                    <div className="mb-2 text-xs text-muted-foreground">
                      Edit session ·{' '}
                      <strong className="font-semibold text-foreground">
                        {ex.name}
                      </strong>{' '}
                      · {new Date(inst.loggedAt).toLocaleDateString()}
                    </div>
                    <SetEditor
                      exercise={ex}
                      initial={inst}
                      saveLabel="Save changes"
                      onCancel={() => setEditingInstanceId(null)}
                      onLog={(sets, notes) => {
                        onUpdateInstance({
                          ...inst,
                          exerciseName: inst.exerciseName ?? ex.name,
                          trackingType: inst.trackingType ?? ex.trackingType,
                          cardioUnit: inst.cardioUnit ?? ex.cardioUnit,
                          sets,
                          notes: notes.trim() || undefined,
                        });
                        setEditingInstanceId(null);
                      }}
                    />
                  </li>
                );
              }
              return (
                <li
                  key={inst.id}
                  className="flex items-start gap-2 rounded-lg bg-surface2 p-3.5"
                >
                  <div className="flex-1 min-w-0">
                    <div>
                      <strong className="font-semibold">
                        {ex?.name ?? inst.exerciseName ?? 'Removed exercise'}
                      </strong>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {summarizeSets(inst)} ·{' '}
                      {new Date(inst.loggedAt).toLocaleDateString()}
                    </div>
                    {inst.notes && (
                      <div className="text-xs text-muted-foreground italic">
                        “{inst.notes}”
                      </div>
                    )}
                  </div>
                  {ex && (
                    <Button
                      variant="secondary"
                      size="iconSm"
                      aria-label="Edit session"
                      onClick={() => setEditingInstanceId(inst.id)}
                    >
                      <Pencil aria-hidden />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label="Delete session"
                    onClick={() => {
                      if (confirm('Delete this logged session?')) {
                        onDeleteInstance(inst.id);
                      }
                    }}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete "${program.name}"?`}
        description="This removes the program but keeps every session you've already logged. Progress for those exercises will still show up under My Progress and roll forward into any new program with the same exercise name."
        confirmLabel="Delete program"
        destructive
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function summarizeSets(inst: Instance): string {
  if (inst.sets.length === 0) return 'No sets recorded';
  const unit = inst.cardioUnit ?? 'miles';
  return inst.sets
    .map((s) => {
      if (s.distance !== undefined && s.durationSeconds !== undefined) {
        return `${formatDistance(s.distance, unit)} · ${formatDuration(s.durationSeconds)}`;
      }
      if (s.distance !== undefined) return formatDistance(s.distance, unit);
      if (s.durationSeconds !== undefined) return formatDuration(s.durationSeconds);
      if (s.weight !== undefined && s.reps !== undefined) return `${s.weight}×${s.reps}`;
      return '—';
    })
    .join(', ');
}

