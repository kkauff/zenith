import { useState } from 'react';
import type { Exercise, Instance, Program } from '../types';
import {
  formatDuration,
  formatPlannedSets,
  formatSchedule,
  getCategory,
} from '../templates';
import { ExerciseForm } from './ExerciseForm';

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
    <>
      <header className="screen-header">
        <button type="button" className="secondary" onClick={onBack}>
          ← Back
        </button>
        {editingName ? (
          <input
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
          <h1>{program.name}</h1>
        )}
        {editingName ? (
          <>
            <button type="button" onClick={saveName}>
              Save
            </button>
            <button type="button" className="secondary" onClick={cancelRename}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setDraftName(program.name);
                setEditingName(true);
              }}
              aria-label="Rename program"
            >
              ✎
            </button>
            <button
              type="button"
              className="secondary danger"
              onClick={() => {
                if (confirm(`Delete "${program.name}" and all its history?`)) {
                  onDelete();
                }
              }}
              aria-label="Delete program"
            >
              ✕
            </button>
          </>
        )}
      </header>

      <p className="muted">
        {category?.icon} {category?.name ?? program.categoryKey}
      </p>

      <section className="card">
        <div className="card-header">
          <h2>Exercises</h2>
          {!addingExercise && editingExerciseId === null && (
            <button type="button" onClick={() => setAddingExercise(true)}>
              + Add
            </button>
          )}
        </div>

        {program.exercises.length === 0 && !addingExercise && (
          <p className="empty">No exercises yet. Tap “+ Add” to start.</p>
        )}

        {program.exercises.length > 0 && (
          <ul className="list">
            {program.exercises.map((ex) => {
              if (editingExerciseId === ex.id) {
                return (
                  <li key={ex.id} className="inline-form-row">
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
                <li key={ex.id} className="exercise-row">
                  <div className="exercise-row-main">
                    <div>
                      <strong>{ex.name}</strong>
                    </div>
                    <div className="muted small">
                      {formatSchedule(ex.schedule.days)} ·{' '}
                      {formatPlannedSets(ex.plannedSets, ex.trackingType)}
                      {goal}
                    </div>
                    {last && (
                      <div className="muted small last-session">
                        Last: {summarizeSets(last)} ·{' '}
                        {new Date(last.loggedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="exercise-row-actions">
                    <button onClick={() => onLog(ex.id)}>Log</button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditingExerciseId(ex.id)}
                      aria-label={`Edit ${ex.name}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon"
                      onClick={() => removeExercise(ex.id)}
                      aria-label={`Remove ${ex.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {addingExercise && (
          <div className="inline-form">
            <ExerciseForm
              categoryKey={program.categoryKey}
              onSave={addExercise}
              onCancel={() => setAddingExercise(false)}
            />
          </div>
        )}
      </section>

      <section className="card">
        <h2>Recent sessions</h2>
        {instances.length === 0 ? (
          <p className="empty">No sessions logged yet.</p>
        ) : (
          <ul className="list">
            {instances.slice(0, 20).map((inst) => {
              const ex = program.exercises.find((e) => e.id === inst.exerciseId);
              return (
                <li key={inst.id}>
                  <div>
                    <div>
                      <strong>{ex?.name ?? 'Removed exercise'}</strong>
                    </div>
                    <div className="muted small">
                      {summarizeSets(inst)} ·{' '}
                      {new Date(inst.loggedAt).toLocaleDateString()}
                    </div>
                    {inst.notes && (
                      <div className="muted small">“{inst.notes}”</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
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
