import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Exercise, Instance, Program } from '../types';
import {
  formatDuration,
  formatPlannedSets,
  formatSchedule,
  getCategory,
} from '../templates';
import { ExerciseForm } from './ExerciseForm';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

type Props = {
  program: Program;
  instances: Instance[];
  onBack: () => void;
  onLog: (exerciseId: string) => void;
  onUpdate: (program: Program) => void;
  onDelete: () => void;
};

export function ProgramDetail({
  program,
  instances,
  onBack,
  onLog,
  onUpdate,
  onDelete,
}: Props) {
  const category = getCategory(program.categoryKey);
  const CategoryIcon = category?.Icon;

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(program.name);
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

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
              onClick={() => {
                if (confirm(`Delete "${program.name}" and all its history?`)) {
                  onDelete();
                }
              }}
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
        <CardHeader>
          <CardTitle>Exercises</CardTitle>
          {!addingExercise && editingExerciseId === null && (
            <Button size="sm" onClick={() => setAddingExercise(true)}>
              <Plus aria-hidden /> Add
            </Button>
          )}
        </CardHeader>

        {program.exercises.length === 0 && !addingExercise && (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            No exercises yet. Tap “Add” to start.
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
              const goal =
                ex.trackingType === 'time' && ex.goalDurationSeconds !== undefined
                  ? ` · goal ${formatDuration(ex.goalDurationSeconds)}`
                  : ex.goalWeight !== undefined
                    ? ` · goal ${ex.goalWeight} lb`
                    : '';
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
                      {formatSchedule(ex.schedule.days)} ·{' '}
                      {formatPlannedSets(ex.plannedSets, ex.trackingType)}
                      {goal}
                    </div>
                    {last && (
                      <div className="mt-1 text-xs text-primary text-glow-primary">
                        Last: {summarizeSets(last)} ·{' '}
                        {new Date(last.loggedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" onClick={() => onLog(ex.id)}>
                      Log
                    </Button>
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
      </Card>

      <Card>
        <CardTitle className="mb-2">Recent sessions</CardTitle>
        {instances.length === 0 ? (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            No sessions logged yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 list-none m-0 p-0">
            {instances.slice(0, 20).map((inst) => {
              const ex = program.exercises.find((e) => e.id === inst.exerciseId);
              return (
                <li
                  key={inst.id}
                  className="rounded-lg bg-surface2 p-3.5"
                >
                  <div>
                    <strong className="font-semibold">
                      {ex?.name ?? 'Removed exercise'}
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
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function summarizeSets(inst: Instance): string {
  if (inst.sets.length === 0) return 'No sets recorded';
  return inst.sets
    .map((s) => {
      if (s.durationSeconds !== undefined) return formatDuration(s.durationSeconds);
      if (s.weight !== undefined && s.reps !== undefined) return `${s.weight}×${s.reps}`;
      return '—';
    })
    .join(', ');
}
