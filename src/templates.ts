// Built-in templates. Categories are top-level groupings; exercise templates
// are name suggestions surfaced in the exercise form via a <datalist>.
//
// Only `weightlifting` is `available` for now — the others are filtered out
// of the category dropdown. When we add support for them we'll flip the flag
// and add to EXERCISE_TEMPLATES + extend the Instance data shape (e.g.
// distance/duration for running).
import {
  Dumbbell,
  Footprints,
  Salad,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { PlannedSet, RepsTarget, TrackingType } from './types';

export type CategoryTemplate = {
  key: string;
  name: string;
  Icon: LucideIcon;
  available: boolean;
};

export const CATEGORIES: CategoryTemplate[] = [
  { key: 'weightlifting', name: 'Weight Lifting', Icon: Dumbbell, available: true },
  { key: 'cardio', name: 'Cardio', Icon: Footprints, available: true },
  { key: 'nutrition', name: 'Nutrition', Icon: Salad, available: false },
  { key: 'mindfulness', name: 'Mindfulness', Icon: Wind, available: false },
];

export function getCategory(key: string): CategoryTemplate | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

// Which tracking types are valid for exercises inside a program of this
// category. Cardio programs lock out weight+reps; weightlifting programs
// lock out cardio (cardio belongs in its own program).
export function allowedTrackingTypesForCategory(
  categoryKey: string,
): import('./types').TrackingType[] {
  if (categoryKey === 'cardio') return ['cardio'];
  return ['weight', 'time'];
}

// Suggested exercise names per category. Users can still type anything they
// want — these just power the autocomplete <datalist>.
export const EXERCISE_TEMPLATES: Record<string, string[]> = {
  weightlifting: [
    // Compound lifts
    'Squat',
    'Bench Press',
    'Deadlift',
    'Overhead Press',
    'Barbell Row',
    'Pull-up',
    'Assisted Pull-up',
    'Bicep Curl',
    'Tricep Extension',
    'Leg Press',
    'Lat Pulldown',
    'Dumbbell Press',
    'Romanian Deadlift',
    // Time-based / core
    'Plank',
    'Side Plank',
    'Hollow Hold',
    'L-Sit',
    'Wall Sit',
    'Dead Hang',
  ],
};

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_LABELS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// --- Reps -----------------------------------------------------------------

// Accepts "5", "8-10", "8 - 10", "8–10" (en-dash). Returns null on garbage.
export function parseReps(input: string): RepsTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[-–—]/).map((p) => p.trim());
  if (parts.length === 1) {
    const n = Math.floor(Number(parts[0]));
    if (!Number.isFinite(n) || n < 1) return null;
    return { min: n, max: n };
  }
  if (parts.length === 2) {
    const a = Math.floor(Number(parts[0]));
    const b = Math.floor(Number(parts[1]));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (a < 1 || b < a) return null;
    return { min: a, max: b };
  }
  return null;
}

export function formatReps(reps: RepsTarget): string {
  return reps.min === reps.max ? String(reps.min) : `${reps.min}-${reps.max}`;
}

// --- Duration -------------------------------------------------------------

// Combines minute + second strings into total seconds. Either may be empty
// (treated as 0). Returns null on garbage or non-positive totals.
export function parseDuration(min: string, sec: string): number | null {
  const m = min.trim() ? Number(min) : 0;
  const s = sec.trim() ? Number(sec) : 0;
  if (!Number.isFinite(m) || m < 0) return null;
  if (!Number.isFinite(s) || s < 0) return null;
  const total = Math.floor(m * 60 + s);
  if (total < 1) return null;
  return total;
}

// Compact display: "30s" under a minute, "1:30" otherwise.
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Splits seconds into [minutes, seconds] for two-input editing.
export function splitDuration(seconds: number): { min: number; sec: number } {
  return { min: Math.floor(seconds / 60), sec: seconds % 60 };
}

// --- Distance / cardio --------------------------------------------------

import type { CardioActivity, DistanceUnit } from './types';

export function unitLabel(unit: DistanceUnit): string {
  switch (unit) {
    case 'miles':
      return 'mi';
    case 'km':
      return 'km';
    case 'yards':
      return 'yd';
    case 'meters':
      return 'm';
  }
}

export function formatDistance(distance: number, unit: DistanceUnit): string {
  // Two decimals for miles/km (small numbers), integers for yards/meters
  // (typically 50, 100, 500, etc. for swim sets).
  const decimals = unit === 'miles' || unit === 'km' ? 2 : 0;
  const str = distance.toFixed(decimals);
  // Trim trailing .00 so "3.00 mi" reads as "3 mi".
  const trimmed =
    decimals > 0 && str.endsWith('.' + '0'.repeat(decimals))
      ? str.slice(0, str.length - decimals - 1)
      : str;
  return `${trimmed} ${unitLabel(unit)}`;
}

const CARDIO_ACTIVITY_LABELS: Record<CardioActivity, string> = {
  running: 'Running',
  'treadmill-running': 'Treadmill Running',
  'outdoor-bike': 'Outdoor Bike',
  'indoor-bike': 'Indoor Bike',
  elliptical: 'Elliptical',
  stairmaster: 'Stairmaster',
  swimming: 'Swimming',
};

export function cardioActivityLabel(activity: CardioActivity): string {
  return CARDIO_ACTIVITY_LABELS[activity];
}

export const CARDIO_ACTIVITIES: CardioActivity[] = [
  'running',
  'treadmill-running',
  'outdoor-bike',
  'indoor-bike',
  'elliptical',
  'stairmaster',
  'swimming',
];

// Default unit per activity. Swimming uses yards (US) by convention; the
// rest default to miles. The user can override in the form.
export function defaultUnitForActivity(activity: CardioActivity): DistanceUnit {
  return activity === 'swimming' ? 'yards' : 'miles';
}

// Allowed unit choices for an activity — swimming gets pool units, the rest
// get road units.
export function unitOptionsForActivity(
  activity: CardioActivity,
): DistanceUnit[] {
  return activity === 'swimming' ? ['yards', 'meters'] : ['miles', 'km'];
}

// --- Planned-set summary --------------------------------------------------

// Compact, human summary of a planned-set list for row displays. Collapses to
// "3×5 @ 185 lb" / "3×0:30" when sets are uniform; expands to a list
// otherwise so warmups + working sets are visible at a glance.
export function formatPlannedSets(
  sets: PlannedSet[],
  trackingType: TrackingType,
): string {
  if (sets.length === 0) return 'No sets';

  if (trackingType === 'time') {
    const allSame = sets.every(
      (s) => s.durationSeconds === sets[0].durationSeconds,
    );
    if (allSame) {
      const d = sets[0].durationSeconds;
      return d !== undefined
        ? `${sets.length}×${formatDuration(d)}`
        : `${sets.length} sets`;
    }
    return sets
      .map((s) =>
        s.durationSeconds !== undefined ? formatDuration(s.durationSeconds) : '—',
      )
      .join(', ');
  }

  // weight tracking
  const allSameReps = sets.every(
    (s) =>
      s.reps?.min === sets[0].reps?.min && s.reps?.max === sets[0].reps?.max,
  );
  const allSameWeight = sets.every((s) => s.weight === sets[0].weight);

  if (allSameReps && allSameWeight) {
    const repsStr = sets[0].reps ? formatReps(sets[0].reps) : '—';
    const w = sets[0].weight;
    return w !== undefined
      ? `${sets.length}×${repsStr} @ ${w} lb`
      : `${sets.length}×${repsStr}`;
  }

  return sets
    .map((s) => {
      const w = s.weight !== undefined ? `${s.weight}` : '—';
      const r = s.reps ? formatReps(s.reps) : '—';
      return `${w}×${r}`;
    })
    .join(', ');
}

// --- Schedule -------------------------------------------------------------

import type { Schedule } from './types';

export function formatSchedule(schedule: Schedule): string {
  if (schedule.kind === 'frequency') {
    const noun = schedule.times === 1 ? 'time' : 'times';
    return `${schedule.times} ${noun} / ${schedule.period}`;
  }
  const days = schedule.days;
  if (days.length === 0) return 'No schedule';
  if (days.length === 7) return 'Every day';
  // Weekdays = Mon-Fri (1-5)
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS_LONG[d].slice(0, 3))
    .join(', ');
}
