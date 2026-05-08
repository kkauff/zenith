import { useState } from 'react';
import type { Exercise, InstanceSet } from '../types';
import { parseDuration, splitDuration } from '../templates';

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
      <div className="set-list">
        <div className="set-row set-row-header">
          <span>Set</span>
          {isTime ? (
            <>
              <span>Min</span>
              <span>Sec</span>
            </>
          ) : (
            <>
              <span>Weight</span>
              <span>Reps</span>
            </>
          )}
          <span />
        </div>
        {sets.map((s, i) => (
          <div className="set-row" key={i}>
            <span className="set-num">{i + 1}</span>
            {isTime ? (
              <>
                <input
                  inputMode="numeric"
                  placeholder="0"
                  value={s.min}
                  onChange={(e) => updateSet(i, { min: e.target.value })}
                />
                <input
                  inputMode="numeric"
                  placeholder="30"
                  value={s.sec}
                  onChange={(e) => updateSet(i, { sec: e.target.value })}
                />
              </>
            ) : (
              <>
                <input
                  inputMode="text"
                  placeholder="lb"
                  value={s.weight}
                  onChange={(e) => updateSet(i, { weight: e.target.value })}
                />
                <input
                  inputMode="numeric"
                  placeholder="reps"
                  value={s.reps}
                  onChange={(e) => updateSet(i, { reps: e.target.value })}
                />
              </>
            )}
            <button
              type="button"
              className="icon"
              aria-label={`Remove set ${i + 1}`}
              onClick={() => removeSet(i)}
              disabled={sets.length <= 1}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="secondary" onClick={addSet}>
        + Add set
      </button>

      {showNotes && (
        <input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ marginTop: 12 }}
        />
      )}

      <button type="button" onClick={submit} style={{ marginTop: 12 }}>
        {saveLabel}
      </button>
    </>
  );
}
