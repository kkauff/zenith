import { useState } from 'react';
import type { Exercise, PlannedSet, TrackingType } from '../types';
import {
  EXERCISE_TEMPLATES,
  formatReps,
  parseDuration,
  parseReps,
  splitDuration,
} from '../templates';
import { uid } from '../storage';
import { SchedulePicker } from './SchedulePicker';

type Props = {
  categoryKey: string;
  initial?: Exercise;
  onSave: (exercise: Exercise) => void;
  onCancel: () => void;
};

// Each row holds strings for every supported tracking type; only the relevant
// fields are submitted, the rest are inert. Using a single shape keeps state
// transitions simple when the user toggles between weight and time.
type DraftSet = {
  weight: string;
  reps: string;
  min: string;
  sec: string;
};

const DEFAULT_WEIGHT_SET: DraftSet = { weight: '', reps: '5', min: '', sec: '' };
const DEFAULT_TIME_SET: DraftSet = { weight: '', reps: '', min: '0', sec: '30' };

function draftFromExercise(initial?: Exercise): {
  trackingType: TrackingType;
  sets: DraftSet[];
} {
  if (!initial || initial.plannedSets.length === 0) {
    return {
      trackingType: 'weight',
      // 3 default sets — common starting point. The user can delete or add.
      sets: [
        { ...DEFAULT_WEIGHT_SET },
        { ...DEFAULT_WEIGHT_SET },
        { ...DEFAULT_WEIGHT_SET },
      ],
    };
  }
  const tt = initial.trackingType;
  const sets = initial.plannedSets.map((s): DraftSet => {
    if (tt === 'time') {
      const d = s.durationSeconds ?? 0;
      const { min, sec } = splitDuration(d);
      return { weight: '', reps: '', min: String(min), sec: String(sec) };
    }
    return {
      weight: s.weight !== undefined ? String(s.weight) : '',
      reps: s.reps ? formatReps(s.reps) : '',
      min: '',
      sec: '',
    };
  });
  return { trackingType: tt, sets };
}

export function ExerciseForm({ categoryKey, initial, onSave, onCancel }: Props) {
  const initialDraft = draftFromExercise(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [days, setDays] = useState<number[]>(initial?.schedule.days ?? []);
  const [trackingType, setTrackingType] = useState<TrackingType>(
    initialDraft.trackingType,
  );
  const [sets, setSets] = useState<DraftSet[]>(initialDraft.sets);
  const [goalWeight, setGoalWeight] = useState(
    initial?.goalWeight !== undefined ? String(initial.goalWeight) : '',
  );
  const [goalDuration, setGoalDuration] = useState(() => {
    if (initial?.goalDurationSeconds === undefined) return { min: '', sec: '' };
    const { min, sec } = splitDuration(initial.goalDurationSeconds);
    return { min: String(min), sec: String(sec) };
  });
  const [error, setError] = useState<string | null>(null);

  const templates = EXERCISE_TEMPLATES[categoryKey] ?? [];

  const switchTracking = (next: TrackingType) => {
    if (next === trackingType) return;
    setTrackingType(next);
    // Reset sets to sensible defaults for the new mode so stale values from
    // the previous mode don't leak into validation.
    setSets([
      { ...(next === 'time' ? DEFAULT_TIME_SET : DEFAULT_WEIGHT_SET) },
      { ...(next === 'time' ? DEFAULT_TIME_SET : DEFAULT_WEIGHT_SET) },
      { ...(next === 'time' ? DEFAULT_TIME_SET : DEFAULT_WEIGHT_SET) },
    ]);
    setError(null);
  };

  const updateSet = (i: number, patch: Partial<DraftSet>) => {
    setSets(sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    const fallback = trackingType === 'time' ? DEFAULT_TIME_SET : DEFAULT_WEIGHT_SET;
    setSets([...sets, last ? { ...last } : { ...fallback }]);
  };

  const removeSet = (i: number) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, idx) => idx !== i));
  };

  // Plain function (no FormEvent) — this component intentionally does NOT
  // render a <form> so it can be nested inside another <form> without the
  // submit event bubbling and triggering the parent's submit handler.
  const submit = () => {
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Exercise needs a name.');
      return;
    }

    if (sets.length === 0) {
      setError('Add at least one set.');
      return;
    }

    const planned: PlannedSet[] = [];
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      if (trackingType === 'time') {
        const d = parseDuration(s.min, s.sec);
        if (d === null) {
          setError(`Set ${i + 1}: enter a duration (min and/or sec).`);
          return;
        }
        planned.push({ durationSeconds: d });
      } else {
        const reps = parseReps(s.reps);
        if (!reps) {
          setError(`Set ${i + 1}: reps must be like "5" or "8-10".`);
          return;
        }
        const weightStr = s.weight.trim();
        let weight: number | undefined;
        if (weightStr) {
          const w = Number(weightStr);
          // Negative weights are allowed (e.g. assisted pull-ups: -50 lb of
          // assistance, becoming -30 as you get stronger).
          if (!Number.isFinite(w)) {
            setError(`Set ${i + 1}: weight must be a number.`);
            return;
          }
          weight = w;
        }
        planned.push({ weight, reps });
      }
    }

    let goalWeightNum: number | undefined;
    let goalDurationNum: number | undefined;
    if (trackingType === 'weight') {
      const goalStr = goalWeight.trim();
      if (goalStr) {
        const g = Number(goalStr);
        if (!Number.isFinite(g)) {
          setError('Goal weight must be a number.');
          return;
        }
        goalWeightNum = g;
      }
    } else {
      if (goalDuration.min.trim() || goalDuration.sec.trim()) {
        const d = parseDuration(goalDuration.min, goalDuration.sec);
        if (d === null) {
          setError('Goal duration must be a positive time.');
          return;
        }
        goalDurationNum = d;
      }
    }

    onSave({
      id: initial?.id ?? uid(),
      name: trimmed,
      schedule: { days },
      trackingType,
      plannedSets: planned,
      goalWeight: goalWeightNum,
      goalDurationSeconds: goalDurationNum,
    });
  };

  return (
    <div className="exercise-form stack">
      <label className="field">
        <span className="field-label">Exercise</span>
        <input
          list="exercise-templates"
          placeholder="e.g. Squat or Plank"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <datalist id="exercise-templates">
          {templates.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>

      <div className="field">
        <span className="field-label">Tracking</span>
        <div className="seg-control" role="group" aria-label="Tracking type">
          <button
            type="button"
            className={`seg ${trackingType === 'weight' ? 'seg-active' : ''}`}
            aria-pressed={trackingType === 'weight'}
            onClick={() => switchTracking('weight')}
          >
            Weight + reps
          </button>
          <button
            type="button"
            className={`seg ${trackingType === 'time' ? 'seg-active' : ''}`}
            aria-pressed={trackingType === 'time'}
            onClick={() => switchTracking('time')}
          >
            Time
          </button>
        </div>
      </div>

      <div className="field">
        <span className="field-label">Schedule</span>
        <SchedulePicker days={days} onChange={setDays} />
      </div>

      <div className="field">
        <span className="field-label">Sets</span>
        <div className="set-list">
          <div className="set-row set-row-header">
            <span>#</span>
            {trackingType === 'time' ? (
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
              {trackingType === 'time' ? (
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
                    inputMode="text"
                    placeholder="5 or 8-10"
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
      </div>

      {trackingType === 'weight' ? (
        <label className="field">
          <span className="field-label">Goal weight (lb, optional)</span>
          <input
            inputMode="text"
            placeholder="—"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
          />
        </label>
      ) : (
        <div className="field">
          <span className="field-label">Goal duration (optional)</span>
          <div className="row">
            <input
              inputMode="numeric"
              placeholder="min"
              value={goalDuration.min}
              onChange={(e) =>
                setGoalDuration({ ...goalDuration, min: e.target.value })
              }
            />
            <input
              inputMode="numeric"
              placeholder="sec"
              value={goalDuration.sec}
              onChange={(e) =>
                setGoalDuration({ ...goalDuration, sec: e.target.value })
              }
            />
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={submit}>
          {initial ? 'Save' : 'Add exercise'}
        </button>
      </div>
    </div>
  );
}
