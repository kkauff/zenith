import { useEffect, useMemo, useState } from 'react';
import type {
  CardioActivity,
  DistanceUnit,
  Exercise,
  Program,
  RollupGoal,
  RollupMetric,
  RollupTarget,
} from '../types';
import { unitLabel } from '../templates';
import { uid } from '../storage';
import { GLOBAL_EXERCISES } from '../exercise-library';
import { SchedulePicker } from './SchedulePicker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { cn } from '@/lib/utils';

type Props = {
  program: Program;
  initial?: RollupGoal;
  // Receives the goal, plus (optionally) a freshly-synthesized Exercise the
  // parent should add to the program. We auto-create exercises when the
  // user picks a catalog cardio activity that isn't yet in the program so
  // the goal has something concrete to target.
  onSave: (goal: RollupGoal, autoExercise?: Exercise) => void;
  onCancel: () => void;
};

const DISTANCE_UNITS: DistanceUnit[] = ['miles', 'km', 'yards', 'meters'];

// Sentinel for "any cardio" and a prefix for catalog-sourced options so we
// can round-trip selection state through a single string value.
const ANY_CARDIO_VALUE = '__any_cardio__';
const CATALOG_PREFIX = 'catalog:';

function targetToOptionValue(target: RollupTarget): string {
  if (target.kind === 'tag') return ANY_CARDIO_VALUE;
  return target.exerciseId;
}

export function RollupGoalForm({ program, initial, onSave, onCancel }: Props) {
  const cardioExercises = program.exercises.filter(
    (e) => e.trackingType === 'cardio',
  );

  // Catalog activities the program doesn't already cover, so the user can
  // pick e.g. "Outdoor Bike" without first creating it as an Exercise. On
  // save we synthesize the Exercise and hand it back to the parent.
  const catalogActivities = useMemo(() => {
    const usedActivities = new Set(
      cardioExercises
        .map((e) => e.cardioActivity)
        .filter((a): a is CardioActivity => !!a),
    );
    return GLOBAL_EXERCISES.filter(
      (g) =>
        g.trackingType === 'cardio' &&
        g.cardioActivity &&
        !usedActivities.has(g.cardioActivity),
    );
  }, [cardioExercises]);

  const [targetValue, setTargetValue] = useState<string>(
    initial ? targetToOptionValue(initial.target) : ANY_CARDIO_VALUE,
  );
  const isAnyCardio = targetValue === ANY_CARDIO_VALUE;
  const isCatalogPick = targetValue.startsWith(CATALOG_PREFIX);
  const catalogPick = isCatalogPick
    ? catalogActivities.find(
        (g) => g.slug === targetValue.slice(CATALOG_PREFIX.length),
      )
    : undefined;

  // "Any cardio" can't meaningfully sum distance — running miles, swimming
  // yards, biking km don't add up. So lock metric to time in that mode.
  const [metric, setMetric] = useState<RollupMetric>(
    initial?.metric ?? 'time',
  );
  useEffect(() => {
    if (isAnyCardio && metric !== 'time') setMetric('time');
  }, [isAnyCardio, metric]);

  const [unit, setUnit] = useState<DistanceUnit>(initial?.unit ?? 'miles');
  const [scheduleKind, setScheduleKind] = useState<'weekly-days' | 'total'>(
    initial?.schedule.kind ?? 'total',
  );
  const [days, setDays] = useState<number[]>(
    initial?.schedule.kind === 'weekly-days' ? initial.schedule.days : [],
  );
  const [period, setPeriod] = useState<'week' | 'month'>(
    initial?.schedule.kind === 'total' ? initial.schedule.period : 'week',
  );

  // Time amount split as hours + minutes for ergonomics.
  const initialSeconds =
    initial?.metric === 'time' ? initial.schedule.amount : 0;
  const [hours, setHours] = useState(
    initialSeconds >= 3600 ? String(Math.floor(initialSeconds / 3600)) : '',
  );
  const [minutes, setMinutes] = useState(
    initialSeconds > 0
      ? String(Math.floor((initialSeconds % 3600) / 60))
      : '',
  );

  const initialDist =
    initial?.metric === 'distance' ? initial.schedule.amount : 0;
  const [distAmount, setDistAmount] = useState(
    initialDist > 0 ? String(initialDist) : '',
  );

  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    let amount: number;
    if (metric === 'time') {
      const h = hours.trim() ? Number(hours) : 0;
      const m = minutes.trim() ? Number(minutes) : 0;
      if (!Number.isFinite(h) || h < 0 || !Number.isFinite(m) || m < 0) {
        setError('Time must be non-negative numbers.');
        return;
      }
      const seconds = Math.floor(h * 3600 + m * 60);
      if (seconds <= 0) {
        setError('Goal time must be greater than zero.');
        return;
      }
      amount = seconds;
    } else {
      const d = Number(distAmount.trim());
      if (!distAmount.trim() || !Number.isFinite(d) || d <= 0) {
        setError('Distance must be a positive number.');
        return;
      }
      amount = d;
    }

    if (scheduleKind === 'weekly-days' && days.length === 0) {
      setError('Pick at least one day.');
      return;
    }

    const schedule =
      scheduleKind === 'weekly-days'
        ? ({ kind: 'weekly-days' as const, days, amount })
        : ({ kind: 'total' as const, period, amount });

    // Resolve the target. Catalog picks become a freshly-minted Exercise
    // that the parent will splice into program.exercises so logging has
    // somewhere concrete to land.
    let target: RollupTarget;
    let autoExercise: Exercise | undefined;
    if (targetValue === ANY_CARDIO_VALUE) {
      target = { kind: 'tag', tag: 'cardio' };
    } else if (catalogPick) {
      autoExercise = {
        id: uid(),
        name: catalogPick.name,
        // No per-day schedule — the rollup goal carries the schedule. The
        // exercise just exists as a logging anchor.
        schedule: { kind: 'weekly-days', days: [] },
        trackingType: 'cardio',
        plannedSets: [],
        cardioActivity: catalogPick.cardioActivity,
        cardioUnit: catalogPick.cardioUnit,
        // Auto-merge the category 'cardio' tag like ExerciseForm does on
        // save so tag-based resolution still works after deletion.
        tags: ['cardio'],
      };
      target = { kind: 'exercise', exerciseId: autoExercise.id };
    } else {
      target = { kind: 'exercise', exerciseId: targetValue };
    }

    onSave(
      {
        id: initial?.id ?? uid(),
        target,
        metric,
        unit: metric === 'distance' ? unit : undefined,
        schedule,
      },
      autoExercise,
    );
  };

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5">
        <Label>Applies to</Label>
        <Select
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          aria-label="Target"
        >
          <option value={ANY_CARDIO_VALUE}>Cardio (Any)</option>
          {cardioExercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
          {catalogActivities.map((g) => (
            <option key={`cat-${g.slug}`} value={`${CATALOG_PREFIX}${g.slug}`}>
              {g.name}
            </option>
          ))}
        </Select>
        <p className="m-0 text-xs text-muted-foreground">
          {isAnyCardio
            ? 'Counts every cardio session, regardless of which exercise. Time-only — distances across activities don’t add up.'
            : catalogPick
              ? `Will add ${catalogPick.name} as an exercise in this program so you can log it.`
              : 'Only counts sessions of this exercise.'}
        </p>
      </label>

      <div className="flex flex-col gap-1.5">
        <Label>Measure</Label>
        <div
          role="group"
          aria-label="Metric"
          className="flex gap-1 rounded-lg bg-surface2 p-1"
        >
          {(['time', 'distance'] as const).map((m) => {
            const active = metric === m;
            const disabled = isAnyCardio && m === 'distance';
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => !disabled && setMetric(m)}
                className={cn(
                  'flex-1 min-h-9 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                  disabled && 'opacity-40 cursor-not-allowed',
                  active
                    ? 'bg-primary text-primary-foreground shadow-glow-primary-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'time' ? 'Time' : 'Distance'}
              </button>
            );
          })}
        </div>
      </div>

      {metric === 'distance' && (
        <label className="flex flex-col gap-1.5">
          <Label>Unit</Label>
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value as DistanceUnit)}
            aria-label="Distance unit"
          >
            {DISTANCE_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </label>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Schedule</Label>
        <div
          role="group"
          aria-label="Schedule type"
          className="flex gap-1 rounded-lg bg-surface2 p-1"
        >
          {(
            [
              { kind: 'weekly-days' as const, label: 'Per day' },
              { kind: 'total' as const, label: 'Total per period' },
            ]
          ).map((opt) => {
            const active = scheduleKind === opt.kind;
            return (
              <button
                key={opt.kind}
                type="button"
                aria-pressed={active}
                onClick={() => setScheduleKind(opt.kind)}
                className={cn(
                  'flex-1 min-h-9 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-glow-primary-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {scheduleKind === 'weekly-days' ? (
          <SchedulePicker days={days} onChange={setDays} />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">total per</span>
            <div className="flex gap-1 rounded-md bg-surface2 p-1">
              {(['week', 'month'] as const).map((p) => {
                const active = period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPeriod(p)}
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>
          {scheduleKind === 'weekly-days'
            ? 'Amount per scheduled day'
            : `Total per ${period}`}
        </Label>
        {metric === 'time' ? (
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="flex-1"
              aria-label="Hours"
            />
            <span className="text-sm text-muted-foreground">hr</span>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="flex-1"
              aria-label="Minutes"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              inputMode="decimal"
              placeholder="0"
              value={distAmount}
              onChange={(e) => setDistAmount(e.target.value)}
              className="flex-1"
              aria-label="Distance"
            />
            <span className="text-sm text-muted-foreground">
              {unitLabel(unit)}
            </span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive m-0">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={submit} className="flex-1">
          {initial ? 'Save' : 'Add goal'}
        </Button>
      </div>
    </div>
  );
}
