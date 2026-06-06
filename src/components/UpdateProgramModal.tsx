import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { Exercise, PlannedSet, Program } from '../types';
import { formatPlannedSets, formatReps, parseReps } from '../templates';
import { useSettings } from '../settings';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Props = {
  open: boolean;
  program: Program;
  exercise: Exercise;
  suggestedSets: PlannedSet[];
  onConfirm: (sets: PlannedSet[]) => void;
  onCancel: () => void;
};

type DraftRow = {
  weight: string;
  reps: string;
};

function seedFromSets(sets: PlannedSet[]): DraftRow[] {
  return sets.map((s) => ({
    weight: s.weight !== undefined ? String(s.weight) : '',
    reps: s.reps ? formatReps(s.reps) : '',
  }));
}

export function UpdateProgramModal({
  open,
  program,
  exercise,
  suggestedSets,
  onConfirm,
  onCancel,
}: Props) {
  const { weightUnit } = useSettings();
  const [rows, setRows] = useState<DraftRow[]>(() => seedFromSets(suggestedSets));
  const [error, setError] = useState<string | null>(null);

  // Reseed on each reopen so a cancel-then-reopen starts from the latest
  // suggestion rather than the last edited draft.
  useEffect(() => {
    if (open) {
      setRows(seedFromSets(suggestedSets));
      setError(null);
    }
  }, [open, suggestedSets]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const currentSummary = formatPlannedSets(
    exercise.plannedSets,
    exercise.trackingType,
    weightUnit,
  );

  const updateRow = (i: number, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const confirm = () => {
    const parsed: PlannedSet[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const reps = parseReps(r.reps);
      if (!reps) {
        setError(`Set ${i + 1}: reps must be like "5" or "8-12".`);
        return;
      }
      const weightStr = r.weight.trim();
      let weight: number | undefined;
      if (weightStr) {
        const w = Number(weightStr);
        if (!Number.isFinite(w)) {
          setError(`Set ${i + 1}: weight must be a number.`);
          return;
        }
        weight = w;
      }
      parsed.push({ weight, reps });
    }
    onConfirm(parsed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-program-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-primary/40 bg-card p-5 shadow-glow-primary-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <Pencil aria-hidden className="size-5 text-primary" />
          <h2
            id="update-program-title"
            className="m-0 text-base font-semibold text-primary text-glow-primary"
          >
            Update {exercise.name}?
          </h2>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          In {program.name}. Future sessions will use the new targets.
        </p>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface2 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current
            </div>
            <div className="mt-0.5 text-sm text-foreground">
              {currentSummary}
            </div>
          </div>

          <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
              Updated
            </div>
            <div
              className="mb-1 grid items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold"
              style={{ gridTemplateColumns: '32px 1fr 1fr' }}
            >
              <span className="text-center">Set</span>
              <span className="pl-1">Weight</span>
              <span className="pl-1">Reps</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="grid items-center gap-2"
                  style={{ gridTemplateColumns: '32px 1fr 1fr' }}
                >
                  <span className="text-center text-muted-foreground font-semibold">
                    {i + 1}
                  </span>
                  <Input
                    placeholder={weightUnit}
                    value={r.weight}
                    onChange={(e) => updateRow(i, { weight: e.target.value })}
                    className="h-9 px-2 py-1.5"
                  />
                  <Input
                    placeholder="5 or 8-12"
                    value={r.reps}
                    onChange={(e) => updateRow(i, { reps: e.target.value })}
                    className="h-9 px-2 py-1.5"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="m-0 text-xs text-destructive">{error}</p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm}>Update program</Button>
        </div>
      </div>
    </div>
  );
}
