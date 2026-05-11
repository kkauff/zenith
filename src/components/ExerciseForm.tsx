import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type {
  CardioActivity,
  DistanceUnit,
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
  CARDIO_ACTIVITIES,
  allowedTrackingTypesForCategory,
  cardioActivityLabel,
  defaultUnitForActivity,
  formatReps,
  parseDuration,
  parseReps,
  splitDuration,
  unitOptionsForActivity,
} from '../templates';
import {
  isExactCatalogMatch,
  suggestExercises,
  type GlobalExercise,
} from '../exercise-library';
import { uid } from '../storage';
import { SchedulePicker } from './SchedulePicker';
import { SegmentedToggle } from './SegmentedToggle';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { cn } from '@/lib/utils';

type Props = {
  // Drives which tracking types are offered (weight+reps/time vs cardio) and
  // which catalog suggestions surface. Cardio programs hide weight+reps;
  // weightlifting programs hide cardio. Editing an exercise that already
  // has an off-category trackingType preserves it as a third allowed value
  // so we don't silently mutate the user's data.
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
  // Cardio exercises don't carry plannedSets — preserve the trackingType
  // so the form opens in the right mode.
  if (initial?.trackingType === 'cardio') {
    return { trackingType: 'cardio', sets: [] };
  }
  if (!initial || initial.plannedSets.length === 0) {
    return {
      trackingType: initial?.trackingType ?? 'weight',
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
  // Allowed tracking types for this category, plus any pre-existing
  // off-category type the user is editing (so legacy data isn't silently
  // mutated).
  const allowedTracking = useMemo<TrackingType[]>(() => {
    const base = allowedTrackingTypesForCategory(categoryKey);
    if (initial?.trackingType && !base.includes(initial.trackingType)) {
      return [...base, initial.trackingType];
    }
    return base;
  }, [categoryKey, initial?.trackingType]);

  const initialDraft = draftFromExercise(initial);
  const [name, setName] = useState(initial?.name ?? '');
  // Schedule state — split between the two modes. Switching modes preserves
  // the values for each so users can flip back without retyping.
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
  // Strip system tags ('cardio') from initial state so the chip row only
  // reflects user-pickable tags; the auto category tag is re-applied at
  // save time.
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
  // Cardio-specific state. Defaults reasonable for a fresh "Running"
  // exercise; preserved across tracking-type toggles.
  const [cardioActivity, setCardioActivity] = useState<CardioActivity>(
    initial?.cardioActivity ?? 'running',
  );
  const [cardioUnit, setCardioUnit] = useState<DistanceUnit>(
    initial?.cardioUnit ?? defaultUnitForActivity(initial?.cardioActivity ?? 'running'),
  );
  const [cardioGoalKind, setCardioGoalKind] = useState<'distance' | 'time'>(
    initial?.cardioGoalKind ?? 'distance',
  );
  const [goalDistance, setGoalDistance] = useState(
    initial?.goalDistance !== undefined ? String(initial.goalDistance) : '',
  );
  const [error, setError] = useState<string | null>(null);

  // When the user picks a different activity, snap the unit to a sensible
  // default if their previous choice no longer applies (e.g. switching from
  // running/miles → swimming/yards).
  const switchActivity = (next: CardioActivity) => {
    setCardioActivity(next);
    const allowed = unitOptionsForActivity(next);
    if (!allowed.includes(cardioUnit)) {
      setCardioUnit(defaultUnitForActivity(next));
    }
  };

  // Global-catalog suggestions for the user's current name input. We only
  // surface them when the typed name doesn't already match a catalog entry
  // exactly — once they've converged, the row would just be noise. Filter
  // to entries whose trackingType is allowed in this program category so a
  // cardio program doesn't suggest Bench Press.
  const suggestions = useMemo<GlobalExercise[]>(() => {
    if (!name.trim() || isExactCatalogMatch(name)) return [];
    return suggestExercises(name, 8).filter((g) =>
      allowedTracking.includes(g.trackingType),
    ).slice(0, 3);
  }, [name, allowedTracking]);

  const applySuggestion = (g: GlobalExercise) => {
    setName(g.name);
    // Only keep tags the user can see for this category; the auto category
    // tag is re-applied at save. Cardio catalog entries used to have
    // body-region tags like 'lower' — drop them when applied to a cardio
    // program since they aren't part of the cardio tag set.
    const visible = new Set(visibleTagsForCategory(categoryKey));
    setTags(g.tags.filter((t) => visible.has(t)));
    if (g.trackingType !== trackingType) {
      switchTracking(g.trackingType);
    }
    if (g.trackingType === 'cardio') {
      if (g.cardioActivity) setCardioActivity(g.cardioActivity);
      if (g.cardioUnit) setCardioUnit(g.cardioUnit);
      if (g.cardioGoalKind) setCardioGoalKind(g.cardioGoalKind);
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
    // Reset planned sets to sensible defaults so stale values from the
    // previous mode don't leak into validation. Cardio doesn't use planned
    // sets in the form (the goal target is the only plan), so we clear
    // them entirely; logging starts from a blank set.
    if (next === 'cardio') {
      setSets([]);
    } else {
      setSets([
        { ...(next === 'time' ? DEFAULT_TIME_SET : DEFAULT_WEIGHT_SET) },
        { ...(next === 'time' ? DEFAULT_TIME_SET : DEFAULT_WEIGHT_SET) },
        { ...(next === 'time' ? DEFAULT_TIME_SET : DEFAULT_WEIGHT_SET) },
      ]);
    }
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

    // Cardio doesn't use planned-sets in the form (the goal target IS the
    // plan); for weight + time we still require at least one set.
    if (trackingType !== 'cardio' && sets.length === 0) {
      setError('Add at least one set.');
      return;
    }

    const planned: PlannedSet[] = [];
    if (trackingType !== 'cardio') {
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
    }

    let goalWeightNum: number | undefined;
    let goalDurationNum: number | undefined;
    let goalDistanceNum: number | undefined;
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
    } else if (trackingType === 'time') {
      if (goalDuration.min.trim() || goalDuration.sec.trim()) {
        const d = parseDuration(goalDuration.min, goalDuration.sec);
        if (d === null) {
          setError('Goal duration must be a positive time.');
          return;
        }
        goalDurationNum = d;
      }
    } else {
      // cardio — goal value depends on goalKind. Both fields capture the
      // user's target, but we store only the one matching the goalKind so
      // there's a single source of truth for what to display.
      if (cardioGoalKind === 'distance') {
        const v = Number(goalDistance.trim());
        if (!goalDistance.trim() || !Number.isFinite(v) || v <= 0) {
          setError('Goal distance must be a positive number.');
          return;
        }
        goalDistanceNum = v;
      } else {
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

    // Merge user-picked tags with the auto category tag (e.g. 'cardio' for
    // cardio programs) so library/catalog tag resolution still classifies
    // this exercise correctly after the program is deleted.
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
      goalDistance: goalDistanceNum,
      cardioActivity: trackingType === 'cardio' ? cardioActivity : undefined,
      cardioUnit: trackingType === 'cardio' ? cardioUnit : undefined,
      cardioGoalKind: trackingType === 'cardio' ? cardioGoalKind : undefined,
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
                label:
                  t === 'weight'
                    ? 'Weight + reps'
                    : t === 'time'
                      ? 'Time'
                      : 'Cardio',
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

      {trackingType === 'cardio' && (
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-surface2/50 p-3">
          <div className="flex flex-col gap-1.5">
            <Label>Activity</Label>
            <Select
              value={cardioActivity}
              onChange={(e) =>
                switchActivity(e.target.value as CardioActivity)
              }
              aria-label="Cardio activity"
            >
              {CARDIO_ACTIVITIES.map((a) => (
                <option key={a} value={a}>
                  {cardioActivityLabel(a)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Unit</Label>
            <div
              role="group"
              aria-label="Distance unit"
              className="flex gap-1 rounded-lg bg-surface2 p-1"
            >
              {unitOptionsForActivity(cardioActivity).map((u) => {
                const active = cardioUnit === u;
                return (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCardioUnit(u)}
                    className={cn(
                      'flex-1 min-h-9 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-glow-primary-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Goal</Label>
            <div
              role="group"
              aria-label="Goal type"
              className="flex gap-1 rounded-lg bg-surface2 p-1"
            >
              {(['distance', 'time'] as const).map((k) => {
                const active = cardioGoalKind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCardioGoalKind(k)}
                    className={cn(
                      'flex-1 min-h-9 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-glow-primary-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {k === 'distance' ? 'Distance' : 'Time'}
                  </button>
                );
              })}
            </div>
            {cardioGoalKind === 'distance' ? (
              <div className="flex items-center gap-2">
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={goalDistance}
                  onChange={(e) => setGoalDistance(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">
                  {cardioUnit}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  placeholder="min"
                  value={goalDuration.min}
                  onChange={(e) =>
                    setGoalDuration({ ...goalDuration, min: e.target.value })
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground">:</span>
                <Input
                  inputMode="numeric"
                  placeholder="sec"
                  value={goalDuration.sec}
                  onChange={(e) =>
                    setGoalDuration({ ...goalDuration, sec: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {trackingType !== 'cardio' && (
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
      )}

      {trackingType === 'weight' && (
        <label className="flex flex-col gap-1.5">
          <Label>Goal weight (lb, optional)</Label>
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
