// Helpers for "what should I do today" + adherence percentages.
//
// "Adherence" is defined as: of the (exercise × calendar-day) occurrences that
// were scheduled in a date range, what fraction had at least one logged
// instance on that calendar day. Occurrences before a program's createdAt
// don't count against you (you can't have failed to do something the plan
// didn't exist for yet).

import type { Exercise, Instance, Program } from './types';

export type ScheduledExercise = {
  program: Program;
  exercise: Exercise;
};

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  // Sunday-start week, matching JS getDay() convention.
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
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

// All exercises across all programs that are scheduled for the given day.
export function exercisesForDay(
  programs: Program[],
  date: Date,
): ScheduledExercise[] {
  const dow = date.getDay();
  const out: ScheduledExercise[] = [];
  for (const program of programs) {
    for (const exercise of program.exercises) {
      if (exercise.schedule.days.includes(dow)) {
        out.push({ program, exercise });
      }
    }
  }
  return out;
}

export function instancesOnDay(instances: Instance[], date: Date): Instance[] {
  return instances.filter((i) => isSameDay(new Date(i.loggedAt), date));
}

// Returns null when nothing was scheduled in the range — UI can show "—" to
// distinguish "no plan" from "0% completion".
export function adherence(
  programs: Program[],
  instances: Instance[],
  startDate: Date,
  endDate: Date,
): number | null {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  let scheduled = 0;
  let completed = 0;

  for (
    const cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const dow = cursor.getDay();
    for (const program of programs) {
      const programStart = startOfDay(new Date(program.createdAt));
      // Don't count days before the program existed.
      if (cursor < programStart) continue;
      for (const exercise of program.exercises) {
        if (!exercise.schedule.days.includes(dow)) continue;
        scheduled += 1;
        const logged = instances.some(
          (i) =>
            i.exerciseId === exercise.id &&
            isSameDay(new Date(i.loggedAt), cursor),
        );
        if (logged) completed += 1;
      }
    }
  }

  if (scheduled === 0) return null;
  return (completed / scheduled) * 100;
}

export function adherenceToday(
  programs: Program[],
  instances: Instance[],
  today: Date,
): number | null {
  return adherence(programs, instances, today, today);
}

export function adherenceWeek(
  programs: Program[],
  instances: Instance[],
  today: Date,
): number | null {
  return adherence(programs, instances, startOfWeek(today), today);
}

export function adherenceMonth(
  programs: Program[],
  instances: Instance[],
  today: Date,
): number | null {
  return adherence(programs, instances, startOfMonth(today), today);
}
