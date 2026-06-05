import { useEffect } from 'react';
import { CalendarClock } from 'lucide-react';
import type { Program, Reschedule } from '../types';
import {
  type ScheduledExercise,
  dateKey,
  daysRemainingInWeek,
  exercisesForDay,
} from '../today';
import { useSettings } from '../settings';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const DOW_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

type Props = {
  open: boolean;
  fromDate: Date;
  // Snapshotted by the caller at open time so the saved Reschedule
  // captures the right ids even if the program changes mid-flow.
  exercises: ScheduledExercise[];
  programs: Program[];
  reschedules: Reschedule[];
  onSave: (reschedule: Reschedule) => void;
  onCancel: () => void;
};

export function RescheduleModal({
  open,
  fromDate,
  exercises,
  programs,
  reschedules,
  onSave,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  const { weekStartDay } = useSettings();
  if (!open) return null;

  const candidateDays = daysRemainingInWeek(fromDate, weekStartDay);
  const exerciseIds = exercises.map((e) => e.exercise.id);

  const pick = (target: Date) => {
    onSave({
      fromDate: dateKey(fromDate),
      toDate: dateKey(target),
      exerciseIds,
      createdAt: Date.now(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-accent/40 bg-card p-5 shadow-glow-accent-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock aria-hidden className="size-5 text-accent" />
          <h2
            id="reschedule-title"
            className="m-0 text-base font-semibold text-accent text-glow-accent"
          >
            Push to another day
          </h2>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
          {' '}will move off today and onto the day you pick. Only days later
          this week are available.
        </p>

        {candidateDays.length === 0 ? (
          <p className="m-0 text-sm italic text-muted-foreground">
            No days left this week — take a rest day instead.
          </p>
        ) : (
          <ul className="space-y-2">
            {candidateDays.map((day) => (
              <DayOption
                key={day.toISOString()}
                day={day}
                programs={programs}
                reschedules={reschedules}
                onPick={() => pick(day)}
              />
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function DayOption({
  day,
  programs,
  reschedules,
  onPick,
}: {
  day: Date;
  programs: Program[];
  reschedules: Reschedule[];
  onPick: () => void;
}) {
  const dayExercises = exercisesForDay(programs, day, reschedules);
  const previewNames = dayExercises.slice(0, 3).map((s) => s.exercise.name);
  const more = dayExercises.length - previewNames.length;
  const subtitle =
    dayExercises.length === 0
      ? 'Nothing scheduled'
      : `${previewNames.join(' · ')}${more > 0 ? ` · +${more} more` : ''}`;
  const monthDay = day.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          'flex w-full items-start gap-3 rounded-md border border-border bg-surface2 p-3 text-left transition-colors hover:border-accent/50 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {DOW_NAMES[day.getDay()]}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {monthDay}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </div>
        </div>
      </button>
    </li>
  );
}
