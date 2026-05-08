import type { Exercise, Instance, Program } from '../types';
import { formatDuration, formatPlannedSets } from '../templates';
import { SetEditor } from './SetEditor';

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
    <div className="stack">
      <header className="screen-header">
        <button type="button" className="secondary" onClick={onCancel}>
          ← Cancel
        </button>
        <h1>Log session</h1>
      </header>

      <section className="card">
        <h2>{exercise.name}</h2>
        <p className="muted small">
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
      </section>
    </div>
  );
}
