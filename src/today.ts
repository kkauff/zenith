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
// The math falls out cleanly: over a rolling 30-day window a monthly goal of
// 10 produces expected≈10, and a weekly-days goal of M/W/F produces expected=3
// over any 7-day window. Both can sum into the same number.
//
// The adherence rings use trailing windows ending today (past 7 / past 30
// days) rather than calendar week/month, so you aren't judged against a full
// period's plan before the days to meet it have elapsed.
//
// Occurrences before a program's createdAt don't count against you (you
// can't have failed to do something the plan didn't exist for yet).

import type {
  Instance,
  Program,
  Exercise,
  Reschedule,
  RestDay,
  Schedule,
} from './types';

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

// `weekStartDay`: 0 = Sunday … 6 = Saturday. Defaults to Monday.
export function startOfWeek(date: Date, weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): Date {
  const d = startOfDay(date);
  const offset = (d.getDay() - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

// Dates strictly after `today` up through the last day of the same week.
// Empty when today is already the week's last day.
export function daysRemainingInWeek(
  today: Date,
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
): Date[] {
  const out: Date[] = [];
  const start = startOfDay(today);
  const endDow = (weekStartDay + 6) % 7;
  const remaining = (endDow - start.getDay() + 7) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

function endOfWeek(date: Date, weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): Date {
  const d = startOfWeek(date, weekStartDay);
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

// Local-time YYYY-MM-DD — matches the user's wall-clock "today", not UTC.
// Doubles as the Firestore doc id for RestDay and Reschedule.
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

function startOfPeriod(
  date: Date,
  period: 'week' | 'month',
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
): Date {
  return period === 'week'
    ? startOfWeek(date, weekStartDay)
    : startOfMonth(date);
}

function endOfPeriod(
  date: Date,
  period: 'week' | 'month',
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
): Date {
  return period === 'week' ? endOfWeek(date, weekStartDay) : endOfMonth(date);
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

// --- Today / scheduled --------------------------------------------------

// All exercises across all programs that are pinned to the given day via a
// weekly-days schedule. Frequency-scheduled exercises are NOT included
// here — they're surfaced separately via `frequencyGoalsForDay`.
//
// Reschedules (push-a-day) shift the moved exerciseIds off their source
// date and onto their target date. If `reschedules` is omitted no shifting
// happens — callers without the data behave identically to the original.
export function exercisesForDay(
  programs: Program[],
  date: Date,
  reschedules?: Reschedule[],
): ScheduledExercise[] {
  const dow = date.getDay();
  const key = dateKey(date);
  const dayStart = startOfDay(date).getTime();
  const movedAway = new Set<string>();
  const movedIn: string[] = [];
  if (reschedules) {
    for (const r of reschedules) {
      if (r.fromDate === key) {
        for (const id of r.exerciseIds) movedAway.add(id);
      }
      if (r.toDate === key) {
        for (const id of r.exerciseIds) movedIn.push(id);
      }
    }
  }

  const out: ScheduledExercise[] = [];
  const seen = new Set<string>();
  for (const program of programs) {
    for (const exercise of program.exercises) {
      // An exercise isn't "scheduled" on days before it was added — this
      // keeps recently-added exercises from reading as missed in the past.
      if (startOfDay(new Date(exerciseCreatedFloor(exercise, program))).getTime() > dayStart) {
        continue;
      }
      if (
        exercise.schedule.kind === 'weekly-days' &&
        exercise.schedule.days.includes(dow) &&
        !movedAway.has(exercise.id)
      ) {
        out.push({ program, exercise });
        seen.add(exercise.id);
      }
    }
  }
  for (const id of movedIn) {
    if (seen.has(id)) continue;
    const resolved = findExercise(programs, id);
    if (!resolved) continue;
    out.push(resolved);
    seen.add(id);
  }
  return out;
}

// Returns null when the exercise has been deleted between a reschedule
// being saved and now — caller filters these out.
export function findExercise(
  programs: Program[],
  exerciseId: string,
): ScheduledExercise | null {
  for (const program of programs) {
    for (const exercise of program.exercises) {
      if (exercise.id === exerciseId) return { program, exercise };
    }
  }
  return null;
}

export function instancesOnDay(instances: Instance[], date: Date): Instance[] {
  return instances.filter((i) => isSameDay(new Date(i.loggedAt), date));
}

// --- Borrowable days ----------------------------------------------------

export type MissedDay = {
  date: Date;
  exercises: ScheduledExercise[];
};

export type WeekdayExercises = {
  dow: number;
  exercises: ScheduledExercise[];
};

export type BorrowableDays = {
  missed: MissedDay[];
  weekdays: WeekdayExercises[];
};

// `missed` = past 7 days (excluding today) that had scheduled work, no
// instances logged, and weren't rest days — sorted newest-first.
// `weekdays` = per-dow roll-up of every weekly-days exercise across all
// programs, dropping dows with nothing pinned.
export function borrowableDays(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  today: Date,
  reschedules?: Reschedule[],
): BorrowableDays {
  const restKeys = new Set(restDays.map((r) => r.date));
  const todayStart = startOfDay(today);

  const missed: MissedDay[] = [];
  for (let i = 1; i <= 7; i++) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    if (restKeys.has(dateKey(day))) continue;
    const dayStart = startOfDay(new Date(day));
    if (
      programs.every(
        (p) => startOfDay(new Date(p.createdAt)) > dayStart,
      )
    ) {
      continue;
    }
    const exercises = exercisesForDay(programs, day, reschedules).filter(
      ({ program }) => startOfDay(new Date(program.createdAt)) <= dayStart,
    );
    if (exercises.length === 0) continue;
    const anyLogged = instances.some(
      (inst) =>
        isSameDay(new Date(inst.loggedAt), day) &&
        exercises.some((e) => e.exercise.id === inst.exerciseId),
    );
    if (anyLogged) continue;
    missed.push({ date: day, exercises });
  }

  const weekdays: WeekdayExercises[] = [];
  for (let dow = 0; dow < 7; dow++) {
    const exercises: ScheduledExercise[] = [];
    for (const program of programs) {
      for (const exercise of program.exercises) {
        if (
          exercise.schedule.kind === 'weekly-days' &&
          exercise.schedule.days.includes(dow)
        ) {
          exercises.push({ program, exercise });
        }
      }
    }
    if (exercises.length > 0) weekdays.push({ dow, exercises });
  }

  return { missed, weekdays };
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

// Sorted by urgency (most pressing first). Goals already met for the
// period are dropped.
export function frequencyGoalsForDay(
  programs: Program[],
  instances: Instance[],
  today: Date,
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1,
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
      const periodStart = startOfPeriod(today, period, weekStartDay);
      const periodEnd = endOfPeriod(today, period, weekStartDay);

      const completedInPeriod = instances.filter((i) => {
        if (i.exerciseId !== exercise.id) return false;
        const t = new Date(i.loggedAt);
        return t >= periodStart && t <= periodEnd;
      }).length;

      const remaining = target - completedInPeriod;
      if (remaining <= 0) continue;

      // INCLUDING today so a same-day deadline doesn't divide by zero.
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

// Fixed 30 for monthly keeps the math stable without month-by-month wobble.
function periodDays(period: 'week' | 'month'): number {
  return period === 'week' ? 7 : 30;
}

// When an exercise started counting: its own add-date, or the program's
// createdAt for exercises saved before per-exercise stamps existed.
export function exerciseCreatedFloor(
  exercise: Exercise,
  program: Program,
): number {
  return exercise.createdAt ?? program.createdAt;
}

// "Should-do" count for this exercise across [startDate, endDate]:
//   weekly-days: days in range matching schedule.days (minus rest days,
//                minus rescheduled-away days, plus rescheduled-in days).
//   frequency:   times × range-days / period-days, linear in days so
//                cross-period boundaries need no special handling.
//
// `createdFloor` is when this exercise entered the program (its own
// createdAt, or the program's as a fallback). Days before it are never
// counted — you can't miss an exercise the program didn't include yet.
function expectedForRange(
  exerciseId: string,
  schedule: Schedule,
  createdFloor: number,
  startDate: Date,
  endDate: Date,
  restDayKeys?: ReadonlySet<string>,
  reschedules?: Reschedule[],
): number {
  const floorStart = startOfDay(new Date(createdFloor));
  const start = startOfDay(startDate) > floorStart
    ? startOfDay(startDate)
    : floorStart;
  const end = startOfDay(endDate);
  if (end < start) return 0;

  // Frequency math ignores reschedules — those only move weekly-days work.
  const movedAwayDays = new Set<string>();
  const movedInDays = new Set<string>();
  if (reschedules) {
    for (const r of reschedules) {
      if (!r.exerciseIds.includes(exerciseId)) continue;
      movedAwayDays.add(r.fromDate);
      movedInDays.add(r.toDate);
    }
  }

  if (schedule.kind === 'weekly-days') {
    let count = 0;
    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      if (restDayKeys?.has(dateKey(cursor))) continue;
      const ck = dateKey(cursor);
      const expectedHere =
        (schedule.days.includes(cursor.getDay()) && !movedAwayDays.has(ck)) ||
        movedInDays.has(ck);
      if (expectedHere) count += 1;
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
// distinguish "no plan" from "0% completion". Rolls up the per-exercise
// breakdown so the ring and the "which exercise is short" list can't drift.
export function adherence(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  startDate: Date,
  endDate: Date,
  reschedules?: Reschedule[],
): number | null {
  const rows = adherenceBreakdown(
    programs,
    instances,
    restDays,
    startDate,
    endDate,
    reschedules,
  );
  if (rows.length === 0) return null;

  let totalExpected = 0;
  let totalCompleted = 0;
  for (const r of rows) {
    totalExpected += r.expected;
    totalCompleted += r.completed;
  }
  return (totalCompleted / totalExpected) * 100;
}

export type ExerciseAdherence = {
  program: Program;
  exercise: Exercise;
  expected: number;
  completed: number;
};

// Per-exercise decomposition of `adherence` over the same range: which
// exercises were scheduled, how many were expected, how many logged. Only
// exercises with a nonzero expectation appear (nothing was owed otherwise).
// This is what lets the UI answer "which exercise is dragging my % down".
export function adherenceBreakdown(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  startDate: Date,
  endDate: Date,
  reschedules?: Reschedule[],
): ExerciseAdherence[] {
  const restKeys = new Set(restDays.map((r) => r.date));
  const out: ExerciseAdherence[] = [];

  for (const program of programs) {
    for (const exercise of program.exercises) {
      const expected = expectedForRange(
        exercise.id,
        exercise.schedule,
        exerciseCreatedFloor(exercise, program),
        startDate,
        endDate,
        restKeys,
        reschedules,
      );
      if (expected === 0) continue;
      const completed = completedForRange(
        exercise.id,
        instances,
        startDate,
        endDate,
      );
      out.push({ program, exercise, expected, completed });
    }
  }

  return out;
}

export function adherenceToday(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  today: Date,
  reschedules?: Reschedule[],
): number | null {
  return adherence(programs, instances, restDays, today, today, reschedules);
}

// Rolling window ending today, so early in a calendar week you aren't
// judged against a full week's plan you haven't had the days to meet yet.
// `days` days back inclusive of today (7 → [today-6, today]).
export function startOfTrailingWindow(today: Date, days: number): Date {
  const start = startOfDay(today);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

export function adherencePast7Days(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  today: Date,
  reschedules?: Reschedule[],
): number | null {
  return adherence(
    programs,
    instances,
    restDays,
    startOfTrailingWindow(today, 7),
    today,
    reschedules,
  );
}

export function adherencePast30Days(
  programs: Program[],
  instances: Instance[],
  restDays: RestDay[],
  today: Date,
  reschedules?: Reschedule[],
): number | null {
  return adherence(
    programs,
    instances,
    restDays,
    startOfTrailingWindow(today, 30),
    today,
    reschedules,
  );
}

