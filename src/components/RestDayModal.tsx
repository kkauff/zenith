import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import type { RestDay, RestDayReason } from '../types';
import { dateKey } from '../today';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const REASONS: { id: RestDayReason; label: string }[] = [
  { id: 'sick', label: 'Sick' },
  { id: 'injured', label: 'Injured' },
  { id: 'other', label: 'Other' },
];

type Props = {
  open: boolean;
  date: Date;
  // Pre-fill when re-opening an existing rest day for review.
  existing?: RestDay;
  onSave: (restDay: RestDay) => void;
  onCancel: () => void;
};

export function RestDayModal({ open, date, existing, onSave, onCancel }: Props) {
  const [reason, setReason] = useState<RestDayReason>(existing?.reason ?? 'sick');
  const [notes, setNotes] = useState<string>(existing?.notes ?? '');

  // Reset form whenever the modal re-opens — otherwise stale state from a
  // prior cancel would leak in.
  useEffect(() => {
    if (open) {
      setReason(existing?.reason ?? 'sick');
      setNotes(existing?.notes ?? '');
    }
  }, [open, existing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const save = () => {
    onSave({
      date: dateKey(date),
      reason,
      notes: notes.trim() || undefined,
      createdAt: existing?.createdAt ?? Date.now(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-day-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-rest/40 bg-card p-5 shadow-glow-rest-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <Heart aria-hidden className="size-5 text-rest" />
          <h2
            id="rest-day-title"
            className="m-0 text-base font-semibold text-rest text-glow-rest"
          >
            Take a rest day
          </h2>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Rest is part of the program — this day won't count against your
          adherence.
        </p>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              What's going on?
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => {
                const active = r.id === reason;
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setReason(r.id)}
                    className={cn(
                      'inline-flex min-h-9 items-center rounded-md border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rest/40',
                      active
                        ? 'border-rest/60 bg-rest/15 text-rest'
                        : 'border-border bg-surface2 text-muted-foreground hover:text-foreground hover:border-rest/30',
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="rest-day-notes"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Notes (optional)
            </label>
            <textarea
              id="rest-day-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="How you're feeling, what hurts, anything to remember…"
              className="w-full rounded-md border border-border bg-input p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rest/40"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={save}
            className="border-rest/60 text-rest hover:bg-rest hover:text-rest-foreground hover:border-rest hover:shadow-glow-rest-sm"
          >
            {existing ? 'Update' : 'Save rest day'}
          </Button>
        </div>
      </div>
    </div>
  );
}
