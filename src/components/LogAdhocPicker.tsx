import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Plus, Search } from 'lucide-react';
import type { BorrowableDays } from '../today';
import type { PickerOption } from './ExercisePicker';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
  borrowable: BorrowableDays;
  // Already-visible exercises are filtered upstream — these are the
  // additional options the picker shows.
  options: PickerOption[];
  // Multi-pick — dropdown stays open after each call.
  onSelectExercise: (id: string) => void;
  // Bulk-add a day's full exercise list; dropdown closes afterward.
  onSelectDay: (exerciseIds: string[]) => void;
};

export function LogAdhocPicker({
  borrowable,
  options,
  onSelectExercise,
  onSelectDay,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasDays =
    borrowable.weekdays.length > 0 || borrowable.missed.length > 0;
  if (!hasDays && options.length === 0) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.programName.toLowerCase().includes(q),
      )
    : options;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full justify-start"
      >
        <Plus aria-hidden /> Log ad-hoc
      </Button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 flex max-h-[70vh] flex-col overflow-hidden rounded-lg border border-border/60 bg-card shadow-lg">
          {borrowable.missed.length > 0 && (
            <div className="border-b border-border/60">
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-rest/80">
                Missed this week
              </div>
              <ul className="py-1">
                {borrowable.missed.map((day, idx) => (
                  <li key={`missed-${idx}`}>
                    <DayRow
                      label={formatMissedDate(day.date)}
                      sublabel={previewNames(day.exercises)}
                      missed
                      onClick={() => {
                        onSelectDay(day.exercises.map((e) => e.exercise.id));
                        setOpen(false);
                        setQuery('');
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {borrowable.weekdays.length > 0 && (
            <div className="border-b border-border/60">
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                From a weekday
              </div>
              <ul className="py-1">
                {borrowable.weekdays.map((wd) => (
                  <li key={`dow-${wd.dow}`}>
                    <DayRow
                      label={DOW_NAMES[wd.dow]}
                      sublabel={previewNames(wd.exercises)}
                      onClick={() => {
                        onSelectDay(wd.exercises.map((e) => e.exercise.id));
                        setOpen(false);
                        setQuery('');
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {options.length > 0 && (
            <>
              <div className="flex items-center gap-2 border-b border-border/60 px-3">
                <Search aria-hidden className="size-4 text-muted-foreground" />
                <Input
                  autoFocus={!hasDays}
                  placeholder="Search exercises…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
                />
              </div>
              <ul role="listbox" className="flex-1 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-xs italic text-muted-foreground">
                    No matches.
                  </li>
                ) : (
                  filtered.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => onSelectExercise(o.id)}
                        className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors hover:bg-surface2/60 focus-visible:bg-surface2/60 focus-visible:outline-none"
                      >
                        <span className="text-sm font-semibold">{o.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {o.programName}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DayRow({
  label,
  sublabel,
  missed = false,
  onClick,
}: {
  label: string;
  sublabel: string;
  missed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-surface2/60 focus-visible:bg-surface2/60 focus-visible:outline-none"
    >
      {missed && (
        <AlertCircle aria-hidden className="size-3.5 flex-shrink-0 text-rest" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="truncate text-xs text-muted-foreground">{sublabel}</div>
      </div>
    </button>
  );
}

function previewNames(
  exercises: { exercise: { name: string } }[],
  limit = 3,
): string {
  const names = exercises.slice(0, limit).map((e) => e.exercise.name);
  const more = exercises.length - names.length;
  return names.join(' · ') + (more > 0 ? ` · +${more} more` : '');
}

function formatMissedDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
  );
  const dayName = DOW_NAMES[target.getDay()];
  const monthDay = target.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  if (diffDays === 1) return `Yesterday · ${dayName}`;
  return `${dayName}, ${monthDay}`;
}
