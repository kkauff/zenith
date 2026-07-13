import { useEffect } from 'react';
import { CalendarPlus } from 'lucide-react';
import type { Exercise, Program } from '../types';
import { getCategory } from '../templates';
import { Button } from './ui/button';

type Props = {
  open: boolean;
  exercise: Exercise;
  weekdayLabel: string;
  programs: Program[];
  onPick: (programId: string) => void;
  onCancel: () => void;
};

export function AddToProgramModal({
  open,
  exercise,
  weekdayLabel,
  programs,
  onPick,
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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-program-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-accent/40 bg-card p-5 shadow-glow-accent-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <CalendarPlus aria-hidden className="size-5 text-accent" />
          <h2
            id="add-to-program-title"
            className="m-0 text-base font-semibold text-accent"
          >
            Add {exercise.name} to…
          </h2>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Schedules it on {weekdayLabel}s in the program you pick.
        </p>

        <ul className="flex flex-col gap-1.5">
          {programs.map((program) => {
            const category = getCategory(program.categoryKey);
            const Icon = category?.Icon;
            return (
              <li key={program.id}>
                <button
                  type="button"
                  onClick={() => onPick(program.id)}
                  className="flex w-full items-center gap-2.5 rounded-md border border-border bg-surface2 px-3 py-2.5 text-left transition-colors hover:border-accent/50 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {Icon && (
                    <Icon
                      aria-hidden
                      className="size-4 flex-shrink-0 text-muted-foreground"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {program.name}
                    </span>
                    {category && (
                      <span className="block text-[11px] text-muted-foreground">
                        {category.name}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
