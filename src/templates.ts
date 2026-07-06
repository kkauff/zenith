import {
  Activity,
  Dumbbell,
  Flame,
  Salad,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { PlannedSet, RepsTarget, Schedule, TrackingType } from './types';

export type CategoryTemplate = {
  key: string;
  name: string;
  Icon: LucideIcon;
  available: boolean;
};

export const CATEGORIES: CategoryTemplate[] = [
  { key: 'weightlifting', name: 'Weight Lifting', Icon: Dumbbell, available: true },
  { key: 'warmup', name: 'Warm Up', Icon: Flame, available: true },
  { key: 'rehab', name: 'Rehab', Icon: Activity, available: true },
  { key: 'nutrition', name: 'Nutrition', Icon: Salad, available: false },
  { key: 'mindfulness', name: 'Mindfulness', Icon: Wind, available: false },
];

export function getCategory(key: string): CategoryTemplate | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

export function allowedTrackingTypesForCategory(
  categoryKey: string,
): TrackingType[] {
  if (categoryKey === 'warmup' || categoryKey === 'rehab') {
    return ['count', 'band', 'weight', 'time'];
  }
  return ['weight', 'time'];
}

// Powers the autocomplete <datalist>; users can still type anything.
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

// Accepts "5", "8-10", "8 - 10", "8–10" (en-dash).
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

// Either field may be empty (treated as 0). Returns null for garbage or
// non-positive totals.
export function parseDuration(min: string, sec: string): number | null {
  const m = min.trim() ? Number(min) : 0;
  const s = sec.trim() ? Number(sec) : 0;
  if (!Number.isFinite(m) || m < 0) return null;
  if (!Number.isFinite(s) || s < 0) return null;
  const total = Math.floor(m * 60 + s);
  if (total < 1) return null;
  return total;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function splitDuration(seconds: number): { min: number; sec: number } {
  return { min: Math.floor(seconds / 60), sec: seconds % 60 };
}

// --- Planned-set summary --------------------------------------------------

// Collapses to "3×5 @ 185 lb" / "3×0:30" when sets are uniform; expands to
// a comma-joined list otherwise so warmups + working sets are visible at
// a glance.
export function formatPlannedSets(
  sets: PlannedSet[],
  trackingType: TrackingType,
  weightUnit: 'lb' | 'kg' = 'lb',
): string {
  if (sets.length === 0) return 'No sets';

  if (trackingType === 'count') {
    const allSameReps = sets.every(
      (s) =>
        s.reps?.min === sets[0].reps?.min && s.reps?.max === sets[0].reps?.max,
    );
    if (allSameReps) {
      const repsStr = sets[0].reps ? formatReps(sets[0].reps) : '—';
      return `${sets.length}×${repsStr}`;
    }
    return sets.map((s) => (s.reps ? formatReps(s.reps) : '—')).join(', ');
  }

  if (trackingType === 'band') {
    const allSameReps = sets.every(
      (s) =>
        s.reps?.min === sets[0].reps?.min && s.reps?.max === sets[0].reps?.max,
    );
    const allSameBand = sets.every((s) => s.bandColor === sets[0].bandColor);
    if (allSameReps && allSameBand) {
      const repsStr = sets[0].reps ? formatReps(sets[0].reps) : '—';
      const band = sets[0].bandColor;
      return band ? `${sets.length}×${repsStr} @ ${band}` : `${sets.length}×${repsStr}`;
    }
    return sets
      .map((s) => {
        const r = s.reps ? formatReps(s.reps) : '—';
        const b = s.bandColor ?? '—';
        return `${b}×${r}`;
      })
      .join(', ');
  }

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

  const allSameReps = sets.every(
    (s) =>
      s.reps?.min === sets[0].reps?.min && s.reps?.max === sets[0].reps?.max,
  );
  const allSameWeight = sets.every((s) => s.weight === sets[0].weight);

  if (allSameReps && allSameWeight) {
    const repsStr = sets[0].reps ? formatReps(sets[0].reps) : '—';
    const w = sets[0].weight;
    return w !== undefined
      ? `${sets.length}×${repsStr} @ ${w} ${weightUnit}`
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

export function formatSchedule(schedule: Schedule): string {
  if (schedule.kind === 'frequency') {
    const noun = schedule.times === 1 ? 'time' : 'times';
    return `${schedule.times} ${noun} / ${schedule.period}`;
  }
  const days = schedule.days;
  if (days.length === 0) return 'No schedule';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS_LONG[d].slice(0, 3))
    .join(', ');
}
