// Hardcoded rather than stored in Firestore — it's small, versioned with
// the app, and doesn't change per-user. Powers autocomplete suggestions
// and tag/tracking-type inference. Users can still create custom
// exercises that aren't in the catalog; they just have to pick tags
// themselves.

import type {
  Exercise,
  ExerciseTag,
  MovementPattern,
  TrackingType,
} from './types';
import { SINGLE_LEG } from './types';

export type GlobalExercise = {
  slug: string;
  name: string;
  // Matched alongside `name` for fuzzy lookup. Not shown in the UI.
  aliases?: string[];
  tags: ExerciseTag[];
  trackingType: TrackingType;
  // Finer movement dimension powering exercise substitution. Only set on
  // compound lifts; isolation work is left off so it isn't offered as a swap.
  movements?: MovementPattern[];
  // Omitted defaults to 'weightlifting'.
  categoryKey?: string;
};

export const GLOBAL_EXERCISES: GlobalExercise[] = [
  // --- Upper push ---
  { slug: 'bench-press', name: 'Bench Press', tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },
  { slug: 'incline-bench-press', name: 'Incline Bench Press', tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },
  { slug: 'decline-bench-press', name: 'Decline Bench Press', tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },
  { slug: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', aliases: ['db bench'], tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },
  { slug: 'close-grip-bench-press', name: 'Close-Grip Bench Press', tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },
  { slug: 'chest-press-machine', name: 'Chest Press Machine', aliases: ['chest push machine', 'machine chest press', 'chest press'], tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },
  { slug: 'overhead-press', name: 'Overhead Press', aliases: ['ohp', 'military press', 'shoulder press'], tags: ['upper', 'push'], movements: ['vertical-push'], trackingType: 'weight' },
  { slug: 'push-press', name: 'Push Press', tags: ['upper', 'push'], movements: ['vertical-push'], trackingType: 'weight' },
  { slug: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', aliases: ['db shoulder press', 'overhead dumbbell press', 'dumbbell overhead press'], tags: ['upper', 'push'], movements: ['vertical-push'], trackingType: 'weight' },
  { slug: 'shoulder-press-machine', name: 'Shoulder Press Machine', aliases: ['shoulder push machine', 'machine shoulder press'], tags: ['upper', 'push'], movements: ['vertical-push'], trackingType: 'weight' },
  { slug: 'arnold-press', name: 'Arnold Press', tags: ['upper', 'push'], movements: ['vertical-push'], trackingType: 'weight' },
  { slug: 'lateral-raise', name: 'Lateral Raise', aliases: ['side raise'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'front-raise', name: 'Front Raise', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'tricep-pushdown', name: 'Tricep Pushdown', aliases: ['triceps pushdown'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'tricep-extension', name: 'Tricep Extension', aliases: ['triceps extension', 'overhead tricep extension'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'skull-crushers', name: 'Skull Crushers', aliases: ['lying tricep extension'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'dip', name: 'Dip', aliases: ['dips', 'tricep dip'], tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },
  { slug: 'push-up', name: 'Push-up', aliases: ['pushup', 'press-up'], tags: ['upper', 'push'], movements: ['horizontal-push'], trackingType: 'weight' },

  // --- Upper pull ---
  { slug: 'pull-up', name: 'Pull-up', aliases: ['pullup'], tags: ['upper', 'pull'], movements: ['vertical-pull'], trackingType: 'weight' },
  { slug: 'chin-up', name: 'Chin-up', aliases: ['chinup'], tags: ['upper', 'pull'], movements: ['vertical-pull'], trackingType: 'weight' },
  { slug: 'assisted-pull-up', name: 'Assisted Pull-up', aliases: ['assisted pullup'], tags: ['upper', 'pull'], movements: ['vertical-pull'], trackingType: 'weight' },
  { slug: 'pull-up-negatives', name: 'Pull-up Negatives', aliases: ['pull up negatives', 'negative pull-ups', 'negative pull ups', 'pullup negatives'], tags: ['upper', 'pull'], movements: ['vertical-pull'], trackingType: 'weight' },
  { slug: 'lat-pulldown', name: 'Lat Pulldown', aliases: ['pulldown', 'lat pull down', 'seated cable lat pulldown', 'seated cable pulldown', 'cable pulldown'], tags: ['upper', 'pull'], movements: ['vertical-pull'], trackingType: 'weight' },
  { slug: 'barbell-row', name: 'Barbell Row', aliases: ['bent-over barbell row'], tags: ['upper', 'pull'], movements: ['horizontal-pull'], trackingType: 'weight' },
  { slug: 'bent-over-row', name: 'Bent-over Row', tags: ['upper', 'pull'], movements: ['horizontal-pull'], trackingType: 'weight' },
  { slug: 'dumbbell-row', name: 'Dumbbell Row', aliases: ['db row', 'one-arm row'], tags: ['upper', 'pull'], movements: ['horizontal-pull'], trackingType: 'weight' },
  { slug: 'seated-cable-row', name: 'Seated Cable Row', aliases: ['cable row', 'seated row'], tags: ['upper', 'pull'], movements: ['horizontal-pull'], trackingType: 'weight' },
  { slug: 't-bar-row', name: 'T-Bar Row', tags: ['upper', 'pull'], movements: ['horizontal-pull'], trackingType: 'weight' },
  { slug: 'face-pull', name: 'Face Pull', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'bicep-curl', name: 'Bicep Curl', aliases: ['barbell curl', 'biceps curl'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'hammer-curl', name: 'Hammer Curl', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'preacher-curl', name: 'Preacher Curl', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'reverse-fly', name: 'Reverse Fly', aliases: ['rear delt fly'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'shrug', name: 'Shrug', aliases: ['barbell shrug'], tags: ['upper', 'pull'], trackingType: 'weight' },

  // --- Legs (lower) ---
  { slug: 'back-squat', name: 'Back Squat', aliases: ['squat'], tags: ['lower', 'legs'], movements: ['squat'], trackingType: 'weight' },
  { slug: 'front-squat', name: 'Front Squat', tags: ['lower', 'legs'], movements: ['squat'], trackingType: 'weight' },
  { slug: 'goblet-squat', name: 'Goblet Squat', tags: ['lower', 'legs'], movements: ['squat'], trackingType: 'weight' },
  { slug: 'sumo-squat', name: 'Sumo Squat', tags: ['lower', 'legs'], movements: ['squat'], trackingType: 'weight' },
  { slug: 'leg-press', name: 'Leg Press', tags: ['lower', 'legs'], movements: ['squat'], trackingType: 'weight' },
  // Single-leg lifts carry a primary pattern (squat/hinge) *and* the
  // single-leg modifier so they swap within their own unilateral family
  // (split squats ↔ lunges; single-leg deadlifts ↔ staggered deadlifts)
  // rather than with bilateral squats/deadlifts.
  { slug: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', aliases: ['split squat'], tags: ['lower', 'legs'], movements: ['squat', 'single-leg'], trackingType: 'weight' },
  { slug: 'lunge', name: 'Lunge', aliases: ['lunges'], tags: ['lower', 'legs'], movements: ['squat', 'single-leg'], trackingType: 'weight' },
  { slug: 'walking-lunge', name: 'Walking Lunge', tags: ['lower', 'legs'], movements: ['squat', 'single-leg'], trackingType: 'weight' },
  { slug: 'step-up', name: 'Step-up', aliases: ['step ups'], tags: ['lower', 'legs'], movements: ['squat', 'single-leg'], trackingType: 'weight' },
  { slug: 'deadlift', name: 'Deadlift', aliases: ['conventional deadlift'], tags: ['lower', 'pull'], movements: ['hinge'], trackingType: 'weight' },
  { slug: 'romanian-deadlift', name: 'Romanian Deadlift', aliases: ['rdl'], tags: ['lower', 'pull'], movements: ['hinge'], trackingType: 'weight' },
  { slug: 'sumo-deadlift', name: 'Sumo Deadlift', tags: ['lower', 'pull'], movements: ['hinge'], trackingType: 'weight' },
  { slug: 'single-leg-deadlift', name: 'Single-Leg Deadlift', aliases: ['single-leg rdl', 'single leg rdl', 'sldl', 'single leg dumbbell deadlift', 'single-leg dumbbell deadlift', 'single leg db deadlift'], tags: ['lower', 'pull'], movements: ['hinge', 'single-leg'], trackingType: 'weight' },
  { slug: 'staggered-barbell-deadlift', name: 'Staggered Barbell Deadlift', aliases: ['staggered deadlift', 'staggered stance deadlift', 'b-stance deadlift', 'kickstand deadlift'], tags: ['lower', 'pull'], movements: ['hinge', 'single-leg'], trackingType: 'weight' },
  { slug: 'staggered-trap-bar-deadlift', name: 'Staggered Trap Bar Deadlift', aliases: ['staggered trapbar deadlift', 'staggered trap-bar deadlift'], tags: ['lower', 'pull'], movements: ['hinge', 'single-leg'], trackingType: 'weight' },
  { slug: 'hip-thrust', name: 'Hip Thrust', tags: ['lower', 'legs'], movements: ['hinge'], trackingType: 'weight' },
  { slug: 'glute-bridge', name: 'Glute Bridge', tags: ['lower', 'legs'], movements: ['hinge'], trackingType: 'weight' },
  { slug: 'leg-curl', name: 'Leg Curl', aliases: ['hamstring curl', 'lying leg curl', 'seated leg curl'], tags: ['lower', 'legs'], movements: ['hamstring-curl'], trackingType: 'weight' },
  { slug: 'stability-ball-hamstring-curl', name: 'Stability Ball Hamstring Curl', aliases: ['stability ball hamstring curls', 'swiss ball hamstring curl', 'ball hamstring curl', 'stability ball leg curl'], tags: ['lower', 'legs'], movements: ['hamstring-curl'], trackingType: 'count' },
  { slug: 'nordic-curl', name: 'Nordic Curl', aliases: ['nordic curls', 'nordic hamstring curl', 'nordic ham curl'], tags: ['lower', 'legs'], movements: ['hamstring-curl'], trackingType: 'count' },
  { slug: 'leg-extension', name: 'Leg Extension', tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'calf-raise', name: 'Calf Raise', aliases: ['standing calf raise'], tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'wall-sit', name: 'Wall Sit', tags: ['lower', 'legs'], trackingType: 'time' },

  // --- Core ---
  { slug: 'plank', name: 'Plank', tags: ['core'], trackingType: 'time' },
  { slug: 'side-plank', name: 'Side Plank', tags: ['core'], trackingType: 'time' },
  { slug: 'hollow-hold', name: 'Hollow Hold', tags: ['core'], trackingType: 'time' },
  { slug: 'l-sit', name: 'L-Sit', tags: ['core'], trackingType: 'time' },
  { slug: 'dead-hang', name: 'Dead Hang', tags: ['upper', 'core'], trackingType: 'time' },
  { slug: 'hanging-leg-raise', name: 'Hanging Leg Raise', tags: ['core'], trackingType: 'weight' },
  { slug: 'crunch', name: 'Crunch', aliases: ['crunches'], tags: ['core'], trackingType: 'weight' },
  { slug: 'sit-up', name: 'Sit-up', aliases: ['situp'], tags: ['core'], trackingType: 'weight' },
  { slug: 'bicycle-crunch', name: 'Bicycle Crunch', tags: ['core'], trackingType: 'weight' },
  { slug: 'russian-twist', name: 'Russian Twist', tags: ['core'], trackingType: 'weight' },
  { slug: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', aliases: ['ab roller'], tags: ['core'], trackingType: 'weight' },

  // --- Warm up ---
  { slug: 'banded-lateral-walks', name: 'Banded Lateral Walks', tags: ['lower'], trackingType: 'band', categoryKey: 'warmup' },
  { slug: 'banded-monster-walks', name: 'Banded Monster Walks', tags: ['lower'], trackingType: 'band', categoryKey: 'warmup' },
  { slug: 'banded-pull-aparts', name: 'Banded Pull Aparts', tags: ['upper'], trackingType: 'band', categoryKey: 'warmup' },

  // --- Rehab ---
  { slug: 'single-leg-glute-bridge', name: 'Single Leg Glute Bridge', tags: [], trackingType: 'weight', categoryKey: 'rehab' },
  { slug: 'standing-hip-rotations', name: 'Standing Hip Rotations', tags: [], trackingType: 'count', categoryKey: 'rehab' },
];

// --- Fuzzy matching ------------------------------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Tuned so common gym typos like "bnch press" still match "Bench Press"
// while gibberish doesn't. Substring beats token overlap beats edit
// distance.
function pairScore(query: string, candidate: string): number {
  const a = normalize(query);
  const b = normalize(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.includes(a)) return 0.9;
  if (a.includes(b)) return 0.85;

  const tA = new Set(a.split(' ').filter(Boolean));
  const tB = new Set(b.split(' ').filter(Boolean));
  const inter = [...tA].filter((t) => tB.has(t)).length;
  if (inter > 0) {
    const union = tA.size + tB.size - inter;
    const tokenScore = 0.55 + 0.4 * (inter / union);
    if (tokenScore >= 0.6) return tokenScore;
  }

  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const lev = 1 - dist / maxLen;
  // Cap typo-only matches lower so substring/token always wins.
  return lev >= 0.7 ? lev * 0.85 : 0;
}

function bestScore(query: string, ex: GlobalExercise): number {
  let best = pairScore(query, ex.name);
  for (const alias of ex.aliases ?? []) {
    const s = pairScore(query, alias);
    if (s > best) best = s;
  }
  return best;
}

export function suggestExercises(
  query: string,
  limit = 3,
  threshold = 0.6,
  categoryKey?: string,
): GlobalExercise[] {
  const q = normalize(query);
  if (!q) return [];
  const pool = categoryKey
    ? GLOBAL_EXERCISES.filter(
        (ex) => (ex.categoryKey ?? 'weightlifting') === categoryKey,
      )
    : GLOBAL_EXERCISES;
  const scored = pool
    .map((ex) => ({ ex, score: bestScore(q, ex) }))
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.ex);
}

// `id` is the catalog slug so repeated picks share a stable
// instance.exerciseId for grouping across ad-hoc logs.
export function exerciseFromGlobal(g: GlobalExercise): Exercise {
  return {
    id: g.slug,
    name: g.name,
    schedule: { kind: 'weekly-days', days: [] },
    trackingType: g.trackingType,
    plannedSets: [],
    tags: g.tags,
    movements: g.movements,
  };
}

// Movement patterns for an exercise, falling back to a name/alias lookup
// against the catalog. The fallback lets exercises saved before the
// `movements` field existed still resolve a pattern at runtime — no
// migration needed.
export function resolveMovements(exercise: {
  name: string;
  movements?: MovementPattern[];
}): MovementPattern[] {
  if (exercise.movements && exercise.movements.length > 0) {
    return exercise.movements;
  }
  return findGlobalByName(exercise.name)?.movements ?? [];
}

// Catalog exercises that are valid substitutes for the given exercise.
// A candidate qualifies when it shares a *primary* movement pattern AND
// has the same single-leg status — so `single-leg` acts as a modifier that
// keeps unilateral lifts (split squats, single-leg deadlifts) from swapping
// with their bilateral counterparts (back squat, conventional deadlift).
// Excludes the exercise itself, including when it resolved via an alias
// (e.g. "chest push machine" → "Chest Press Machine").
export function substitutesFor(exercise: {
  name: string;
  movements?: MovementPattern[];
}): GlobalExercise[] {
  const patterns = resolveMovements(exercise);
  if (patterns.length === 0) return [];
  const isSingleLeg = patterns.includes(SINGLE_LEG);
  const primaries = patterns.filter((m) => m !== SINGLE_LEG);
  const selfName = normalize(exercise.name);
  const selfSlug = findGlobalByName(exercise.name)?.slug;
  return GLOBAL_EXERCISES.filter((g) => {
    if (normalize(g.name) === selfName || g.slug === selfSlug) return false;
    const gm = g.movements ?? [];
    if (gm.length === 0) return false;
    if (gm.includes(SINGLE_LEG) !== isSingleLeg) return false;
    // No primary pattern (single-leg only) — match any other single-leg.
    if (primaries.length === 0) return gm.includes(SINGLE_LEG);
    return primaries.some((m) => gm.includes(m));
  });
}

export function isExactCatalogMatch(name: string): boolean {
  const q = normalize(name);
  if (!q) return false;
  return GLOBAL_EXERCISES.some(
    (ex) =>
      normalize(ex.name) === q ||
      (ex.aliases ?? []).some((a) => normalize(a) === q),
  );
}

// Case- and punctuation-insensitive lookup. Used as a tag/metadata
// fallback when a custom-named exercise happens to match a catalog item.
export function findGlobalByName(name: string): GlobalExercise | undefined {
  const q = normalize(name);
  if (!q) return undefined;
  return GLOBAL_EXERCISES.find(
    (ex) =>
      normalize(ex.name) === q ||
      (ex.aliases ?? []).some((a) => normalize(a) === q),
  );
}
