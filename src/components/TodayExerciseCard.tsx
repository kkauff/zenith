import { useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import type { Exercise, Instance, Program } from '../types';
import { formatDuration, formatPlannedSets } from '../templates';
import { SetEditor } from './SetEditor';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

type Props = {
  program: Program;
  exercise: Exercise;
  todaysInstances: Instance[];
  onLog: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
  onUpdate: (instance: Instance) => void;
  onDelete: (id: string) => void;
};

export function TodayExerciseCard({
  program,
  exercise,
  todaysInstances,
  onLog,
  onUpdate,
  onDelete,
}: Props) {
  const done = todaysInstances.length > 0;
  // When done, default to a collapsed "logged" view; user can re-expand to
  // log another session (e.g. "I did one more round").
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const showAdd = !done || adding;

  const goalSummary = (() => {
    if (
      exercise.trackingType === 'time' &&
      exercise.goalDurationSeconds !== undefined
    ) {
      return ` · goal ${formatDuration(exercise.goalDurationSeconds)}`;
    }
    if (exercise.trackingType === 'weight' && exercise.goalWeight !== undefined) {
      return ` · goal ${exercise.goalWeight} lb`;
    }
    return '';
  })();

  return (
    <Card
      className={cn(
        done &&
          'border-l-[3px] border-l-primary shadow-glow-primary-sm',
      )}
    >
      <div className="mb-2.5">
        <h2 className="m-0 inline-flex items-center gap-1.5 text-base font-semibold normal-case tracking-normal text-foreground">
          {done && <Check aria-hidden className="size-4 text-primary" />}
          {exercise.name}
        </h2>
        <p className="m-0 text-xs text-muted-foreground">
          {program.name} · target{' '}
          {formatPlannedSets(exercise.plannedSets, exercise.trackingType)}
          {goalSummary}
        </p>
      </div>

      {done && !adding && (
        <div className="space-y-2">
          {todaysInstances.map((inst) =>
            editingId === inst.id ? (
              <div key={inst.id} className="rounded-lg bg-surface2 p-3">
                <SetEditor
                  exercise={exercise}
                  initial={inst}
                  showNotes={false}
                  saveLabel="Save changes"
                  onCancel={() => setEditingId(null)}
                  onLog={(sets, notes) => {
                    onUpdate({
                      ...inst,
                      sets,
                      notes: notes.trim() || undefined,
                    });
                    setEditingId(null);
                  }}
                />
              </div>
            ) : (
              <div
                key={inst.id}
                className="flex items-center gap-2"
              >
                <p className="flex-1 text-xs text-muted-foreground m-0">
                  Logged: {summarizeSets(inst)}
                </p>
                <Button
                  variant="secondary"
                  size="iconSm"
                  aria-label="Edit logged session"
                  onClick={() => setEditingId(inst.id)}
                >
                  <Pencil aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Delete logged session"
                  onClick={() => {
                    if (confirm('Delete this logged session?')) {
                      onDelete(inst.id);
                    }
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ),
          )}
          {editingId === null && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAdding(true)}
            >
              Log another
            </Button>
          )}
        </div>
      )}

      {showAdd && (
        <SetEditor
          exercise={exercise}
          showNotes={false}
          saveLabel={done ? 'Save another' : 'Log it'}
          onCancel={done ? () => setAdding(false) : undefined}
          onLog={(sets, notes) => {
            onLog({
              programId: program.id,
              exerciseId: exercise.id,
              sets,
              notes: notes.trim() || undefined,
            });
            setAdding(false);
          }}
        />
      )}
    </Card>
  );
}

function summarizeSets(inst: Instance): string {
  return inst.sets
    .map((s) => {
      if (s.durationSeconds !== undefined) return formatDuration(s.durationSeconds);
      if (s.weight !== undefined && s.reps !== undefined)
        return `${s.weight}×${s.reps}`;
      return '—';
    })
    .join(', ');
}
