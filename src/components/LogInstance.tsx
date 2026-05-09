import { ArrowLeft } from 'lucide-react';
import type { Exercise, Instance, Program } from '../types';
import { formatDuration, formatPlannedSets } from '../templates';
import { SetEditor } from './SetEditor';
import { Button } from './ui/button';
import { Card } from './ui/card';

type Props = {
  program: Program;
  exercise: Exercise;
  onSave: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
  onCancel: () => void;
};

export function LogInstance({ program, exercise, onSave, onCancel }: Props) {
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
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          <ArrowLeft aria-hidden /> Cancel
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
          Log session
        </h1>
      </header>

      <Card>
        <h2 className="text-base font-semibold m-0">{exercise.name}</h2>
        <p className="text-xs text-muted-foreground m-0">
          {program.name} · target{' '}
          {formatPlannedSets(exercise.plannedSets, exercise.trackingType)}
          {goalSummary}
        </p>

        <SetEditor
          exercise={exercise}
          saveLabel="Save session"
          onLog={(sets, notes) =>
            onSave({
              programId: program.id,
              exerciseId: exercise.id,
              sets,
              notes: notes.trim() || undefined,
            })
          }
        />
      </Card>
    </div>
  );
}
