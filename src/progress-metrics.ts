import type { Muscle } from 'react-body-highlighter';
import {
  resolveExerciseTags,
  resolveTrackingType,
} from './instance';
import type {
  ExerciseTag,
  Instance,
  LibraryExercise,
  Program,
} from './types';

export function computeE1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export type WeightSessionMetric = {
  kind: 'weight';
  value: number;
  topSet: { weight: number; reps: number };
};

export type TimeSessionMetric = {
  kind: 'time';
  value: number;
  topSet: { durationSeconds: number };
};

export type SessionMetric = WeightSessionMetric | TimeSessionMetric;

// For weight-based lifts the "top set" is the set with the highest
// e1RM — not the heaviest, since 100lb x 5 (e1RM ≈ 117) beats
// 105lb x 2 (e1RM ≈ 112). For time-based lifts, longest hold wins.
// For weight-based lifts the "top set" is the set with the highest
// e1RM — not the heaviest, since 100lb x 5 (e1RM ≈ 117) beats
// 105lb x 2 (e1RM ≈ 112). For time-based lifts, longest hold wins.
//
// Assisted exercises use negative weights (e.g. −60 lb = 60 lb of help).
// Raw Epley on a negative gives wrong rankings, so we compute the e1RM on
// the effective load (bodyWeight + weight) — e.g. 150 + (−60) = 90 lb,
// e1RM ≈ 126 lb. `value` stores this effective e1RM so set selection and
// PR detection are correct; `topSet.weight` stays raw so display shows what
// was actually set on the machine. Callers that need the display 1RM for an
// assisted exercise should convert back: displayE1RM = value − bodyWeight.
export function sessionMetric(
  inst: Instance,
  programs: Program[],
  library: LibraryExercise[],
  bodyWeight = 150,
): SessionMetric | null {
  const tt = resolveTrackingType(inst, programs, library);
  if (tt === 'weight') {
    let best: { e1rm: number; weight: number; reps: number } | null = null;
    for (const s of inst.sets) {
      if (s.weight === undefined || s.reps === undefined || s.reps <= 0) {
        continue;
      }
      const effectiveWeight =
        s.weight < 0 ? bodyWeight + s.weight : s.weight;
      const e1rm = computeE1RM(Math.max(effectiveWeight, 0.1), s.reps);
      if (!best || e1rm > best.e1rm) {
        best = { e1rm, weight: s.weight, reps: s.reps };
      }
    }
    if (!best) return null;
    return {
      kind: 'weight',
      value: best.e1rm,
      topSet: { weight: best.weight, reps: best.reps },
    };
  }
  if (tt === 'time') {
    let longest: number | null = null;
    for (const s of inst.sets) {
      if (s.durationSeconds === undefined || s.durationSeconds <= 0) continue;
      if (longest === null || s.durationSeconds > longest) {
        longest = s.durationSeconds;
      }
    }
    if (longest === null) return null;
    return {
      kind: 'time',
      value: longest,
      topSet: { durationSeconds: longest },
    };
  }
  return null;
}

// Only push/pull/legs/core feed the body map and the four-group bar
// chart. The broader upper/lower tags would double-credit a set tagged
// "push,upper" if mixed in.
export const BALANCE_TAGS = ['push', 'pull', 'legs', 'core'] as const;
export type BalanceTag = (typeof BALANCE_TAGS)[number];

export const BALANCE_TAG_LABEL: Record<BalanceTag, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  core: 'Core',
};

// react-body-highlighter has no separate `lats` or `rear-delts` strings
// in its vocabulary — `upper-back` and `back-deltoids` are the closest.
export const tagToMuscles: Record<BalanceTag, Muscle[]> = {
  push: ['chest', 'triceps', 'front-deltoids'],
  pull: ['upper-back', 'biceps', 'back-deltoids'],
  legs: ['quadriceps', 'hamstring', 'gluteal', 'calves'],
  core: ['abs', 'obliques', 'lower-back'],
};

function isBalanceTag(t: ExerciseTag): t is BalanceTag {
  return (BALANCE_TAGS as readonly string[]).includes(t);
}

function setHasValue(s: Instance['sets'][number]): boolean {
  if (s.weight !== undefined && s.reps !== undefined && s.reps > 0) return true;
  if (s.durationSeconds !== undefined && s.durationSeconds > 0) return true;
  return false;
}

// One populated set on a `push`-tagged exercise = +1 push. A set tagged
// "push,pull" contributes to both — rare but possible if the user has
// tagged it that way.
export function setCountByBalanceTag(
  instances: Instance[],
  programs: Program[],
  library: LibraryExercise[],
  from: Date,
  to: Date,
): Record<BalanceTag, number> {
  const out: Record<BalanceTag, number> = { push: 0, pull: 0, legs: 0, core: 0 };
  const fromMs = from.getTime();
  const toMs = to.getTime();
  for (const inst of instances) {
    if (inst.loggedAt < fromMs || inst.loggedAt >= toMs) continue;
    const balanceTags = resolveExerciseTags(inst, programs, library).filter(
      isBalanceTag,
    );
    if (balanceTags.length === 0) continue;
    for (const s of inst.sets) {
      if (!setHasValue(s)) continue;
      for (const bt of balanceTags) out[bt] += 1;
    }
  }
  return out;
}

// Approximation: muscle-level set counts are derived from tags, not from
// the exercise's actual biomechanics. A push set credits chest, triceps,
// and front-deltoids equally — fine for "am I balanced?", not for
// hypertrophy-level analysis.
export function setCountByMuscle(
  instances: Instance[],
  programs: Program[],
  library: LibraryExercise[],
  from: Date,
  to: Date,
): Map<Muscle, number> {
  const out = new Map<Muscle, number>();
  const fromMs = from.getTime();
  const toMs = to.getTime();
  for (const inst of instances) {
    if (inst.loggedAt < fromMs || inst.loggedAt >= toMs) continue;
    const balanceTags = resolveExerciseTags(inst, programs, library).filter(
      isBalanceTag,
    );
    if (balanceTags.length === 0) continue;
    for (const s of inst.sets) {
      if (!setHasValue(s)) continue;
      const muscles = new Set<Muscle>();
      for (const bt of balanceTags) {
        for (const m of tagToMuscles[bt]) muscles.add(m);
      }
      for (const m of muscles) out.set(m, (out.get(m) ?? 0) + 1);
    }
  }
  return out;
}

// 1/2/3 buckets keyed on the user's current week. Percentile-based so
// the colors stay readable whether their week is 20 sets or 200.
// react-body-highlighter expects `frequency` to be a 1-indexed bucket.
export function muscleIntensities(
  counts: Map<Muscle, number>,
): Map<Muscle, 1 | 2 | 3> {
  const out = new Map<Muscle, 1 | 2 | 3>();
  const values = Array.from(counts.values())
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (values.length === 0) return out;
  const p33 = values[Math.floor(values.length * 0.33)];
  const p66 = values[Math.floor(values.length * 0.66)];
  for (const [muscle, count] of counts) {
    if (count <= 0) continue;
    const bucket: 1 | 2 | 3 = count <= p33 ? 1 : count <= p66 ? 2 : 3;
    out.set(muscle, bucket);
  }
  return out;
}

export type Direction = 'up' | 'flat' | 'down';

// Absolute floor of 2 sets keeps the arrow from flipping on noise — going
// 1 → 2 reads as "up 100%" but isn't meaningful for a balance dashboard.
export function setCountDirection(
  thisWeek: number,
  lastWeek: number,
): Direction {
  const absDelta = Math.abs(thisWeek - lastWeek);
  if (absDelta < 2) return 'flat';
  if (lastWeek === 0) return thisWeek > 0 ? 'up' : 'flat';
  const rel = (thisWeek - lastWeek) / lastWeek;
  if (Math.abs(rel) < 0.1) return 'flat';
  return rel > 0 ? 'up' : 'down';
}

export type BalanceCallout =
  | {
      kind: 'push-pull-skew';
      pushSets: number;
      pullSets: number;
      direction: 'push' | 'pull';
    }
  | { kind: 'zero-volume'; group: BalanceTag };

// Push:pull outside [0.6, 1.67] flags the classic injury-risk skew. Zero
// volume in any of the four groups gets its own callout — it's a
// different problem (missing a category) than a skew (over-emphasis).
export function detectImbalances(
  counts: Record<BalanceTag, number>,
): BalanceCallout[] {
  const out: BalanceCallout[] = [];
  for (const g of BALANCE_TAGS) {
    if (counts[g] === 0) out.push({ kind: 'zero-volume', group: g });
  }
  if (counts.push > 0 && counts.pull > 0) {
    const ratio = counts.push / counts.pull;
    if (ratio > 1.67) {
      out.push({
        kind: 'push-pull-skew',
        pushSets: counts.push,
        pullSets: counts.pull,
        direction: 'push',
      });
    } else if (ratio < 0.6) {
      out.push({
        kind: 'push-pull-skew',
        pushSets: counts.push,
        pullSets: counts.pull,
        direction: 'pull',
      });
    }
  }
  return out;
}

export function formatHeldDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}
