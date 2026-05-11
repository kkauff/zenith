import { ChevronDown, ChevronRight, Heart, Moon } from 'lucide-react';
import type { Instance, Program, RestDay } from '../types';
import { dayName, exercisesForDay, instancesOnDay, restDayFor } from '../today';
import { Button } from './ui/button';

const REST_REASON_LABEL: Record<RestDay['reason'], string> = {
  sick: 'Sick',
  injured: 'Injured',
  other: 'Other',
};

type Props = {
  programs: Program[];
  instances: Instance[];
  restDays: RestDay[];
  today: Date;
  expanded: boolean;
  onToggle: () => void;
  // Rest-day actions — only consulted when today is a rest day. Inline in
  // the same panel so we don't render a second redundant card below.
  onEditRestDay: () => void;
  onResumeTraining: () => void;
};

export function TodayBox({
  programs,
  instances,
  restDays,
  today,
  expanded,
  onToggle,
  onEditRestDay,
  onResumeTraining,
}: Props) {
  const scheduled = exercisesForDay(programs, today);
  const todays = instancesOnDay(instances, today);
  // An exercise counts as "done today" if any instance for it was logged
  // today. Multiple instances of the same exercise still count once.
  const doneIds = new Set(todays.map((i) => i.exerciseId));
  const done = scheduled.filter((s) => doneIds.has(s.exercise.id)).length;
  const total = scheduled.length;
  const restDay = restDayFor(restDays, today);

  const Chevron = expanded ? ChevronDown : ChevronRight;

  // Rest day overrides everything else. Yellow theme, single panel: the
  // headline tap-target toggles open to reveal notes + edit/resume actions
  // so we don't duplicate the headline in a second card below.
  if (restDay) {
    return (
      <section className="overflow-hidden rounded-lg border border-rest/60 bg-rest/10 shadow-glow-rest transition-all hover:border-rest/80">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center gap-4 p-5 text-left transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rest/50"
        >
          <Heart
            aria-hidden
            className="size-7 flex-shrink-0 text-rest"
            fill="hsl(var(--rest))"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold tracking-tight text-rest text-glow-rest">
              Rest day
            </div>
            <div className="text-base font-semibold mt-0.5">
              Take care of yourself.
            </div>
            <div className="mt-1.5 truncate text-xs text-muted-foreground">
              {REST_REASON_LABEL[restDay.reason]} · {dayName(today)} won't
              count against adherence
            </div>
          </div>
          <Chevron
            aria-hidden
            className="size-7 text-rest flex-shrink-0 transition-transform"
          />
        </button>
        {expanded && (
          <div className="border-t border-rest/30 px-5 py-4">
            {restDay.notes ? (
              <p className="m-0 text-sm italic text-foreground/85">
                "{restDay.notes}"
              </p>
            ) : (
              <p className="m-0 text-xs text-muted-foreground">
                No notes added.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={onEditRestDay}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={onResumeTraining}>
                Resume training
              </Button>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (total === 0) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 rounded-lg border border-border/60 bg-card p-4 text-left transition-colors hover:border-primary/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Moon aria-hidden className="size-7 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xl font-bold tracking-tight">
            {dayName(today)}
          </div>
          <div className="text-xs text-muted-foreground">
            Nothing scheduled — rest day.
          </div>
        </div>
        <Chevron
          aria-hidden
          className="size-7 text-muted-foreground flex-shrink-0"
        />
      </button>
    );
  }

  // First 3 names, then "+N more" if longer.
  const previewNames = scheduled.slice(0, 3).map((s) => s.exercise.name);
  const more = scheduled.length - previewNames.length;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
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
      <Chevron
        aria-hidden
        className="size-7 text-primary flex-shrink-0 transition-transform"
      />
    </button>
  );
}
