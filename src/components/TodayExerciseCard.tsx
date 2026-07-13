import { useState } from 'react';
import { CalendarPlus, Check, Pencil, Repeat, Trash2, Undo2, X } from 'lucide-react';
import type { Exercise, Instance, InstanceSet, Program } from '../types';
import { formatDuration, formatPlannedSets } from '../templates';
import { useSettings } from '../settings';
import {
  applySuggestion,
  computeSuggestion,
} from '../program-suggestion';
import {
  exerciseFromGlobal,
  substitutesFor,
  type GlobalExercise,
} from '../exercise-library';
import { SetEditor } from './SetEditor';
import { SubstituteModal } from './SubstituteModal';
import { UpdateProgramModal } from './UpdateProgramModal';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tooltip } from './ui/tooltip';
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
  // Enables the "Update program?" prompt when a logged session diverges
  // from plannedSets. Omit for ad-hoc cards to keep the prompt hidden.
  onUpdateProgram?: (program: Program) => void;
  // Shows the "Add to program?" action; parent owns eligibility. Omit to hide.
  onAddToProgram?: () => void;
  weekdayLabel?: string;
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
  onUpdateProgram,
  onAddToProgram,
  weekdayLabel,
  variant,
  progressBadge,
}: Props) {
  const { weightUnit } = useSettings();
  const done = todaysInstances.length > 0;
  // Once done, collapse to a "logged" view; user re-expands to log
  // additional rounds.
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Drives the "Update program?" prompt; cleared on confirm, cancel, or
  // when the user starts a new "log another" round.
  const [lastLoggedSets, setLastLoggedSets] = useState<InstanceSet[] | null>(
    null,
  );
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  // Today-only equipment swap: while set, the log form and header reflect
  // the substitute, but the logged instance stays attributed to this slot's
  // exerciseId so "done" and adherence still count. Cleared after logging.
  const [substitute, setSubstitute] = useState<GlobalExercise | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);
  // Suppresses the "Update program?" prompt after a substituted log — hotel
  // dumbbell numbers shouldn't be suggested back into the home program.
  const [lastLoggedSubstitute, setLastLoggedSubstitute] = useState(false);
  const showAdd = !done || adding;

  const candidates = substitutesFor(exercise);
  // The exercise the log form edits against — the substitute's tracking type
  // and (empty) planned sets when swapped, otherwise the real one.
  const activeExercise = substitute ? exerciseFromGlobal(substitute) : exercise;

  const suggestedSets =
    program && onUpdateProgram && lastLoggedSets && !lastLoggedSubstitute
      ? computeSuggestion(
          exercise.plannedSets,
          lastLoggedSets,
          exercise.trackingType,
        )
      : null;

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
    if (exercise.trackingType === 'time') return 'time';
    if (exercise.trackingType === 'band') return 'band + reps';
    if (exercise.trackingType === 'count') return 'reps';
    return 'weight + reps';
  })();

  const isFrequency = variant === 'frequency';

  const categoryBorder = program
    ? program.categoryKey === 'warmup'
      ? 'border-l-[3px] border-l-warmup'
      : program.categoryKey === 'rehab'
        ? 'border-l-[3px] border-l-rehab'
        : 'border-l-[3px] border-l-accent'
    : '';

  const categoryGlow = program
    ? program.categoryKey === 'warmup'
      ? 'shadow-glow-warmup-sm'
      : program.categoryKey === 'rehab'
        ? 'shadow-glow-rehab-sm'
        : 'shadow-glow-accent-sm'
    : '';

  return (
    <Card
      className={cn(
        categoryBorder,
        (done || isFrequency) && categoryGlow,
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
                  program?.categoryKey === 'warmup'
                    ? 'text-warmup'
                    : program?.categoryKey === 'rehab'
                      ? 'text-rehab'
                      : 'text-accent',
                )}
              />
            )}
            {substitute ? substitute.name : exercise.name}
            {progressBadge && (
              <span className="inline-flex items-center rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                {progressBadge}
              </span>
            )}
          </h2>
          <p className="m-0 text-xs text-muted-foreground">
            {substitute ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <Repeat aria-hidden className="size-3" />
                Substituted for {exercise.name}
              </span>
            ) : (
              <>
                {program ? `${program.name} · ` : 'Ad-hoc · '}
                {subtitleBody}
                {goalSummary}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {substitute ? (
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Undo substitution"
              onClick={() => setSubstitute(null)}
            >
              <Undo2 aria-hidden />
            </Button>
          ) : (
            !done &&
            candidates.length > 0 && (
              <Tooltip
                label="Traveling? Substitute in another exercise."
                side="bottom"
                align="end"
              >
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={`Substitute ${exercise.name}`}
                  onClick={() => setSubModalOpen(true)}
                >
                  <Repeat aria-hidden />
                </Button>
              </Tooltip>
            )
          )}
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLastLoggedSets(null);
                  setLastLoggedSubstitute(false);
                  setAdding(true);
                }}
              >
                Log another
              </Button>
              {suggestedSets && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setUpdateModalOpen(true)}
                  className="border-primary/40 text-primary hover:border-primary hover:bg-primary/10"
                >
                  <Pencil aria-hidden />
                  Update program?
                </Button>
              )}
              {onAddToProgram && (
                <Tooltip
                  label={
                    program
                      ? `Schedule ${exercise.name} on ${weekdayLabel}s in ${program.name}`
                      : `Add ${exercise.name} to a program on ${weekdayLabel}s`
                  }
                  side="bottom"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onAddToProgram}
                    className="border-accent/40 text-accent hover:border-accent hover:bg-accent/10"
                  >
                    <CalendarPlus aria-hidden />
                    Add to program?
                  </Button>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <SetEditor
          // Keyed so switching to/from a substitute resets the draft sets to
          // the active exercise's defaults instead of reusing the prior ones.
          key={substitute ? substitute.slug : 'original'}
          exercise={activeExercise}
          showNotes={false}
          saveLabel={done ? 'Save another' : 'Log it'}
          onCancel={done ? () => setAdding(false) : undefined}
          onLog={(sets, notes) => {
            onLog({
              programId: program?.id,
              // Always the slot's id so "done" + adherence count, even when
              // a substitute was logged.
              exerciseId: exercise.id,
              exerciseName: activeExercise.name,
              trackingType: activeExercise.trackingType,
              sets,
              notes: notes.trim() || undefined,
            });
            setLastLoggedSets(sets);
            setLastLoggedSubstitute(substitute !== null);
            setSubstitute(null);
            setAdding(false);
          }}
        />
      )}
      <SubstituteModal
        open={subModalOpen}
        exercise={exercise}
        candidates={candidates}
        onPick={(g) => {
          setSubstitute(g);
          setSubModalOpen(false);
          // Expand the log form so the swapped exercise is ready to log.
          if (done) setAdding(true);
        }}
        onCancel={() => setSubModalOpen(false)}
      />
      {program && onUpdateProgram && suggestedSets && (
        <UpdateProgramModal
          open={updateModalOpen}
          program={program}
          exercise={exercise}
          suggestedSets={suggestedSets}
          onCancel={() => {
            setUpdateModalOpen(false);
            setLastLoggedSets(null);
          }}
          onConfirm={(sets) => {
            onUpdateProgram(applySuggestion(program, exercise.id, sets));
            setUpdateModalOpen(false);
            setLastLoggedSets(null);
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
      if (s.bandColor !== undefined && s.reps !== undefined) return `${s.bandColor}×${s.reps}`;
      if (s.weight !== undefined && s.reps !== undefined) return `${s.weight}×${s.reps}`;
      if (s.reps !== undefined) return String(s.reps);
      return '—';
    })
    .join(', ');
}
