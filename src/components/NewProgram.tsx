import { useState } from 'react';
import { ArrowLeft, Pencil, Plus, X } from 'lucide-react';
import type { Exercise, Program } from '../types';
import { ExerciseForm } from './ExerciseForm';
import {
  CATEGORIES,
  formatDuration,
  formatPlannedSets,
  formatSchedule,
} from '../templates';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select } from './ui/select';

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
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
          New program
        </h1>
      </header>

      <Card>
        <CardTitle className="mb-2">Category</CardTitle>
        <Select
          value={categoryKey}
          onChange={(e) => setCategoryKey(e.target.value)}
          aria-label="Category"
        >
          {CATEGORIES.filter((c) => c.available).map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs text-muted-foreground m-0">
          More categories coming soon.
        </p>
      </Card>

      <Card>
        <CardTitle className="mb-2">Program name</CardTitle>
        <Input
          placeholder="e.g. 5x5, Push/Pull/Legs"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercises</CardTitle>
          {!adding && editingId === null && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus aria-hidden /> Add
            </Button>
          )}
        </CardHeader>

        {exercises.length === 0 && !adding && (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            Add at least one exercise to save the program.
          </p>
        )}

        {exercises.length > 0 && (
          <ul className="flex flex-col gap-2 list-none m-0 p-0">
            {exercises.map((ex) => {
              if (editingId === ex.id) {
                return (
                  <li key={ex.id} className="rounded-lg bg-surface2 p-3.5">
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
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      variant="secondary"
                      size="iconSm"
                      onClick={() => setEditingId(ex.id)}
                      aria-label={`Edit ${ex.name}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      aria-label={`Remove ${ex.name}`}
                      onClick={() => removeExercise(ex.id)}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {adding && (
          <div className="mt-3 rounded-lg bg-surface2 p-3.5">
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
      </Card>

      <Button onClick={submit} disabled={!canSave} className="w-full">
        Save program
      </Button>
    </div>
  );
}
