import { useState } from 'react';
import { Plus, X } from 'lucide-react';
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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5">
        <Label>Exercise</Label>
        <Input
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

      <div className="flex flex-col gap-1.5">
        <Label>Tracking</Label>
        <div
          role="group"
          aria-label="Tracking type"
          className="flex gap-1 rounded-lg bg-surface2 p-1"
        >
          {(['weight', 'time'] as const).map((t) => {
            const active = trackingType === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => switchTracking(t)}
                className={cn(
                  'flex-1 min-h-9 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-glow-primary-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'weight' ? 'Weight + reps' : 'Time'}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Schedule</Label>
        <SchedulePicker days={days} onChange={setDays} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Sets</Label>
        <div className="flex flex-col gap-2">
          <div
            className="grid items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold"
            style={{ gridTemplateColumns: '36px 1fr 1fr 36px' }}
          >
            <span className="text-center">#</span>
            {trackingType === 'time' ? (
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
              {trackingType === 'time' ? (
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
                    placeholder="5 or 8-10"
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
      </div>

      {trackingType === 'weight' ? (
        <label className="flex flex-col gap-1.5">
          <Label>Goal weight (lb, optional)</Label>
          <Input
            placeholder="—"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
          />
        </label>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label>Goal duration (optional)</Label>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              placeholder="min"
              value={goalDuration.min}
              onChange={(e) =>
                setGoalDuration({ ...goalDuration, min: e.target.value })
              }
            />
            <Input
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

      {error && <p className="text-sm text-destructive m-0">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={submit} className="flex-1">
          {initial ? 'Save' : 'Add exercise'}
        </Button>
      </div>
    </div>
  );
}
