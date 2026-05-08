import { useState } from 'react';
import type { Exercise, Program } from '../types';
import { ExerciseForm } from './ExerciseForm';
import {
  CATEGORIES,
  formatDuration,
  formatPlannedSets,
  formatSchedule,
} from '../templates';

type Props = {
  onCreate: (program: Omit<Program, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
};

export function NewProgram({ onCreate, onCancel }: Props) {
  // Default to weightlifting since it's the only available category for now;
  // the picker will make this explicit when more open up.
  const [categoryKey, setCategoryKey] = useState<string>('weightlifting');
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && exercises.length > 0;

  const submit = () => {
    if (!canSave) return;
    onCreate({ name: name.trim(), categoryKey, exercises });
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((x) => x.id !== id));
  };

  const updateExercise = (ex: Exercise) => {
    setExercises(exercises.map((x) => (x.id === ex.id ? ex : x)));
    setEditingId(null);
  };

  return (
    <div className="stack">
      <header className="screen-header">
        <button type="button" className="secondary" onClick={onCancel}>
          ← Back
        </button>
        <h1>New program</h1>
      </header>

      <section className="card">
        <h2>Category</h2>
        <select
          value={categoryKey}
          onChange={(e) => setCategoryKey(e.target.value)}
          aria-label="Category"
        >
          {CATEGORIES.filter((c) => c.available).map((c) => (
            <option key={c.key} value={c.key}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <p className="muted small" style={{ marginTop: 8 }}>
          More categories coming soon.
        </p>
      </section>

      <section className="card">
        <h2>Program name</h2>
        <input
          placeholder="e.g. 5x5, Push/Pull/Legs"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Exercises</h2>
          {!adding && editingId === null && (
            <button type="button" onClick={() => setAdding(true)}>
              + Add
            </button>
          )}
        </div>

        {exercises.length === 0 && !adding && (
          <p className="empty">Add at least one exercise to save the program.</p>
        )}

        {exercises.length > 0 && (
          <ul className="list">
            {exercises.map((ex) => {
              if (editingId === ex.id) {
                return (
                  <li key={ex.id} className="inline-form-row">
                    <ExerciseForm
                      categoryKey={categoryKey}
                      initial={ex}
                      onSave={updateExercise}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                );
              }
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
                  </div>
                  <div className="exercise-row-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditingId(ex.id)}
                      aria-label={`Edit ${ex.name}`}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon"
                      aria-label={`Remove ${ex.name}`}
                      onClick={() => removeExercise(ex.id)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {adding && (
          <div className="inline-form">
            <ExerciseForm
              categoryKey={categoryKey}
              onSave={(ex) => {
                setExercises([...exercises, ex]);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </section>

      <button type="button" onClick={submit} disabled={!canSave}>
        Save program
      </button>
    </div>
  );
}
