import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type {
  Exercise,
  ExerciseTag,
  PlannedSet,
  TrackingType,
} from '../types';
import {
  TAG_LABEL,
  autoTagsForCategory,
  visibleTagsForCategory,
} from '../types';
import {
  allowedTrackingTypesForCategory,
  formatReps,
  parseDuration,
  parseReps,
  splitDuration,
} from '../templates';
import {
  isExactCatalogMatch,
  suggestExercises,
  type GlobalExercise,
} from '../exercise-library';
import { useSettings } from '../settings';
import { uid } from '../storage';
import { SchedulePicker } from './SchedulePicker';
import { SegmentedToggle } from './SegmentedToggle';
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


// Single shape with fields for both tracking types keeps switching
// between weight and time stateless — only the relevant fields are
// submitted, the rest are inert.
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
      trackingType: initial?.trackingType ?? 'weight',
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
  const { weightUnit } = useSettings();
  const allowedTracking = useMemo<TrackingType[]>(
    () => allowedTrackingTypesForCategory(categoryKey),
    [categoryKey],
  );

  const initialDraft = draftFromExercise(initial);
  const [name, setName] = useState(initial?.name ?? '');
  // Split state for the two modes so flipping doesn't lose the other's
  // values.
  const initialScheduleKind: 'weekly-days' | 'frequency' =
    initial?.schedule.kind ?? 'weekly-days';
  const [scheduleKind, setScheduleKind] = useState<
    'weekly-days' | 'frequency'
  >(initialScheduleKind);
  const [days, setDays] = useState<number[]>(
    initial?.schedule.kind === 'weekly-days' ? initial.schedule.days : [],
  );
  const [freqTimes, setFreqTimes] = useState(
    initial?.schedule.kind === 'frequency'
      ? String(initial.schedule.times)
      : '5',
  );
  const [freqPeriod, setFreqPeriod] = useState<'week' | 'month'>(
    initial?.schedule.kind === 'frequency' ? initial.schedule.period : 'week',
  );
  const [trackingType, setTrackingType] = useState<TrackingType>(
    allowedTracking.includes(initialDraft.trackingType)
      ? initialDraft.trackingType
      : allowedTracking[0],
  );
  const [sets, setSets] = useState<DraftSet[]>(initialDraft.sets);
  const [tags, setTags] = useState<ExerciseTag[]>(() => {
    const visible = new Set(visibleTagsForCategory(categoryKey));
    return (initial?.tags ?? []).filter((t) => visible.has(t));
  });
  const [goalWeight, setGoalWeight] = useState(
    initial?.goalWeight !== undefined ? String(initial.goalWeight) : '',
  );
  const [goalDuration, setGoalDuration] = useState(() => {
    if (initial?.goalDurationSeconds === undefined) return { min: '', sec: '' };
    const { min, sec } = splitDuration(initial.goalDurationSeconds);
    return { min: String(min), sec: String(sec) };
  });
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo<GlobalExercise[]>(() => {
    if (!name.trim() || isExactCatalogMatch(name)) return [];
    return suggestExercises(name, 8)
      .filter((g) => allowedTracking.includes(g.trackingType))
      .slice(0, 3);
  }, [name, allowedTracking]);

  const applySuggestion = (g: GlobalExercise) => {
    setName(g.name);
    const visible = new Set(visibleTagsForCategory(categoryKey));
    setTags(g.tags.filter((t) => visible.has(t)));
    if (g.trackingType !== trackingType) {
      switchTracking(g.trackingType);
    }
  };

  const toggleTag = (t: ExerciseTag) => {
    setTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    );
  };

  const switchTracking = (next: TrackingType) => {
    if (next === trackingType) return;
    if (!allowedTracking.includes(next)) return;
    setTrackingType(next);
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

  // Not a <form> submit handler — this component is sometimes nested
  // inside another <form> and we don't want event bubbling.
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

    let schedule: Exercise['schedule'];
    if (scheduleKind === 'frequency') {
      const t = Math.floor(Number(freqTimes));
      if (!Number.isFinite(t) || t < 1) {
        setError('Frequency must be a whole number ≥ 1.');
        return;
      }
      schedule = { kind: 'frequency', period: freqPeriod, times: t };
    } else {
      schedule = { kind: 'weekly-days', days };
    }

    const mergedTags = Array.from(
      new Set([...tags, ...autoTagsForCategory(categoryKey)]),
    );

    onSave({
      id: initial?.id ?? uid(),
      name: trimmed,
      schedule,
      trackingType,
      plannedSets: planned,
      goalWeight: goalWeightNum,
      goalDurationSeconds: goalDurationNum,
      tags: mergedTags.length > 0 ? mergedTags : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5">
        <Label>Exercise</Label>
        <Input
          placeholder="e.g. Squat or Plank"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold">
              Did you mean
            </span>
            {suggestions.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => applySuggestion(s)}
                className="inline-flex items-center rounded-md border border-primary/40 bg-transparent px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </label>

      <div className="flex flex-col gap-1.5">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {visibleTagsForCategory(categoryKey).map((t) => {
            const active = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTag(t)}
                className={cn(
                  'inline-flex min-h-8 items-center rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  active
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-surface2 text-muted-foreground hover:text-foreground hover:border-primary/30',
                )}
              >
                {TAG_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          'flex items-end gap-3',
          allowedTracking.length > 1 ? 'justify-between' : 'justify-start',
        )}
      >
        {allowedTracking.length > 1 && (
          <div className="flex flex-col items-center gap-1.5">
            <Label>Tracking</Label>
            <SegmentedToggle
              ariaLabel="Tracking type"
              value={trackingType}
              onChange={switchTracking}
              options={allowedTracking.map((t) => ({
                value: t,
                label: t === 'weight' ? 'Weight + reps' : 'Time',
              }))}
            />
          </div>
        )}
        <div className="flex flex-col items-center gap-1.5">
          <Label>Schedule</Label>
          <SegmentedToggle
            ariaLabel="Schedule type"
            value={scheduleKind}
            onChange={setScheduleKind}
            options={[
              { value: 'weekly-days', label: 'Specific days' },
              { value: 'frequency', label: 'Frequency' },
            ]}
          />
        </div>
      </div>

      {scheduleKind === 'weekly-days' ? (
        <SchedulePicker days={days} onChange={setDays} />
      ) : (
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            value={freqTimes}
            onChange={(e) => setFreqTimes(e.target.value)}
            className="w-20 text-center"
            aria-label="Frequency count"
          />
          <span className="text-sm text-muted-foreground">times per</span>
          <div className="flex gap-1 rounded-md bg-surface2 p-1">
            {(['week', 'month'] as const).map((p) => {
              const active = freqPeriod === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFreqPeriod(p)}
                  className={cn(
                    'min-h-8 rounded px-3 py-1 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-glow-primary-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                    placeholder={weightUnit}
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

      {trackingType === 'weight' && (
        <label className="flex flex-col gap-1.5">
          <Label>Goal weight ({weightUnit}, optional)</Label>
          <Input
            placeholder="—"
            value={goalWeight}
            onChange={(e) => setGoalWeight(e.target.value)}
          />
        </label>
      )}
      {trackingType === 'time' && (
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
