import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Exercise, Instance, InstanceSet } from '../types';
import { parseDuration, splitDuration } from '../templates';
import { useSettings } from '../settings';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Props = {
  exercise: Exercise;
  // Invalid sets are dropped silently; an all-empty submit no-ops.
  onLog: (sets: InstanceSet[], notes: string) => void;
  saveLabel?: string;
  showNotes?: boolean;
  // Provided when editing an existing instance; otherwise seeded from
  // the exercise's plannedSets.
  initial?: Instance;
  onCancel?: () => void;
};

type DraftSet = {
  weight: string;
  reps: string;
  min: string;
  sec: string;
};

const EMPTY_SET: DraftSet = {
  weight: '',
  reps: '',
  min: '',
  sec: '',
};

function makeDraftFromPlanned(exercise: Exercise): DraftSet[] {
  if (exercise.plannedSets.length === 0) {
    return [{ ...EMPTY_SET }];
  }
  return exercise.plannedSets.map((s): DraftSet => {
    if (exercise.trackingType === 'time') {
      const d = s.durationSeconds ?? 0;
      const { min, sec } = splitDuration(d);
      return { ...EMPTY_SET, min: String(min), sec: String(sec) };
    }
    return {
      ...EMPTY_SET,
      weight: s.weight !== undefined ? String(s.weight) : '',
      reps: s.reps ? String(s.reps.min) : '',
    };
  });
}

function makeDraftFromInstance(
  exercise: Exercise,
  inst: Instance,
): DraftSet[] {
  if (inst.sets.length === 0) return makeDraftFromPlanned(exercise);
  return inst.sets.map((s): DraftSet => {
    if (exercise.trackingType === 'time') {
      const d = s.durationSeconds ?? 0;
      const { min, sec } = splitDuration(d);
      return { ...EMPTY_SET, min: String(min), sec: String(sec) };
    }
    return {
      ...EMPTY_SET,
      weight: s.weight !== undefined ? String(s.weight) : '',
      reps: s.reps !== undefined ? String(s.reps) : '',
    };
  });
}

export function SetEditor({
  exercise,
  onLog,
  saveLabel = 'Save session',
  showNotes = true,
  initial,
  onCancel,
}: Props) {
  const { weightUnit } = useSettings();
  const [sets, setSets] = useState<DraftSet[]>(
    initial
      ? makeDraftFromInstance(exercise, initial)
      : makeDraftFromPlanned(exercise),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const isTime = exercise.trackingType === 'time';

  const updateSet = (i: number, patch: Partial<DraftSet>) => {
    setSets(sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets([...sets, last ? { ...last } : { ...EMPTY_SET }]);
  };

  const removeSet = (i: number) => {
    setSets(sets.filter((_, idx) => idx !== i));
  };

  const submit = () => {
    const parsed: InstanceSet[] = [];
    for (const s of sets) {
      if (isTime) {
        const d = parseDuration(s.min, s.sec);
        if (d === null) continue;
        parsed.push({ durationSeconds: d });
      } else {
        const w = Number(s.weight);
        const r = Number(s.reps);
        // Negative weights allowed (assisted exercises). Reps must still be
        // a positive integer.
        if (!Number.isFinite(w) || !Number.isFinite(r)) continue;
        if (r <= 0) continue;
        parsed.push({ weight: w, reps: Math.floor(r) });
      }
    }
    if (parsed.length === 0) return;
    onLog(parsed, notes);
  };

  return (
    <>
      <div className="flex flex-col gap-2 my-2">
        <div
          className="grid items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold"
          style={{ gridTemplateColumns: '36px 1fr 1fr 36px' }}
        >
          <span className="text-center">Set</span>
          {isTime ? (
            <>
              <span className="pl-1">Min</span>
              <span className="pl-1">Sec</span>
            </>
          ) : (
            <>
              <span className="pl-1">Weight</span>
              <span className="pl-1">Reps</span>
            </>
          )}
          <span />
        </div>
        {sets.map((s, i) => (
          <div
            key={i}
            className="grid items-center gap-2"
            style={{ gridTemplateColumns: '36px 1fr 1fr 36px' }}
          >
            <span className="text-center text-muted-foreground font-semibold">
              {i + 1}
            </span>
            {isTime ? (
              <>
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={s.min}
                  onChange={(e) => updateSet(i, { min: e.target.value })}
                  className="h-10 px-3 py-2"
                />
                <Input
                  inputMode="numeric"
                  placeholder="30"
                  value={s.sec}
                  onChange={(e) => updateSet(i, { sec: e.target.value })}
                  className="h-10 px-3 py-2"
                />
              </>
            ) : (
              <>
                <Input
                  placeholder={weightUnit}
                  value={s.weight}
                  onChange={(e) => updateSet(i, { weight: e.target.value })}
                  className="h-10 px-3 py-2"
                />
                <Input
                  inputMode="numeric"
                  placeholder="reps"
                  value={s.reps}
                  onChange={(e) => updateSet(i, { reps: e.target.value })}
                  className="h-10 px-3 py-2"
                />
              </>
            )}
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={`Remove set ${i + 1}`}
              onClick={() => removeSet(i)}
              disabled={sets.length <= 1}
            >
              <X aria-hidden />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="secondary" size="sm" onClick={addSet}>
        <Plus aria-hidden /> Add set
      </Button>

      {showNotes && (
        <Input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-3"
        />
      )}

      <div className="mt-3 flex gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button onClick={submit} className="flex-1">
          {saveLabel}
        </Button>
      </div>
    </>
  );
}
