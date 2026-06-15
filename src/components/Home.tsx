import { useState } from 'react';
import { CalendarClock, Heart, Plus, Undo2 } from 'lucide-react';
import type {
  Exercise,
  Instance,
  Program,
  Reschedule,
  RestDay,
} from '../types';
import {
  borrowableDays,
  dateKey,
  daysRemainingInWeek,
  exercisesForDay,
  frequencyGoalsForDay,
  greetingFor,
  instancesOnDay,
  restDayFor,
} from '../today';
import { useSettings } from '../settings';
import {
  GLOBAL_EXERCISES,
  exerciseFromGlobal,
} from '../exercise-library';
import { ActiveProgramsPanel } from './ActiveProgramsPanel';
import { type PickerOption } from './ExercisePicker';
import { LogAdhocPicker } from './LogAdhocPicker';
import { ProgressSummaryPanel } from './ProgressSummaryPanel';
import { RescheduleModal } from './RescheduleModal';
import { RestDayModal } from './RestDayModal';
import { TodayBox } from './TodayBox';
import { TodayExerciseCard } from './TodayExerciseCard';
import { Button } from './ui/button';
import { Card } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  restDays: RestDay[];
  reschedules: Reschedule[];
  today: Date;
  userName: string;
  onNew: () => void;
  onSeeProgress: () => void;
  onManagePrograms: () => void;
  onOpenProgram: (programId: string) => void;
  onLogInstance: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
  onUpdateProgram: (program: Program) => void;
  onSaveRestDay: (restDay: RestDay) => void;
  onDeleteRestDay: (date: string) => void;
  onSaveReschedule: (reschedule: Reschedule) => void;
  onDeleteReschedule: (fromDate: string) => void;
};

export function Home({
  programs,
  instances,
  restDays,
  reschedules,
  today,
  userName,
  onNew,
  onSeeProgress,
  onManagePrograms,
  onOpenProgram,
  onLogInstance,
  onUpdateInstance,
  onDeleteInstance,
  onUpdateProgram,
  onSaveRestDay,
  onDeleteRestDay,
  onSaveReschedule,
  onDeleteReschedule,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [restModalOpen, setRestModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const { weekStartDay } = useSettings();
  // Session-scoped — cleared on reload, which is fine since the user
  // re-picks for each session anyway.
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const greeting = greetingFor(today, userName);
  const todayRestDay = restDayFor(restDays, today);

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

  // Inactive programs stay in My Programs and keep their history but
  // don't feed today's plan or adherence — they only show up in views
  // that operate on raw historical instances.
  const activePrograms = programs.filter((p) => p.active);

  const scheduled = exercisesForDay(activePrograms, today, reschedules);
  // Pre-reschedule view of today's weekday. The push-a-day flow only
  // moves base-scheduled exercises, never previously pushed-in ones, so
  // it sources from this rather than `scheduled`.
  const baseScheduled = exercisesForDay(activePrograms, today);
  const todays = instancesOnDay(instances, today);
  const scheduledIds = new Set(scheduled.map((s) => s.exercise.id));

  const frequencyGoals = frequencyGoalsForDay(
    activePrograms,
    instances,
    today,
    weekStartDay,
  );
  const frequencyIds = new Set(frequencyGoals.map((f) => f.exercise.id));

  const borrowable = borrowableDays(
    activePrograms,
    instances,
    restDays,
    today,
    reschedules,
  );

  const todayKey = dateKey(today);
  const todayReschedule = reschedules.find((r) => r.fromDate === todayKey);
  const canReschedule =
    !todayRestDay &&
    baseScheduled.length > 0 &&
    !todayReschedule &&
    daysRemainingInWeek(today, weekStartDay).length > 0;
  const pushedTargetLabel = todayReschedule
    ? (() => {
        const [y, m, d] = todayReschedule.toDate.split('-').map(Number);
        if (!y || !m || !d) return todayReschedule.toDate;
        const t = new Date(y, m - 1, d);
        return t.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      })()
    : null;

  const programOptions: { program?: Program; exercise: Exercise }[] =
    activePrograms.flatMap((program) =>
      program.exercises
        .filter(
          (exercise) =>
            !scheduledIds.has(exercise.id) && !frequencyIds.has(exercise.id),
        )
        .map((exercise) => ({ program, exercise })),
    );

  // Dedup the global catalog against program exercise names so the picker
  // doesn't show the same name twice with different program tags.
  const programExerciseNames = new Set(
    activePrograms.flatMap((p) => p.exercises.map((e) => e.name.toLowerCase())),
  );

  const globalOptions = GLOBAL_EXERCISES.filter(
    (g) => !programExerciseNames.has(g.name.toLowerCase()),
  ).map((g) => ({
    program: undefined as Program | undefined,
    exercise: exerciseFromGlobal(g),
  }));

  const allAdhocOptions = [...programOptions, ...globalOptions];

  // Surface anything already logged today that isn't shown as scheduled
  // or pending-frequency, plus this session's picks.
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
        programs={activePrograms}
        instances={instances}
        restDays={restDays}
        reschedules={reschedules}
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
          {todayReschedule && pushedTargetLabel && (
            <div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent shadow-glow-accent-sm">
              <CalendarClock aria-hidden className="size-3.5" />
              <span className="flex-1">
                Pushed today's lift to{' '}
                <span className="font-semibold">{pushedTargetLabel}</span>.
              </span>
              <button
                type="button"
                onClick={() => onDeleteReschedule(todayReschedule.fromDate)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent/90 transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Undo2 aria-hidden className="size-3" />
                Undo
              </button>
            </div>
          )}
          {canReschedule && (
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(true)}
              className="group flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 bg-transparent px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <CalendarClock
                aria-hidden
                className="size-3.5 text-muted-foreground/70 group-hover:text-accent"
              />
              Reschedule? Push today's lift to another day this week.
            </button>
          )}
          {!todayReschedule && (
            <button
              type="button"
              onClick={() => setRestModalOpen(true)}
              className="group flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 bg-transparent px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-rest/50 hover:text-rest hover:text-glow-rest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rest/40"
            >
              <Heart
                aria-hidden
                className="size-3.5 text-muted-foreground/70 group-hover:text-rest group-hover:drop-glow-rest"
              />
              Not feeling well? Take a rest day.
            </button>
          )}
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
              onUpdateProgram={onUpdateProgram}
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
              onUpdateProgram={onUpdateProgram}
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
              onUpdateProgram={onUpdateProgram}
              onRemove={() =>
                setPickedIds((prev) =>
                  prev.filter((id) => id !== exercise.id),
                )
              }
            />
          ))}
          <LogAdhocPicker
            borrowable={borrowable}
            options={pickerOptions}
            onSelectExercise={(id) =>
              setPickedIds((prev) =>
                prev.includes(id) ? prev : [...prev, id],
              )
            }
            onSelectDay={(exerciseIds) =>
              setPickedIds((prev) =>
                Array.from(new Set([...prev, ...exerciseIds])),
              )
            }
          />
        </div>
      )}
      <ProgressSummaryPanel
        programs={activePrograms}
        instances={instances}
        restDays={restDays}
        reschedules={reschedules}
        today={today}
        onSeeMore={onSeeProgress}
      />
      <ActiveProgramsPanel
        programs={activePrograms}
        onOpen={(programId) => onOpenProgram(programId)}
        onManage={onManagePrograms}
      />
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
      <RescheduleModal
        open={rescheduleModalOpen}
        fromDate={today}
        exercises={baseScheduled}
        programs={activePrograms}
        reschedules={reschedules}
        onSave={(r) => {
          onSaveReschedule(r);
          setRescheduleModalOpen(false);
        }}
        onCancel={() => setRescheduleModalOpen(false)}
      />
    </div>
  );
}
