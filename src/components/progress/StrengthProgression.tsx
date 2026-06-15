import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { Instance, LibraryExercise, Program, TrackingType } from '../../types';
import { resolveExerciseName, resolveTrackingType } from '../../instance';
import {
  formatHeldDuration,
  sessionMetric,
  type SessionMetric,
} from '../../progress-metrics';
import { useSettings } from '../../settings';
import { Card, CardTitle } from '../ui/card';
import { Select } from '../ui/select';

type Props = {
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
};

type Point = {
  loggedAt: number;
  value: number;
  metric: SessionMetric;
};

type ExerciseOption = {
  id: string;
  name: string;
  trackingType: TrackingType;
};

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function StrengthProgression({ programs, instances, library }: Props) {
  const { weightUnit, bodyWeight } = useSettings();
  const bw = bodyWeight ?? (weightUnit === 'kg' ? 68 : 150);

  const exerciseOptions = useMemo<ExerciseOption[]>(() => {
    const byId = new Map<string, ExerciseOption>();
    for (const inst of instances) {
      if (byId.has(inst.exerciseId)) continue;
      if (sessionMetric(inst, programs, library, bw) === null) continue;
      const name = resolveExerciseName(inst, programs, library);
      if (!name) continue;
      byId.set(inst.exerciseId, {
        id: inst.exerciseId,
        name,
        trackingType: resolveTrackingType(inst, programs, library),
      });
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [instances, programs, library, bw]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    exerciseOptions.find((o) => o.id === selectedId) ?? exerciseOptions[0];

  const series = useMemo<Point[]>(() => {
    if (!selected) return [];
    const points: Point[] = [];
    for (const inst of instances) {
      if (inst.exerciseId !== selected.id) continue;
      const metric = sessionMetric(inst, programs, library, bw);
      if (!metric) continue;
      points.push({ loggedAt: inst.loggedAt, value: metric.value, metric });
    }
    return points.sort((a, b) => a.loggedAt - b.loggedAt);
  }, [selected, instances, programs, library, bw]);

  if (exerciseOptions.length === 0) {
    return (
      <Card className="flex flex-col gap-3">
        <CardTitle>Strength PR</CardTitle>
        <p className="italic text-sm text-muted-foreground m-0 py-3">
          Log a session to see your strength progress here.
        </p>
      </Card>
    );
  }

  // Assisted exercises have negative topSet weights (e.g. −60 lb = 60 lb help).
  // `value` is the effective e1RM (positive) so PR ranking is correct; to display
  // as a machine setting we convert back: displayE1RM = value − bodyWeight.
  const isAssisted = series.some(
    (p) => p.metric.kind === 'weight' && p.metric.topSet.weight < 0,
  );

  const formatY = (n: number): string =>
    selected!.trackingType === 'time'
      ? formatHeldDuration(n)
      : `${Math.round(n)}`;

  const headlineUnit = selected!.trackingType === 'time' ? '' : ` ${weightUnit}`;

  const recentPoint = series[series.length - 1] ?? null;
  const pr = series.reduce<Point | null>(
    (best, p) => (best === null || p.value > best.value ? p : best),
    null,
  );

  // Left card: actual top-set weight / hold from the most recent session.
  const recentLabel =
    selected!.trackingType === 'time' ? 'Recent best hold' : 'Recent max';

  const recentPrimary = (() => {
    if (!recentPoint) return '—';
    const { metric } = recentPoint;
    if (metric.kind === 'time') return formatHeldDuration(metric.topSet.durationSeconds);
    return `${Math.round(metric.topSet.weight)}${headlineUnit}`;
  })();

  const recentSecondary = (() => {
    if (!recentPoint) return '—';
    const { metric } = recentPoint;
    if (metric.kind === 'weight') {
      return `${metric.topSet.reps} reps · ${formatDateShort(recentPoint.loggedAt)}`;
    }
    return formatDateShort(recentPoint.loggedAt);
  })();

  // Right card: all-time best estimated 1RM.
  // For assisted exercises `value` is the effective e1RM (positive, used for
  // ranking). Convert back to a machine-setting negative for display so it's
  // meaningful to the user (e.g. effectiveE1RM 126, bodyWeight 150 → −24 lb).
  const prLabel = selected!.trackingType === 'time' ? 'Best hold' : 'PR (est. 1RM)';
  const prDisplayValue = (v: number) =>
    isAssisted && selected!.trackingType === 'weight' ? v - bw : v;

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Strength PR</CardTitle>

      <Select
        value={selected!.id}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        {exerciseOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-2">
        <SummaryStat
          label={recentLabel}
          primary={recentPrimary}
          secondary={recentSecondary}
        />
        <SummaryStat
          label={prLabel}
          primary={pr === null ? '—' : `${formatY(prDisplayValue(pr.value))}${headlineUnit}`}
          secondary={
            pr === null
              ? '—'
              : pr.metric.kind === 'weight'
                ? `${Math.round(pr.metric.topSet.weight)}×${pr.metric.topSet.reps} · ${formatDateShort(pr.loggedAt)}`
                : formatDateShort(pr.loggedAt)
          }
          icon={<Trophy aria-hidden className="size-3" />}
        />
      </div>
    </Card>
  );
}

function SummaryStat({
  label,
  primary,
  secondary,
  icon,
}: {
  label: string;
  primary: string;
  secondary: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-surface2/60 p-3">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {primary}
      </div>
      <div className="text-[11px] text-muted-foreground">{secondary}</div>
    </div>
  );
}
