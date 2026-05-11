import { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import type {
  Exercise,
  Instance,
  LibraryExercise,
  Program,
  RestDay,
} from '../types';
import {
  exercisesForDay,
  frequencyGoalsForDay,
  greetingFor,
  instancesOnDay,
  restDayFor,
  rollupProgressForToday,
} from '../today';
import {
  GLOBAL_EXERCISES,
  exerciseFromGlobal,
} from '../exercise-library';
import { ActiveProgramsPanel } from './ActiveProgramsPanel';
import { ExercisePicker, type PickerOption } from './ExercisePicker';
import { ProgressSummaryPanel } from './ProgressSummaryPanel';
import { RestDayModal } from './RestDayModal';
import { RollupProgressRow } from './RollupProgressRow';
import { TodayBox } from './TodayBox';
import { TodayExerciseCard } from './TodayExerciseCard';
import { Button } from './ui/button';
import { Card } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
  restDays: RestDay[];
  today: Date;
  userName: string;
  onNew: () => void;
  onSeeProgress: () => void;
  onManagePrograms: () => void;
  onLogInstance: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
  onSaveRestDay: (restDay: RestDay) => void;
  onDeleteRestDay: (date: string) => void;
};

export function Home({
  programs,
  instances,
  library,
  restDays,
  today,
  userName,
  onNew,
  onSeeProgress,
  onManagePrograms,
  onLogInstance,
  onUpdateInstance,
  onDeleteInstance,
  onSaveRestDay,
  onDeleteRestDay,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [restModalOpen, setRestModalOpen] = useState(false);
  // Exercises the user has explicitly picked from the dropdown this session.
  // Combined with anything that was already logged ad-hoc today to decide
  // which non-scheduled cards to render. Cleared on reload — that's fine.
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const greeting = greetingFor(today, userName);
  const todayRestDay = restDayFor(restDays, today);

  // First-time empty state — still show the greeting; just point at program
  // creation instead of the today panel.
  if (programs.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <h2 className="text-2xl font-bold tracking-tight m-0">{greeting}!</h2>
        <Card className="text-center flex flex-col items-center gap-3 py-8">
          <h2 className="text-base font-semibold m-0">No programs yet</h2>
          <p className="text-sm text-muted-foreground m-0">
            Create a program to start tracking exercises and logging sessions.
          </p>
          <Button onClick={onNew}>
            <Plus aria-hidden /> New program
          </Button>
        </Card>
      </div>
    );
  }

  const scheduled = exercisesForDay(programs, today);
  const todays = instancesOnDay(instances, today);
  const scheduledIds = new Set(scheduled.map((s) => s.exercise.id));

  // Frequency goals with remaining target for the current period — these
  // appear under the scheduled cards, sorted by urgency. Once a goal is met
  // for the period it falls out of this list and back into the ad-hoc
  // picker like any other non-scheduled exercise.
  const frequencyGoals = frequencyGoalsForDay(programs, instances, today);
  const frequencyIds = new Set(frequencyGoals.map((f) => f.exercise.id));

  // Aggregate "X amount of [tag] per day/week/month" goals. Hidden once the
  // target's met for the relevant period.
  const rollupViews = rollupProgressForToday(
    programs,
    instances,
    library,
    today,
  );

  // Every (program, exercise) across all programs that isn't already shown
  // in the day panel (scheduled or pending frequency).
  const programOptions: { program?: Program; exercise: Exercise }[] =
    programs.flatMap((program) =>
      program.exercises
        .filter(
          (exercise) =>
            !scheduledIds.has(exercise.id) && !frequencyIds.has(exercise.id),
        )
        .map((exercise) => ({ program, exercise })),
    );

  // Names already covered by a program exercise — used to dedup global
  // catalog entries from the picker so the user doesn't see the same name
  // twice with different program tags.
  const programExerciseNames = new Set(
    programs.flatMap((p) => p.exercises.map((e) => e.name.toLowerCase())),
  );

  // Global-catalog entries the user hasn't already pulled into a program.
  // Picking one of these logs an instance with no programId.
  const globalOptions = GLOBAL_EXERCISES.filter(
    (g) => !programExerciseNames.has(g.name.toLowerCase()),
  ).map((g) => ({
    program: undefined as Program | undefined,
    exercise: exerciseFromGlobal(g),
  }));

  const allAdhocOptions = [...programOptions, ...globalOptions];

  // Auto-surface any exercise that's already been logged today and isn't
  // shown above (scheduled or pending frequency), plus anything the user
  // actively picked this session.
  const todaysExerciseIds = new Set(todays.map((i) => i.exerciseId));
  const visibleAdhocIds = new Set<string>(pickedIds);
  for (const id of todaysExerciseIds) {
    if (!scheduledIds.has(id) && !frequencyIds.has(id)) {
      visibleAdhocIds.add(id);
    }
  }
  const visibleAdhoc = allAdhocOptions.filter(({ exercise }) =>
    visibleAdhocIds.has(exercise.id),
  );

  const pickerOptions: PickerOption[] = allAdhocOptions
    .filter(({ exercise }) => !visibleAdhocIds.has(exercise.id))
    .map(({ program, exercise }) => ({
      id: exercise.id,
      name: exercise.name,
      programName: program ? program.name : 'From catalog',
    }));

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-2xl font-bold tracking-tight m-0">{greeting}!</h2>
      <TodayBox
        programs={programs}
        instances={instances}
        restDays={restDays}
        today={today}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        onEditRestDay={() => setRestModalOpen(true)}
        onResumeTraining={() =>
          todayRestDay && onDeleteRestDay(todayRestDay.date)
        }
      />
      {expanded && !todayRestDay && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setRestModalOpen(true)}
            className="group flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 bg-transparent px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-rest/50 hover:text-rest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rest/40"
          >
            <Heart
              aria-hidden
              className="size-3.5 text-muted-foreground/70 group-hover:text-rest"
            />
            Not feeling well? Take a rest day.
          </button>
          {scheduled.map(({ program, exercise }) => (
            <TodayExerciseCard
              key={exercise.id}
              program={program}
              exercise={exercise}
              todaysInstances={todays.filter(
                (i) => i.exerciseId === exercise.id,
              )}
              onLog={onLogInstance}
              onUpdate={onUpdateInstance}
              onDelete={onDeleteInstance}
            />
          ))}
          {frequencyGoals.map((g) => (
            <TodayExerciseCard
              key={`freq-${g.program.id}-${g.exercise.id}`}
              program={g.program}
              exercise={g.exercise}
              todaysInstances={todays.filter(
                (i) => i.exerciseId === g.exercise.id,
              )}
              onLog={onLogInstance}
              onUpdate={onUpdateInstance}
              onDelete={onDeleteInstance}
              variant="frequency"
              progressBadge={`${g.completedInPeriod} / ${g.target} ${g.period}`}
            />
          ))}
          {visibleAdhoc.map(({ program, exercise }) => (
            <TodayExerciseCard
              key={`${program?.id ?? 'catalog'}-${exercise.id}`}
              program={program}
              exercise={exercise}
              todaysInstances={todays.filter(
                (i) => i.exerciseId === exercise.id,
              )}
              onLog={onLogInstance}
              onUpdate={onUpdateInstance}
              onDelete={onDeleteInstance}
              onRemove={() =>
                setPickedIds((prev) =>
                  prev.filter((id) => id !== exercise.id),
                )
              }
            />
          ))}
          {rollupViews.length > 0 && (
            <div className="space-y-2 pt-1">
              {rollupViews.map((v) => (
                <RollupProgressRow
                  key={`${v.program.id}-${v.goal.id}`}
                  view={v}
                />
              ))}
            </div>
          )}
          <ExercisePicker
            options={pickerOptions}
            onSelect={(id) => setPickedIds((prev) => [...prev, id])}
          />
        </div>
      )}
      <ProgressSummaryPanel
        programs={programs}
        instances={instances}
        restDays={restDays}
        today={today}
        onSeeMore={onSeeProgress}
      />
      <ActiveProgramsPanel programs={programs} onManage={onManagePrograms} />
      <RestDayModal
        open={restModalOpen}
        date={today}
        existing={todayRestDay}
        onSave={(rd) => {
          onSaveRestDay(rd);
          setRestModalOpen(false);
        }}
        onCancel={() => setRestModalOpen(false)}
      />
    </div>
  );
}
