// Display helpers for rollup goals. Used by ProgramDetail and NewProgram so
// the same goal renders identically in the creation flow and the edit
// screen.

import type { Program, RollupGoal } from './types';
import { formatDistance, formatSchedule } from './templates';

// "Cardio (Any) · 6h per week" / "Running · 5 mi per week" /
// "Cardio (Any) · 30 min per scheduled day".
export function summarizeRollup(goal: RollupGoal, program: Program): string {
  // Bind to a local const so the discriminated-union narrowing survives the
  // arrow-fn boundary inside .find() under `tsc -b`'s stricter inference.
  const target = goal.target;
  const label =
    target.kind === 'exercise'
      ? (program.exercises.find((e) => e.id === target.exerciseId)?.name ??
        'Removed exercise')
      : 'Cardio (Any)';
  const amount = formatRollupAmount(goal);
  if (goal.schedule.kind === 'weekly-days') {
    return `${label} · ${amount} per scheduled day`;
  }
  return `${label} · ${amount} per ${goal.schedule.period}`;
}

// Secondary line — shows which days or which period the goal targets.
export function summarizeRollupSchedule(goal: RollupGoal): string {
  if (goal.schedule.kind === 'weekly-days') {
    return formatSchedule({
      kind: 'weekly-days',
      days: goal.schedule.days,
    });
  }
  return `Total per ${goal.schedule.period}`;
}

// "6h" / "1h 30m" / "30 min" for time goals; "20 mi" / "5000 yd" for
// distance. Kept separate from `formatDuration` (which prints "1:30") since
// goal-scale times read better in hours-and-minutes form.
export function formatRollupAmount(goal: RollupGoal): string {
  if (goal.metric === 'time') {
    return formatLargeDuration(goal.schedule.amount);
  }
  return formatDistance(goal.schedule.amount, goal.unit ?? 'miles');
}

export function formatLargeDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}
