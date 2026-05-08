import { useState } from 'react';
import type { Exercise, Instance, Program } from '../types';
import {
  formatDuration,
  formatPlannedSets,
} from '../templates';
import { SetEditor } from './SetEditor';

type Props = {
  program: Program;
  exercise: Exercise;
  todaysInstances: Instance[];
  onLog: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
};

export function TodayExerciseCard({
  program,
  exercise,
  todaysInstances,
  onLog,
}: Props) {
  const done = todaysInstances.length > 0;
  // When done, default to a collapsed "logged" view; user can re-expand to
  // log another session (e.g. "I did one more round").
  const [editing, setEditing] = useState(false);
  const showEditor = !done || editing;

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
    <section className={`card today-card ${done ? 'today-card-done' : ''}`}>
      <div className="today-card-header">
        <div>
          <h2 className="today-card-name">
            {done && <span className="check" aria-hidden>✓ </span>}
            {exercise.name}
          </h2>
          <p className="muted small">
            {program.name} · target{' '}
            {formatPlannedSets(exercise.plannedSets, exercise.trackingType)}
            {goalSummary}
          </p>
        </div>
      </div>

      {done && !editing && (
        <>
          {todaysInstances.map((inst) => (
            <p key={inst.id} className="muted small">
              Logged: {summarizeSets(inst)}
            </p>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() => setEditing(true)}
          >
            Log another
          </button>
        </>
      )}

      {showEditor && (
        <SetEditor
          exercise={exercise}
          showNotes={false}
          saveLabel={done ? 'Save another' : 'Log it'}
          onLog={(sets, notes) => {
            onLog({
              programId: program.id,
              exerciseId: exercise.id,
              sets,
              notes: notes.trim() || undefined,
            });
            setEditing(false);
          }}
        />
      )}
    </section>
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
