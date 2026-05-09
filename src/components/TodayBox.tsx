import { ChevronRight, Moon } from 'lucide-react';
import type { Instance, Program } from '../types';
import { dayName, exercisesForDay, instancesOnDay } from '../today';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
  onOpen: () => void;
};

export function TodayBox({ programs, instances, today, onOpen }: Props) {
  const scheduled = exercisesForDay(programs, today);
  const todays = instancesOnDay(instances, today);
  // An exercise counts as "done today" if any instance for it was logged
  // today. Multiple instances of the same exercise still count once.
  const doneIds = new Set(todays.map((i) => i.exerciseId));
  const done = scheduled.filter((s) => doneIds.has(s.exercise.id)).length;
  const total = scheduled.length;

  if (total === 0) {
    return (
      <section className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4">
        <Moon aria-hidden className="size-7 text-primary" />
        <div>
          <div className="text-xl font-bold tracking-tight">{dayName(today)}</div>
          <div className="text-xs text-muted-foreground">
            Nothing scheduled — rest day.
          </div>
        </div>
      </section>
    );
  }

  // First 3 names, then "+N more" if longer.
  const previewNames = scheduled.slice(0, 3).map((s) => s.exercise.name);
  const more = scheduled.length - previewNames.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-lg border border-primary/40 bg-primary/10 p-5 text-left shadow-glow-primary-sm transition-all hover:border-primary/60 hover:shadow-glow-primary active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xl font-bold tracking-tight text-primary text-glow-primary">
          {dayName(today)} Goals
        </div>
        <div className="text-base font-semibold mt-0.5">
          {done} of {total} done
        </div>
        <div className="mt-1.5 truncate text-xs text-muted-foreground">
          {previewNames.join(' · ')}
          {more > 0 ? ` · +${more} more` : ''}
        </div>
      </div>
      <ChevronRight
        aria-hidden
        className="size-7 text-primary flex-shrink-0"
      />
    </button>
  );
}
