import { useState } from "react";
import { ArrowLeft, Pencil, Plus, X } from "lucide-react";
import type { Exercise, Program } from "../types";
import { ExerciseForm } from "./ExerciseForm";
import {
  CATEGORIES,
  formatDuration,
  formatPlannedSets,
  formatSchedule,
} from "../templates";
import { useSettings } from "../settings";
import { Button } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";

type Props = {
  onCreate: (program: Omit<Program, "id" | "createdAt">) => void;
  onCancel: () => void;
};

export function NewProgram({ onCreate, onCancel }: Props) {
  const { weightUnit } = useSettings();
  // Default to weightlifting since it's the only available category for now;
  // the picker will make this explicit when more open up.
  const [categoryKey, setCategoryKey] = useState<string>("weightlifting");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // New programs default to inactive so the user makes an explicit choice
  // to bring them into the daily plan. Activating later is one tap from
  // either My Programs or the program detail page.
  const [active, setActive] = useState(false);

  const isRehab = categoryKey === "rehab";
  const canSave =
    name.trim().length > 0 &&
    exercises.length > 0 &&
    (!isRehab || purpose.trim().length > 0);

  const submit = () => {
    if (!canSave) return;
    onCreate({
      name: name.trim(),
      categoryKey,
      exercises,
      active,
      purpose: isRehab ? purpose.trim() : undefined,
    });
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
        <CardTitle className="mb-5">Category</CardTitle>
        <Select
          value={categoryKey}
          onChange={(e) => {
            setCategoryKey(e.target.value);
            setPurpose("");
          }}
          aria-label="Category"
        >
          {CATEGORIES.filter((c) => c.available).map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </Select>
      </Card>

      {isRehab && (
        <Card>
          <CardTitle className="mb-5">Rehab focus</CardTitle>
          <label className="flex flex-col gap-1.5">
            <Label>What are you rehabbing? (required)</Label>
            <Input
              placeholder="e.g. Right knee tracking"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </label>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-5">Program name</CardTitle>
        <Input
          placeholder="e.g. 5x5, Push/Pull/Legs, Hypertrophy"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Card>

      <Card>
        <CardTitle className="mb-5">Exercises</CardTitle>

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
                ex.trackingType === "time" &&
                ex.goalDurationSeconds !== undefined
                  ? ` · goal ${formatDuration(ex.goalDurationSeconds)}`
                  : ex.goalWeight !== undefined
                  ? ` · goal ${ex.goalWeight} ${weightUnit}`
                  : "";
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
                      {formatSchedule(ex.schedule)} ·{" "}
                      {formatPlannedSets(
                        ex.plannedSets,
                        ex.trackingType,
                        weightUnit,
                      )}
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

        {!adding && editingId === null && (
          <Button onClick={() => setAdding(true)} className="mt-3 w-full">
            <Plus aria-hidden /> Add exercise
          </Button>
        )}
      </Card>

      <Card>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-primary"
          />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Activate now</span>
            <span className="block text-xs text-muted-foreground">
              Activate to add this program to your daily tasks. Leave off if
              you're drafting it for later — you can flip it on any time from
              My Programs.
            </span>
          </span>
        </label>
      </Card>

      <Button onClick={submit} disabled={!canSave} className="w-full">
        Save program
      </Button>
    </div>
  );
}
