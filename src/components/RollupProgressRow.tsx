import type { RollupGoal } from '../types';
import { formatDistance } from '../templates';
import type { RollupProgressView } from '../today';

type Props = {
  view: RollupProgressView;
};

// Compact progress row for an unmet rollup goal. No editor — these
// aggregate across exercises, so logging happens via the exercise cards
// above; this row just visualizes "X of Y so far."
export function RollupProgressRow({ view }: Props) {
  const { program, goal, current, target, periodLabel } = view;
  const pct = Math.max(0, Math.min(100, (current / target) * 100));
  const formatted = formatRollupValue(goal, current, target);
  const label =
    goal.target.kind === 'exercise'
      ? (program.exercises.find((e) => e.id === goal.target.exerciseId)
          ?.name ?? 'Removed exercise')
      : 'Cardio (Any)';
  return (
    <div className="rounded-lg border border-border/60 border-l-[3px] border-l-accent bg-surface2 p-3 shadow-glow-accent-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">
          {label}{' '}
          <span className="text-xs font-normal text-muted-foreground">
            · {periodLabel}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">{formatted}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatRollupValue(
  goal: RollupGoal,
  current: number,
  target: number,
): string {
  if (goal.metric === 'time') {
    return `${formatHM(current)} / ${formatHM(target)}`;
  }
  const unit = goal.unit ?? 'miles';
  return `${formatDistance(current, unit)} / ${formatDistance(target, unit)}`;
}

// "1h 30m" / "30 min" — readable at the scale of weekly time goals.
function formatHM(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}
