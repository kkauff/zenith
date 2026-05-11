// Helpers for "what should I do today" + adherence percentages.
//
// Adherence model: for any date range, every exercise contributes some
// `expected` amount (units of "should-do"s) and some `completed` amount
// (instances logged). Adherence = sum(completed) / sum(expected).
//
//   weekly-days: expected = number of matching days in the range.
//   frequency:   expected = times × range-days / period-days  (rough
//                proration; period-days is 7 for week, 30 for month).
//
// The math falls out cleanly: a monthly goal of 10 produces expected≈5 by
// mid-month, expected≈10 by month end. A weekly-days goal of M/W/F produces
// expected=3 over a full week. Both can sum into the same number.
//
// Occurrences before a program's createdAt don't count against you (you
// can't have failed to do something the plan didn't exist for yet).

import type {
  Instance,
  LibraryExercise,
  Program,
  Exercise,
  RestDay,
  RollupGoal,
  Schedule,
} from './types';
import { resolveExerciseTags } from './instance';

export type ScheduledExercise = {
  program: Program;
  exercise: Exercise;
};

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date: Date): Date {
  // Sunday-start week, matching JS getDay() convention.
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setMonth(d.getMonth() + 1, 0); // day 0 of next month = last day of this month
  return endOfDay(d);
}

// YYYY-MM-DD in local time. Used as the doc id for RestDay and as the lookup
// key for "is this day a rest day?". Local-time on purpose — the user's
// concept of "today" is their wall clock, not UTC.
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function restDayFor(
  restDays: RestDay[],
  date: Date,
): RestDay | undefined {
  const key = dateKey(date);
  return restDays.find((r) => r.date === key);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayName(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

// Time-of-day greeting + first name. Reads `getHours()` so it picks up the
// user's local timezone automatically. Falls back to no name when the auth
// profile doesn't expose one.
export function greetingFor(date: Date, fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  const h = date.getHours();
  let prefix: string;
  if (h < 6) prefix = `Happy ${dayName(date)}`;
  else if (h < 12) prefix = 'Good morning';
  else if (h < 18) prefix = 'Good afternoon';
  else prefix = 'Good evening';
  return first ? `${prefix}, ${first}` : prefix;
}

// --- Period helpers -----------------------------------------------------

function startOfPeriod(date: Date, period: 'week' | 'month'): Date {
  return period === 'week' ? startOfWeek(date) : startOfMonth(date);
}

function endOfPeriod(date: Date, period: 'week' | 'month'): Date {
  return period === 'week' ? endOfWeek(date) : endOfMonth(date);
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

// --- Today / scheduled --------------------------------------------------

// All exercises across all programs that are pinned to the given day via a
// weekly-days schedule. Frequency-scheduled exercises are NOT included
// here — they're surfaced separately via `frequencyGoalsForDay`.
export function exercisesForDay(
  programs: Program[],
  date: Date,
): ScheduledExercise[] {
  const dow = date.getDay();
  const out: ScheduledExercise[] = [];
  for (const program of programs) {
    for (const exercise of program.exercises) {
      if (
        exercise.schedule.kind === 'weekly-days' &&
        exercise.schedule.days.includes(dow)
      ) {
        out.push({ program, exercise });
      }
    }
  }
  return out;
}

export function instancesOnDay(instances: Instance[], date: Date): Instance[] {
  return instances.filter((i) => isSameDay(new Date(i.loggedAt), date));
}

// --- Frequency goals ----------------------------------------------------

export type FrequencyGoalView = {
  program: Program;
  exercise: Exercise;
  period: 'week' | 'month';
  target: number;
  completedInPeriod: number;
  remaining: number;
  // remaining ÷ days remaining in the period. Higher = more urgent.
  priority: number;
};

// Frequency-scheduled exercises that still have remaining target for the
// current period. Sorted by urgency (most pressing first). Goals already
// met for the period are dropped — they fall back into the ad-hoc picker.
export function frequencyGoalsForDay(
  programs: Program[],
  instances: Instance[],
  today: Date,
): FrequencyGoalView[] {
  const todayDay = startOfDay(today);
  const out: FrequencyGoalView[] = [];

  for (const program of programs) {
    const programStart = startOfDay(new Date(program.createdAt));
    if (todayDay < programStart) continue;
    for (const exercise of program.exercises) {
      if (exercise.schedule.kind !== 'frequency') continue;
      const period = exercise.schedule.period;
      const target = exercise.schedule.times;
      if (target <= 0) continue;
      const periodStart = startOfPeriod(today, period);
      const periodEnd = endOfPeriod(today, period);

      const completedInPeriod = instances.filter((i) => {
        if (i.exerciseId !== exercise.id) return false;
        const t = new Date(i.loggedAt);
        return t >= periodStart && t <= periodEnd;
      }).length;

      const remaining = target - completedInPeriod;
      if (remaining <= 0) continue;

      // Days remaining INCLUDING today (so a same-day deadline gives
      // priority of `remaining`, not infinity).
      const daysRemaining = Math.max(1, daysBetween(todayDay, periodEnd) + 1);
      const priority = remaining / daysRemaining;

      out.push({
        program,
        exercise,
        period,
        target,
        completedInPeriod,
        remaining,
        priority,
      });
    }
  }

  out.sort((a, b) => b.priority - a.priority);
  return out;
}

// --- Adherence ---------------------------------------------------------

// Days in a "period" for proration purposes. Uses 7 for weekly and a fixed
// 30 for monthly (keeps the math stable without month-by-month wobble; the
// user explicitly described "rough proration").
function periodDays(period: 'week' | 'month'): number {
  return period === 'week' ? 7 : 30;
}

// How many "should-do"s does this schedule contribute over [startDate,
// endDate], given the program's createdAt? Range and schedule semantics:
//
//   - weekly-days: count days in range that match schedule.days.
//   - frequency:   times × (range-days / period-days). Linear in days, so
//                  cross-period boundaries don't need special handling.
//
// Rest days are dropped before counting: they're "out of program" by the
// user's choice, so they neither earn nor lose adherence credit. For
// weekly-days that means a scheduled rest day doesn't count toward
// expected; for frequency it shrinks the divisor (range-days minus rest
// days in range).
function expectedForRange(
  schedule: Schedule,
  programCreatedAt: number,
  startDate: Date,
  endDate: Date,
  restDayKeys?: ReadonlySet<string>,
): number {
  const programStart = startOfDay(new Date(programCreatedAt));
  const start = startOfDay(startDate) > programStart
    ? startOfDay(startDate)
    : programStart;
  const end = startOfDay(endDate);
  if (end < start) return 0;

  if (schedule.kind === 'weekly-days') {
    let count = 0;
    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      if (restDayKeys?.has(dateKey(cursor))) continue;
      if (schedule.days.includes(cursor.getDay())) count += 1;
    }
    return count;
  }

  let rangeDays = daysBetween(start, end) + 1;
  if (restDayKeys?.size) {
    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      if (restDayKeys.has(dateKey(cursor))) rangeDays -= 1;
    }
  }
  if (rangeDays <= 0) return 0;
  return schedule.times * (rangeDays / periodDays(schedule.period));
}

function completedForRange(
  exerciseId: string,
  instances: Instance[],
  startDate: Date,
  endDate: Date,
): number {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  return instances.filter((i) => {
    if (i.exerciseId !== exerciseId) return false;
    const t = new Date(i.loggedAt);
    return t >= start && t <= end;
  }).length;
}

// Returns null when nothing was scheduled in the range — UI can show "—" to
// distinguish "no plan" from "0% completion".
export function adherence(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  startDate: Date,
  endDate: Date,
): number | null {
  const restKeys = new Set(restDays.map((r) => r.date));
  let totalExpected = 0;
  let totalCompleted = 0;

  for (const program of programs) {
    for (const exercise of program.exercises) {
      const expected = expectedForRange(
        exercise.schedule,
        program.createdAt,
        startDate,
        endDate,
        restKeys,
      );
      if (expected === 0) continue;
      const completed = completedForRange(
        exercise.id,
        instances,
        startDate,
        endDate,
      );
      totalExpected += expected;
      totalCompleted += completed;
    }
  }

  if (totalExpected === 0) return null;
  return (totalCompleted / totalExpected) * 100;
}

export function adherenceToday(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  today: Date,
): number | null {
  return adherence(programs, instances, restDays, today, today);
}

export function adherenceWeek(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  today: Date,
): number | null {
  return adherence(programs, instances, restDays, startOfWeek(today), today);
}

export function adherenceMonth(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  today: Date,
): number | null {
  return adherence(programs, instances, restDays, startOfMonth(today), today);
}

export type DayAdherence = {
  date: Date;
  expected: number;
  completed: number;
};

export type AdherenceCategory = 'cardio' | 'strength';

function exerciseCategory(ex: Exercise): AdherenceCategory {
  return ex.trackingType === 'cardio' ? 'cardio' : 'strength';
}

// Per-day adherence breakdown for a date range. Returns one entry per day
// (inclusive of both endpoints). `expected` is fractional for frequency
// schedules (e.g. 2/week → 0.286 per day). `completed` is the count of
// instances logged that day for matching exercises.
//
// `filter` applies OR semantics across all three dimensions (program /
// weekday / category), mirroring how the volume charts combine tag +
// exercise chips. A (day, exercise) pair is included if ANY active filter
// matches. When all filter sets are empty (or absent), no filter is
// applied. A category set containing both 'cardio' and 'strength' is also
// effectively no filter — callers handle that simplification themselves.
export function dailyAdherence(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  startDate: Date,
  endDate: Date,
  filter?: {
    programIds?: ReadonlySet<string>;
    weekdays?: ReadonlySet<number>;
    categories?: ReadonlySet<AdherenceCategory>;
  },
): DayAdherence[] {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const restKeys = new Set(restDays.map((r) => r.date));
  const hasFilter = !!(
    filter?.programIds?.size ||
    filter?.weekdays?.size ||
    filter?.categories?.size
  );
  const out: DayAdherence[] = [];
  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const day = new Date(cursor);
    const weekday = day.getDay();
    // Rest days are out-of-program: zero expected so they don't sink the
    // adherence average, but emit a row so chart layers can mark them.
    if (restKeys.has(dateKey(day))) {
      out.push({ date: day, expected: 0, completed: 0 });
      continue;
    }
    let expected = 0;
    let completed = 0;
    for (const program of programs) {
      for (const exercise of program.exercises) {
        if (hasFilter) {
          const progMatch = filter?.programIds?.has(program.id) ?? false;
          const dayMatch = filter?.weekdays?.has(weekday) ?? false;
          const catMatch =
            filter?.categories?.has(exerciseCategory(exercise)) ?? false;
          if (!progMatch && !dayMatch && !catMatch) continue;
        }
        const exp = expectedForRange(
          exercise.schedule,
          program.createdAt,
          day,
          day,
        );
        if (exp === 0) continue;
        const com = completedForRange(exercise.id, instances, day, day);
        expected += exp;
        completed += com;
      }
    }
    out.push({ date: day, expected, completed });
  }
  return out;
}

// Whether an instance's resolved exercise matches an active filter set,
// using the same OR semantics as dailyAdherence. Used for filtering
// non-adherence-derived views (e.g. time-of-day histogram).
export function instanceMatchesFilter(
  inst: Instance,
  programs: Program[],
  filter: {
    programIds?: ReadonlySet<string>;
    weekdays?: ReadonlySet<number>;
    categories?: ReadonlySet<AdherenceCategory>;
  },
): boolean {
  const hasFilter = !!(
    filter.programIds?.size ||
    filter.weekdays?.size ||
    filter.categories?.size
  );
  if (!hasFilter) return true;
  if (inst.programId && filter.programIds?.has(inst.programId)) return true;
  if (filter.weekdays?.has(new Date(inst.loggedAt).getDay())) return true;
  if (filter.categories?.size) {
    // Need to resolve the exercise's category from program → exercise.
    const program = programs.find((p) => p.id === inst.programId);
    const ex = program?.exercises.find((e) => e.id === inst.exerciseId);
    if (ex && filter.categories.has(exerciseCategory(ex))) return true;
    // Fall back to instance's own trackingType if denormalized.
    if (inst.trackingType) {
      const cat: AdherenceCategory =
        inst.trackingType === 'cardio' ? 'cardio' : 'strength';
      if (filter.categories.has(cat)) return true;
    }
  }
  return false;
}

// --- Rollup goals -------------------------------------------------------

// Sum the chosen metric across instances matching the goal's target in the
// given range. Target matches either by exerciseId (specific exercise) or
// by tag (any exercise carrying that tag — picks up program exercises,
// library entries, and ad-hoc catalog logs). For distance goals we only
// count instances whose `cardioUnit` matches the goal's unit (no unit
// conversion yet — the user can pick a consistent unit when creating).
function sumRollupMetric(
  goal: RollupGoal,
  instances: Instance[],
  programs: Program[],
  library: LibraryExercise[],
  startDate: Date,
  endDate: Date,
): number {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);
  let total = 0;
  for (const inst of instances) {
    const t = new Date(inst.loggedAt);
    if (t < start || t > end) continue;
    if (goal.target.kind === 'exercise') {
      if (inst.exerciseId !== goal.target.exerciseId) continue;
    } else {
      const tags = resolveExerciseTags(inst, programs, library);
      if (!tags.includes(goal.target.tag)) continue;
    }
    if (goal.metric === 'time') {
      for (const s of inst.sets) {
        if (s.durationSeconds !== undefined) total += s.durationSeconds;
      }
    } else {
      // Distance — only include instances that logged in the matching unit
      // so we don't sum miles + km blindly.
      if (inst.cardioUnit && inst.cardioUnit !== goal.unit) continue;
      for (const s of inst.sets) {
        if (s.distance !== undefined) total += s.distance;
      }
    }
  }
  return total;
}

export type RollupProgressView = {
  program: Program;
  goal: RollupGoal;
  current: number;
  target: number;
  // 'today' for weekly-days mode (only on scheduled days), 'this week' or
  // 'this month' for total-period mode. Used directly in the UI.
  periodLabel: 'today' | 'this week' | 'this month';
};

// All rollup goals that should appear in today's panel — same "show only
// when there's still progress to make" rule as frequency goals. Goals
// already met for the relevant period drop out.
export function rollupProgressForToday(
  programs: Program[],
  instances: Instance[],
  library: LibraryExercise[],
  today: Date,
): RollupProgressView[] {
  const out: RollupProgressView[] = [];
  for (const program of programs) {
    for (const goal of program.rollupGoals ?? []) {
      const view = computeRollupProgress(
        program,
        goal,
        programs,
        instances,
        library,
        today,
      );
      if (!view) continue;
      if (view.current >= view.target) continue;
      out.push(view);
    }
  }
  // Per-day rows first (more immediate), then period totals. Stable within
  // each group based on insertion order so the user sees their goals in
  // the order they created them.
  out.sort((a, b) => {
    const aPerDay = a.goal.schedule.kind === 'weekly-days' ? 0 : 1;
    const bPerDay = b.goal.schedule.kind === 'weekly-days' ? 0 : 1;
    return aPerDay - bPerDay;
  });
  return out;
}

function computeRollupProgress(
  program: Program,
  goal: RollupGoal,
  programs: Program[],
  instances: Instance[],
  library: LibraryExercise[],
  today: Date,
): RollupProgressView | null {
  if (goal.schedule.kind === 'weekly-days') {
    if (!goal.schedule.days.includes(today.getDay())) return null;
    const current = sumRollupMetric(
      goal,
      instances,
      programs,
      library,
      today,
      today,
    );
    return {
      program,
      goal,
      current,
      target: goal.schedule.amount,
      periodLabel: 'today',
    };
  }
  const period = goal.schedule.period;
  const periodStart =
    period === 'week' ? startOfWeek(today) : startOfMonth(today);
  const periodEnd = period === 'week' ? endOfWeek(today) : endOfMonth(today);
  const current = sumRollupMetric(
    goal,
    instances,
    programs,
    library,
    periodStart,
    periodEnd,
  );
  return {
    program,
    goal,
    current,
    target: goal.schedule.amount,
    periodLabel: period === 'week' ? 'this week' : 'this month',
  };
}
