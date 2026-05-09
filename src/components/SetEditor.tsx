import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Exercise, InstanceSet } from '../types';
import { parseDuration, splitDuration } from '../templates';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Props = {
  exercise: Exercise;
  // Called with parsed sets + notes when the user saves. Empty/invalid sets
  // are dropped silently; if no usable sets remain we no-op.
  onLog: (sets: InstanceSet[], notes: string) => void;
  saveLabel?: string;
  // Skipped on the inline today cards where we don't need a notes field —
  // the screen-style LogInstance keeps it.
  showNotes?: boolean;
};

type DraftSet = { weight: string; reps: string; min: string; sec: string };

function makeInitialSets(exercise: Exercise): DraftSet[] {
  if (exercise.plannedSets.length === 0) {
    return [{ weight: '', reps: '', min: '', sec: '' }];
  }
  return exercise.plannedSets.map((s): DraftSet => {
    if (exercise.trackingType === 'time') {
      const d = s.durationSeconds ?? 0;
      const { min, sec } = splitDuration(d);
      return { weight: '', reps: '', min: String(min), sec: String(sec) };
    }
    return {
      weight: s.weight !== undefined ? String(s.weight) : '',
      reps: s.reps ? String(s.reps.min) : '',
      min: '',
      sec: '',
    };
  });
}

export function SetEditor({
  exercise,
  onLog,
  saveLabel = 'Save session',
  showNotes = true,
}: Props) {
  const [sets, setSets] = useState<DraftSet[]>(makeInitialSets(exercise));
  const [notes, setNotes] = useState('');

  const isTime = exercise.trackingType === 'time';

  const updateSet = (i: number, patch: Partial<DraftSet>) => {
    setSets(sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets([
      ...sets,
      last ? { ...last } : { weight: '', reps: '', min: '', sec: '' },
    ]);
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
                  placeholder="lb"
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

      <Button onClick={submit} className="mt-3 w-full">
        {saveLabel}
      </Button>
    </>
  );
}
