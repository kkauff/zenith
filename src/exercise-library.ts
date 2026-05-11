// Curated catalog of common weightlifting exercises shared across all users.
//
// This is intentionally hardcoded rather than stored in Firestore: it's small,
// versioned with the app, doesn't need security rules, and doesn't change
// per-user. The app uses it for two purposes:
//
//   1. Autocomplete-style suggestions when a user types an exercise name —
//      so "bnch press" surfaces "Bench Press" before the user creates a new
//      slightly-different entry.
//   2. Default tags + tracking type when the user picks a suggestion.
//
// Users can still create custom exercises that aren't in the catalog;
// they just have to pick tags themselves.

import type {
  CardioActivity,
  DistanceUnit,
  Exercise,
  ExerciseTag,
  TrackingType,
} from './types';

export type GlobalExercise = {
  slug: string;
  name: string;
  // Common abbreviations / alternate names. Matched against user input
  // alongside `name` for fuzzy lookup. Not shown in the suggestion UI.
  aliases?: string[];
  tags: ExerciseTag[];
  trackingType: TrackingType;
  // Cardio-only — preset for catalog entries so picking one auto-fills the
  // activity + unit choice.
  cardioActivity?: CardioActivity;
  cardioUnit?: DistanceUnit;
  cardioGoalKind?: 'distance' | 'time';
};

export const GLOBAL_EXERCISES: GlobalExercise[] = [
  // --- Upper push ---
  { slug: 'bench-press', name: 'Bench Press', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'incline-bench-press', name: 'Incline Bench Press', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'decline-bench-press', name: 'Decline Bench Press', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', aliases: ['db bench'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'close-grip-bench-press', name: 'Close-Grip Bench Press', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'overhead-press', name: 'Overhead Press', aliases: ['ohp', 'military press', 'shoulder press'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'push-press', name: 'Push Press', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', aliases: ['db shoulder press'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'arnold-press', name: 'Arnold Press', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'lateral-raise', name: 'Lateral Raise', aliases: ['side raise'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'front-raise', name: 'Front Raise', tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'tricep-pushdown', name: 'Tricep Pushdown', aliases: ['triceps pushdown'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'tricep-extension', name: 'Tricep Extension', aliases: ['triceps extension', 'overhead tricep extension'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'skull-crushers', name: 'Skull Crushers', aliases: ['lying tricep extension'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'dip', name: 'Dip', aliases: ['dips', 'tricep dip'], tags: ['upper', 'push'], trackingType: 'weight' },
  { slug: 'push-up', name: 'Push-up', aliases: ['pushup', 'press-up'], tags: ['upper', 'push'], trackingType: 'weight' },

  // --- Upper pull ---
  { slug: 'pull-up', name: 'Pull-up', aliases: ['pullup'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'chin-up', name: 'Chin-up', aliases: ['chinup'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'assisted-pull-up', name: 'Assisted Pull-up', aliases: ['assisted pullup'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'lat-pulldown', name: 'Lat Pulldown', aliases: ['pulldown'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'barbell-row', name: 'Barbell Row', aliases: ['bent-over barbell row'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'bent-over-row', name: 'Bent-over Row', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'dumbbell-row', name: 'Dumbbell Row', aliases: ['db row', 'one-arm row'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'seated-cable-row', name: 'Seated Cable Row', aliases: ['cable row', 'seated row'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 't-bar-row', name: 'T-Bar Row', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'face-pull', name: 'Face Pull', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'bicep-curl', name: 'Bicep Curl', aliases: ['barbell curl', 'biceps curl'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'hammer-curl', name: 'Hammer Curl', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'preacher-curl', name: 'Preacher Curl', tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'reverse-fly', name: 'Reverse Fly', aliases: ['rear delt fly'], tags: ['upper', 'pull'], trackingType: 'weight' },
  { slug: 'shrug', name: 'Shrug', aliases: ['barbell shrug'], tags: ['upper', 'pull'], trackingType: 'weight' },

  // --- Legs (lower) ---
  { slug: 'back-squat', name: 'Back Squat', aliases: ['squat'], tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'front-squat', name: 'Front Squat', tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'goblet-squat', name: 'Goblet Squat', tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'leg-press', name: 'Leg Press', tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', aliases: ['split squat'], tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'lunge', name: 'Lunge', aliases: ['lunges'], tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'walking-lunge', name: 'Walking Lunge', tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'deadlift', name: 'Deadlift', aliases: ['conventional deadlift'], tags: ['lower', 'pull'], trackingType: 'weight' },
  { slug: 'romanian-deadlift', name: 'Romanian Deadlift', aliases: ['rdl'], tags: ['lower', 'pull'], trackingType: 'weight' },
  { slug: 'sumo-deadlift', name: 'Sumo Deadlift', tags: ['lower', 'pull'], trackingType: 'weight' },
  { slug: 'hip-thrust', name: 'Hip Thrust', tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'glute-bridge', name: 'Glute Bridge', tags: ['lower', 'legs'], trackingType: 'weight' },
  { slug: 'leg-curl', name: 'Leg Curl', aliases: ['hamstring curl'], tags: ['lower', 'legs'], trackingType: 'weight' },
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

  // --- Cardio ---
  { slug: 'running', name: 'Running', tags: ['cardio'], trackingType: 'cardio',
    cardioActivity: 'running', cardioUnit: 'miles', cardioGoalKind: 'distance' },
  { slug: 'treadmill-running', name: 'Treadmill Running', aliases: ['treadmill'], tags: ['cardio'], trackingType: 'cardio',
    cardioActivity: 'treadmill-running', cardioUnit: 'miles', cardioGoalKind: 'distance' },
  { slug: 'outdoor-bike', name: 'Outdoor Bike', aliases: ['cycling', 'road bike'], tags: ['cardio'], trackingType: 'cardio',
    cardioActivity: 'outdoor-bike', cardioUnit: 'miles', cardioGoalKind: 'distance' },
  { slug: 'indoor-bike', name: 'Indoor Bike', aliases: ['stationary bike', 'spin bike', 'peloton'], tags: ['cardio'], trackingType: 'cardio',
    cardioActivity: 'indoor-bike', cardioUnit: 'miles', cardioGoalKind: 'time' },
  { slug: 'elliptical', name: 'Elliptical', tags: ['cardio'], trackingType: 'cardio',
    cardioActivity: 'elliptical', cardioUnit: 'miles', cardioGoalKind: 'time' },
  { slug: 'stairmaster', name: 'Stairmaster', aliases: ['stair climber'], tags: ['cardio'], trackingType: 'cardio',
    cardioActivity: 'stairmaster', cardioUnit: 'miles', cardioGoalKind: 'time' },
  { slug: 'swimming', name: 'Swimming', aliases: ['swim'], tags: ['cardio'], trackingType: 'cardio',
    cardioActivity: 'swimming', cardioUnit: 'yards', cardioGoalKind: 'distance' },
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
  // Single rolling row to keep memory tiny — we don't need the full matrix.
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

// Single-pair similarity score in [0, 1]. Substring is the strongest signal,
// followed by token overlap (handles word-order differences), then
// Levenshtein distance (handles typos). Tuned so common gym typos like
// "bnch press" still match "Bench Press" while gibberish doesn't.
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
  // Cap typo-only matches lower so a prefix match always beats a typo match.
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

// Top suggestions for a user-typed exercise name. Empty input → no
// suggestions (we don't want to suggest before they've started typing).
export function suggestExercises(
  query: string,
  limit = 3,
  threshold = 0.6,
): GlobalExercise[] {
  const q = normalize(query);
  if (!q) return [];
  const scored = GLOBAL_EXERCISES.map((ex) => ({
    ex,
    score: bestScore(q, ex),
  }))
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.ex);
}

// Build a synthetic Exercise from a global-catalog entry so the home-screen
// ad-hoc flow can render it through the same TodayExerciseCard as a
// program-attached exercise. The synthesized exercise has no schedule and
// no planned sets — the SetEditor handles `plannedSets: []` gracefully.
// `id` uses the catalog slug so repeated picks of the same global produce
// stable instance.exerciseId values.
export function exerciseFromGlobal(g: GlobalExercise): Exercise {
  return {
    id: g.slug,
    name: g.name,
    schedule: { kind: 'weekly-days', days: [] },
    trackingType: g.trackingType,
    plannedSets: [],
    tags: g.tags,
    cardioActivity: g.cardioActivity,
    cardioUnit: g.cardioUnit,
    cardioGoalKind: g.cardioGoalKind,
  };
}

// True when the user's typed name already matches a catalog entry exactly
// (case-insensitive). Used to suppress the suggestion row once they've
// converged on a name in the library.
export function isExactCatalogMatch(name: string): boolean {
  const q = normalize(name);
  if (!q) return false;
  return GLOBAL_EXERCISES.some(
    (ex) =>
      normalize(ex.name) === q ||
      (ex.aliases ?? []).some((a) => normalize(a) === q),
  );
}

// Find a catalog entry by display name or alias (case- and punctuation-
// insensitive). Used as a last-resort tag/metadata fallback for instances
// whose program-exercise was custom-defined (so neither slug nor library
// entry knows the canonical tags), but the typed name still matches a
// catalog item.
export function findGlobalByName(name: string): GlobalExercise | undefined {
  const q = normalize(name);
  if (!q) return undefined;
  return GLOBAL_EXERCISES.find(
    (ex) =>
      normalize(ex.name) === q ||
      (ex.aliases ?? []).some((a) => normalize(a) === q),
  );
}
