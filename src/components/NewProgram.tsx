import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, X } from "lucide-react";
import type { Exercise, Program, RollupGoal } from "../types";
import { ExerciseForm } from "./ExerciseForm";
import {
  CATEGORIES,
  formatDuration,
  formatPlannedSets,
  formatSchedule,
} from "../templates";
import { summarizeRollup, summarizeRollupSchedule } from "../rollup";
import { RollupGoalForm } from "./RollupGoalForm";
import { Button } from "./ui/button";
import { Card, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

type Props = {
  onCreate: (program: Omit<Program, "id" | "createdAt">) => void;
  onCancel: () => void;
};

export function NewProgram({ onCreate, onCancel }: Props) {
  // Default to weightlifting since it's the only available category for now;
  // the picker will make this explicit when more open up.
  const [categoryKey, setCategoryKey] = useState<string>("weightlifting");
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rollupGoals, setRollupGoals] = useState<RollupGoal[]>([]);
  const [addingRollup, setAddingRollup] = useState(false);
  const [editingRollupId, setEditingRollupId] = useState<string | null>(null);

  // RollupGoalForm needs a Program to read the current exercise list off
  // of. Synthesize one from the in-progress form state.
  const draftProgram = useMemo<Program>(
    () => ({
      id: "__draft__",
      name: name || "New program",
      categoryKey,
      createdAt: 0,
      exercises,
      rollupGoals,
    }),
    [name, categoryKey, exercises, rollupGoals]
  );

  // Need a name plus *some* content — either an exercise or an aggregate
  // goal. Cardio programs commonly start with just "1 hr cardio / week"
  // and no specific exercises.
  const canSave =
    name.trim().length > 0 && (exercises.length > 0 || rollupGoals.length > 0);

  const submit = () => {
    if (!canSave) return;
    onCreate({
      name: name.trim(),
      categoryKey,
      exercises,
      rollupGoals: rollupGoals.length > 0 ? rollupGoals : undefined,
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
        <CardTitle className="mb-5">Program name</CardTitle>
        <Input
          placeholder="e.g. Race Prep, 5x5, Push/Pull/Legs"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Card>

      <Card>
        <CardTitle className="mb-5">Exercises</CardTitle>

        {exercises.length === 0 && !adding && (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            {categoryKey === "cardio"
              ? "Add a specific cardio exercise here, or skip ahead to an aggregate goal below."
              : "Add at least one exercise to save the program."}
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
                  ? ` · goal ${ex.goalWeight} lb`
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

        {!adding && editingId === null && (
          <Button onClick={() => setAdding(true)} className="mt-3 w-full">
            <Plus aria-hidden /> Add exercise
          </Button>
        )}
      </Card>

      {categoryKey === "cardio" && (
        <Card>
          <CardTitle className="mb-5">Cardio goals</CardTitle>

          {rollupGoals.length === 0 && !addingRollup && (
            <p className="italic text-sm text-muted-foreground py-2 m-0">
              Aggregate cardio goals — e.g. “5 mi of Running per week” or “6 hr
              of Cardio (Any) per week.”
            </p>
          )}

          {rollupGoals.length > 0 && (
            <ul className="flex flex-col gap-2 list-none m-0 p-0">
              {rollupGoals.map((g) => {
                if (editingRollupId === g.id) {
                  return (
                    <li key={g.id} className="rounded-lg bg-surface2 p-3.5">
                      <RollupGoalForm
                        program={draftProgram}
                        initial={g}
                        onSave={(updated, autoExercise) => {
                          if (autoExercise) {
                            setExercises([...exercises, autoExercise]);
                          }
                          setRollupGoals(
                            rollupGoals.map((x) =>
                              x.id === updated.id ? updated : x
                            )
                          );
                          setEditingRollupId(null);
                        }}
                        onCancel={() => setEditingRollupId(null)}
                      />
                    </li>
                  );
                }
                return (
                  <li
                    key={g.id}
                    className="flex items-start gap-2 rounded-lg bg-surface2 p-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div>
                        <strong className="font-semibold">
                          {summarizeRollup(g, draftProgram)}
                        </strong>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {summarizeRollupSchedule(g)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="iconSm"
                        onClick={() => setEditingRollupId(g.id)}
                        aria-label="Edit cardio goal"
                      >
                        <Pencil aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() =>
                          setRollupGoals(
                            rollupGoals.filter((x) => x.id !== g.id)
                          )
                        }
                        aria-label="Remove cardio goal"
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {addingRollup && (
            <div className="mt-3 rounded-lg bg-surface2 p-3.5">
              <RollupGoalForm
                program={draftProgram}
                onSave={(g, autoExercise) => {
                  if (autoExercise) {
                    setExercises([...exercises, autoExercise]);
                  }
                  setRollupGoals([...rollupGoals, g]);
                  setAddingRollup(false);
                }}
                onCancel={() => setAddingRollup(false)}
              />
            </div>
          )}

          {!addingRollup && editingRollupId === null && (
            <Button
              onClick={() => setAddingRollup(true)}
              className="mt-3 w-full"
            >
              <Plus aria-hidden /> Add cardio goal
            </Button>
          )}
        </Card>
      )}

      <Button onClick={submit} disabled={!canSave} className="w-full">
        Save program
      </Button>
    </div>
  );
}
