import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  Instance,
  InstanceDraft,
  Program,
  Reschedule,
  RestDay,
} from '../types';
import {
  adherenceBreakdown,
  dateKey,
  exercisesForDay,
  instancesOnDay,
  isSameDay,
  restDayFor,
  startOfDay,
  startOfTrailingWindow,
} from '../today';
import { Card, CardTitle } from './ui/card';
import { DayEditModal } from './DayEditModal';
import { SegmentedToggle } from './SegmentedToggle';
import { cn } from '@/lib/utils';

const WINDOW_DAYS = 30;

type View = 'exercise' | 'day';

type LogInstance = (fields: InstanceDraft) => void;

type Props = {
  programs: Program[];
  instances: Instance[];
  restDays: RestDay[];
  reschedules: Reschedule[];
  today: Date;
  onLogInstance: LogInstance;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
};

// Round to 1 decimal, drop a trailing ".0" — frequency goals prorate to
// fractional expectations (3×/week → 12.9 over 30 days), so a whole-number
// display would hide why a diligent week still reads 95%.
function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

// Half a session of slack before we call a row "short" — keeps rounding
// noise (12 vs 12.0001) from flagging an otherwise-met exercise.
const SHORTFALL_EPSILON = 0.5;

export function AdherenceBreakdown({
  programs,
  instances,
  restDays,
  reschedules,
  today,
  onLogInstance,
  onUpdateInstance,
  onDeleteInstance,
}: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('exercise');

  // Match the adherence rings: only currently-active programs owe work.
  const activePrograms = useMemo(
    () => programs.filter((p) => p.active),
    [programs],
  );

  const exerciseRows = useMemo(() => {
    const start = startOfTrailingWindow(today, WINDOW_DAYS);
    return adherenceBreakdown(
      activePrograms,
      instances,
      restDays,
      start,
      today,
      reschedules,
      today,
    )
      .map((r) => ({ ...r, shortfall: r.expected - r.completed }))
      .sort((a, b) => b.shortfall - a.shortfall);
  }, [activePrograms, instances, restDays, reschedules, today]);

  const shortCount = exerciseRows.filter(
    (r) => r.shortfall > SHORTFALL_EPSILON,
  ).length;

  // Don't render at all when nothing is scheduled in the window.
  if (exerciseRows.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          <CardTitle>History</CardTitle>
          {shortCount > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              {shortCount} short
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 flex-shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <>
          <SegmentedToggle
            className="self-start"
            ariaLabel="Breakdown view"
            value={view}
            onChange={setView}
            options={[
              { value: 'exercise', label: 'By exercise' },
              { value: 'day', label: 'By day' },
            ]}
          />

          {view === 'exercise' ? (
            <ByExerciseView rows={exerciseRows} />
          ) : (
            <ByDayView
              programs={programs}
              activePrograms={activePrograms}
              instances={instances}
              restDays={restDays}
              reschedules={reschedules}
              today={today}
              onLogInstance={onLogInstance}
              onUpdateInstance={onUpdateInstance}
              onDeleteInstance={onDeleteInstance}
            />
          )}
        </>
      )}
    </Card>
  );
}

type ExerciseRow = {
  program: Program;
  exercise: { id: string; name: string };
  expected: number;
  completed: number;
  shortfall: number;
};

function ByExerciseView({ rows }: { rows: ExerciseRow[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const pct = r.expected > 0 ? r.completed / r.expected : 0;
        const short = r.shortfall > SHORTFALL_EPSILON;
        return (
          <div key={`${r.program.id}:${r.exercise.id}`} className="text-xs">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{r.exercise.name}</span>
              <span className="flex-shrink-0 tabular-nums text-muted-foreground">
                {fmt(r.completed)} / {fmt(r.expected)}
                {short && (
                  <span className="ml-1.5 text-destructive">
                    −{fmt(r.shortfall)}
                  </span>
                )}
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-sm bg-surface2/40">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-sm',
                  short ? 'bg-destructive/70' : 'bg-primary',
                )}
                style={{ width: `${Math.min(pct, 1) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="m-0 text-[10px] leading-relaxed text-muted-foreground">
        Expected is prorated over the trailing 30 days, so weekly goals target
        ~4.3× their weekly number and rarely land on a whole session.
      </p>
    </div>
  );
}

type DayRow = {
  date: Date;
  key: string;
  logged: Instance[];
  // `scheduledDone` counts scheduled exercises actually logged that day (not
  // total sessions — ad-hoc/frequency logs don't cover a missed scheduled
  // one), so the row's fraction and "Missed" badge match the modal's
  // "Not logged" list.
  scheduledCount: number;
  scheduledDone: number;
  isRest: boolean;
};

function ByDayView({
  programs,
  activePrograms,
  instances,
  restDays,
  reschedules,
  today,
  onLogInstance,
  onUpdateInstance,
  onDeleteInstance,
}: {
  programs: Program[];
  activePrograms: Program[];
  instances: Instance[];
  restDays: RestDay[];
  reschedules: Reschedule[];
  today: Date;
  onLogInstance: LogInstance;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
}) {
  const [editKey, setEditKey] = useState<string | null>(null);

  // Most-recent-first list of the trailing window, keeping only days that had
  // scheduled work or a logged session — empty unscheduled days are noise.
  const days = useMemo<DayRow[]>(() => {
    const out: DayRow[] = [];
    const base = startOfDay(today);
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const date = new Date(base);
      date.setDate(date.getDate() - i);
      const logged = instancesOnDay(instances, date);
      const scheduled = exercisesForDay(activePrograms, date, reschedules);
      const loggedIds = new Set(logged.map((inst) => inst.exerciseId));
      const scheduledDone = scheduled.filter((s) =>
        loggedIds.has(s.exercise.id),
      ).length;
      const isRest = restDayFor(restDays, date) !== undefined;
      if (logged.length === 0 && scheduled.length === 0) continue;
      out.push({
        date,
        key: dateKey(date),
        logged,
        scheduledCount: scheduled.length,
        scheduledDone,
        isRest,
      });
    }
    return out;
  }, [activePrograms, instances, restDays, reschedules, today]);

  if (days.length === 0) {
    return (
      <p className="m-0 py-2 text-xs italic text-muted-foreground">
        No scheduled or logged sessions in the last 30 days.
      </p>
    );
  }

  const editDay = days.find((d) => d.key === editKey) ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      {days.map((d) => {
        // Today isn't over yet — don't flag it as missed just because the
        // day's scheduled work is still outstanding.
        const isToday = isSameDay(d.date, today);
        const missed =
          !d.isRest && !isToday && d.scheduledDone < d.scheduledCount;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => setEditKey(d.key)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-surface2/50"
          >
            <span className="flex items-center gap-2">
              <span className="font-semibold">
                {d.date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {d.isRest && (
                <span className="rounded-full bg-rest/15 px-1.5 py-0.5 text-[10px] font-semibold text-rest">
                  Rest
                </span>
              )}
              {missed && (
                <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                  Missed
                </span>
              )}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {d.scheduledCount > 0
                ? `${d.scheduledDone}/${d.scheduledCount}`
                : `${d.logged.length} logged`}
            </span>
          </button>
        );
      })}

      {editDay && (
        <DayEditModal
          date={editDay.date}
          logged={editDay.logged}
          isRest={editDay.isRest}
          programs={programs}
          activePrograms={activePrograms}
          reschedules={reschedules}
          onLogInstance={onLogInstance}
          onUpdateInstance={onUpdateInstance}
          onDeleteInstance={onDeleteInstance}
          onClose={() => setEditKey(null)}
        />
      )}
    </div>
  );
}
