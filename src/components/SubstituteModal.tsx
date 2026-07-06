import { useEffect } from 'react';
import { Repeat } from 'lucide-react';
import type { Exercise } from '../types';
import { MOVEMENT_LABEL } from '../types';
import { resolveMovements, type GlobalExercise } from '../exercise-library';
import { Button } from './ui/button';

type Props = {
  open: boolean;
  exercise: Exercise;
  // Candidates sharing a movement pattern, from substitutesFor().
  candidates: GlobalExercise[];
  onPick: (substitute: GlobalExercise) => void;
  onCancel: () => void;
};

export function SubstituteModal({
  open,
  exercise,
  candidates,
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

  const originalPatterns = resolveMovements(exercise);
  const sorted = [...candidates].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitute-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-lg border border-primary/40 bg-card p-5 shadow-glow-primary-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <Repeat aria-hidden className="size-5 text-primary" />
          <h2
            id="substitute-title"
            className="m-0 text-base font-semibold text-primary text-glow-primary"
          >
            Substitute exercise
          </h2>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Swap <span className="font-semibold">{exercise.name}</span> for today
          only. These share its movement
          {originalPatterns.length > 1 ? ' patterns' : ' pattern'} (
          {originalPatterns.map((p) => MOVEMENT_LABEL[p]).join(', ')}) — pick one
          and it'll count toward today's slot.
        </p>

        {sorted.length === 0 ? (
          <p className="m-0 text-sm italic text-muted-foreground">
            No substitutes found for this exercise.
          </p>
        ) : (
          <ul className="space-y-2 overflow-y-auto">
            {sorted.map((g) => (
              <li key={g.slug}>
                <button
                  type="button"
                  onClick={() => onPick(g)}
                  className="flex w-full flex-col gap-1.5 rounded-md border border-border bg-surface2 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="text-sm font-semibold">{g.name}</span>
                  <span className="flex flex-wrap gap-1">
                    {(g.movements ?? []).map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                      >
                        {MOVEMENT_LABEL[m]}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
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
