import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { Exercise, Instance, Program } from '../types';
import { formatDuration, formatPlannedSets } from '../templates';
import { useSettings } from '../settings';
import { SetEditor } from './SetEditor';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

type Props = {
  // Undefined for ad-hoc catalog picks not yet attached to any program.
  program?: Program;
  exercise: Exercise;
  todaysInstances: Instance[];
  onLog: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
  onUpdate: (instance: Instance) => void;
  onDelete: (id: string) => void;
  // Provided for unsaved ad-hoc picks; renders an X to discard before
  // logging. Hidden once the card has a saved instance.
  onRemove?: () => void;
  // Switches to the accent treatment so frequency-driven cards visually
  // separate from required day-scheduled cards.
  variant?: 'frequency';
  progressBadge?: string;
};

export function TodayExerciseCard({
  program,
  exercise,
  todaysInstances,
  onLog,
  onUpdate,
  onDelete,
  onRemove,
  variant,
  progressBadge,
}: Props) {
  const { weightUnit } = useSettings();
  const done = todaysInstances.length > 0;
  // Once done, collapse to a "logged" view; user re-expands to log
  // additional rounds.
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
      return ` · goal ${exercise.goalWeight} ${weightUnit}`;
    }
    return '';
  })();

  const subtitleBody = (() => {
    if (exercise.plannedSets.length > 0) {
      return `target ${formatPlannedSets(
        exercise.plannedSets,
        exercise.trackingType,
        weightUnit,
      )}`;
    }
    return exercise.trackingType === 'time' ? 'time' : 'weight + reps';
  })();

  const isFrequency = variant === 'frequency';

  return (
    <Card
      className={cn(
        isFrequency
          ? 'border-l-[3px] border-l-accent shadow-glow-accent-sm'
          : done && 'border-l-[3px] border-l-primary shadow-glow-primary-sm',
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 inline-flex flex-wrap items-center gap-1.5 text-base font-semibold normal-case tracking-normal text-foreground">
            {done && (
              <Check
                aria-hidden
                className={cn(
                  'size-4',
                  isFrequency ? 'text-accent' : 'text-primary',
                )}
              />
            )}
            {exercise.name}
            {progressBadge && (
              <span className="inline-flex items-center rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                {progressBadge}
              </span>
            )}
          </h2>
          <p className="m-0 text-xs text-muted-foreground">
            {program ? `${program.name} · ` : 'Ad-hoc · '}
            {subtitleBody}
            {goalSummary}
          </p>
        </div>
        {onRemove && !done && (
          <Button
            variant="ghost"
            size="iconSm"
            aria-label={`Remove ${exercise.name}`}
            onClick={onRemove}
          >
            <X aria-hidden />
          </Button>
        )}
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
                      exerciseName: inst.exerciseName ?? exercise.name,
                      trackingType:
                        inst.trackingType ?? exercise.trackingType,
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
              programId: program?.id,
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              trackingType: exercise.trackingType,
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
