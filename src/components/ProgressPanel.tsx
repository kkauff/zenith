import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { Instance, Program } from '../types';
import { Card } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
};

// One "score" per logged instance — what we track over time.
// Weight-tracked: best (weight × reps) across the session's sets.
// Time-tracked: longest hold across the session's sets.
function instanceScore(
  inst: Instance,
  trackingType: 'weight' | 'time',
): number | null {
  if (trackingType === 'time') {
    let best = 0;
    for (const s of inst.sets) {
      if (s.durationSeconds !== undefined && s.durationSeconds > best) {
        best = s.durationSeconds;
      }
    }
    return best > 0 ? best : null;
  }
  let best = 0;
  for (const s of inst.sets) {
    if (s.weight !== undefined && s.reps !== undefined) {
      const v = s.weight * s.reps;
      if (v > best) best = v;
    }
  }
  return best > 0 ? best : null;
}

const BUCKETS = 8; // weeks shown on the chart
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

// Build a normalized strength-trend series across all weight- and time-tracked
// exercises. Each exercise is normalized to its earliest score (=1.0) so we
// can average across exercises with different units / scales.
//
// Returns BUCKETS values (one per week, oldest → newest). Buckets with no
// data are filled forward from the previous bucket. If we never see any data,
// every bucket is 1.
function buildTrend(programs: Program[], instances: Instance[], today: Date) {
  const exerciseTypes = new Map<string, 'weight' | 'time'>();
  for (const p of programs) {
    for (const e of p.exercises) {
      exerciseTypes.set(e.id, e.trackingType);
    }
  }

  // Group instances per exercise, in chronological order.
  const byExercise = new Map<string, Instance[]>();
  for (const inst of instances) {
    if (!exerciseTypes.has(inst.exerciseId)) continue;
    const list = byExercise.get(inst.exerciseId) ?? [];
    list.push(inst);
    byExercise.set(inst.exerciseId, list);
  }
  for (const list of byExercise.values()) {
    list.sort((a, b) => a.loggedAt - b.loggedAt);
  }

  const endMs = today.getTime();
  const startMs = endMs - BUCKETS * MS_PER_WEEK;

  // Per bucket: sum of normalized scores + count of contributing exercises.
  const sums = new Array<number>(BUCKETS).fill(0);
  const counts = new Array<number>(BUCKETS).fill(0);
  let totalDataPoints = 0;

  for (const [exId, list] of byExercise) {
    const tt = exerciseTypes.get(exId)!;
    let baseline: number | null = null;
    // Per bucket: best score from this exercise in that week (if any).
    const perBucket = new Array<number | null>(BUCKETS).fill(null);
    for (const inst of list) {
      const score = instanceScore(inst, tt);
      if (score === null) continue;
      if (baseline === null) baseline = score;
      if (inst.loggedAt < startMs) continue;
      const idx = Math.min(
        BUCKETS - 1,
        Math.floor((inst.loggedAt - startMs) / MS_PER_WEEK),
      );
      const cur = perBucket[idx];
      if (cur === null || score > cur) perBucket[idx] = score;
    }
    if (baseline === null || baseline === 0) continue;
    for (let i = 0; i < BUCKETS; i++) {
      const v = perBucket[i];
      if (v !== null) {
        sums[i] += v / baseline;
        counts[i] += 1;
        totalDataPoints += 1;
      }
    }
  }

  // Average per bucket; fill empty buckets from the previous (or from 1.0 at
  // the start if nothing has happened yet).
  const series = new Array<number>(BUCKETS);
  let last = 1;
  for (let i = 0; i < BUCKETS; i++) {
    if (counts[i] > 0) {
      last = sums[i] / counts[i];
    }
    series[i] = last;
  }

  return { series, totalDataPoints };
}

function Sparkline({
  values,
  width = 320,
  height = 80,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // Avoid divide-by-zero (flat series). Center the line vertically.
  const span = max - min < 0.0001 ? 1 : max - min;
  const xs = values.map((_, i) =>
    values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW,
  );
  const ys = values.map((v) =>
    max - min < 0.0001 ? innerH / 2 : innerH - ((v - min) / span) * innerH,
  );

  const linePath = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'} ${x + pad} ${ys[i] + pad}`)
    .join(' ');
  const areaPath = `${linePath} L ${xs[xs.length - 1] + pad} ${innerH + pad} L ${pad} ${innerH + pad} Z`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className="block"
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trend-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProgressPanel({ programs, instances, today }: Props) {
  const { series, totalDataPoints } = buildTrend(programs, instances, today);

  // Need at least two contributing data points for a meaningful trend.
  const hasTrend = totalDataPoints >= 2;
  const first = series[0];
  const last = series[series.length - 1];
  const delta = last - first;
  const pct = Math.round(delta * 100);

  const direction =
    !hasTrend || Math.abs(delta) < 0.01
      ? 'flat'
      : delta > 0
        ? 'up'
        : 'down';

  const TrendIcon =
    direction === 'up'
      ? TrendingUp
      : direction === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    direction === 'up'
      ? 'text-primary'
      : direction === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';

  const trendLabel = !hasTrend
    ? 'Not enough data'
    : direction === 'flat'
      ? 'Holding steady'
      : `${pct > 0 ? '+' : ''}${pct}% over 8 wks`;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Strength
        </span>
        <TrendIcon aria-hidden className={`size-4 ${trendColor}`} />
      </div>
      <div className="-mx-1">
        <Sparkline values={series} />
      </div>
      <span className={`text-xs font-semibold ${trendColor}`}>
        {trendLabel}
      </span>
    </Card>
  );
}
