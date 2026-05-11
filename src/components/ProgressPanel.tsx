import { useMemo, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type {
  ExerciseTag,
  Instance,
  LibraryExercise,
  Program,
} from '../types';
import { CARDIO_TAGS, TAG_LABEL, WEIGHTLIFTING_TAGS } from '../types';
import {
  resolveExerciseName,
  resolveExerciseTags,
  resolveTrackingType,
} from '../instance';
import { Card, CardTitle } from './ui/card';
import {
  MultiselectDropdown,
  SelectedPillChips,
} from './MultiselectDropdown';
import { cn } from '@/lib/utils';

type Props = {
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
  today: Date;
};

const BUCKETS = 8; // weekly buckets shown on each chart
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

type Category = 'strength' | 'cardio';

// Per-instance contribution to the weekly volume bucket.
//   Strength: weighted sets add weight × reps (lb-reps); time-held sets
//             (planks etc.) add durationSeconds directly. Same axis, no
//             unit conversion — a heavy lift naturally dwarfs a hold, which
//             tracks how the work actually compares.
//   Cardio:   total durationSeconds across sets. Universal across activities
//             — running miles vs swimming yards can't add together cleanly,
//             but minutes always can.
function instanceVolume(
  inst: Instance,
  category: Category,
  programs: Program[],
  library: LibraryExercise[],
): number {
  const tt = resolveTrackingType(inst, programs, library);
  if (category === 'strength') {
    if (tt !== 'weight' && tt !== 'time') return 0;
    let total = 0;
    for (const s of inst.sets) {
      if (s.weight !== undefined && s.reps !== undefined) {
        total += s.weight * s.reps;
      }
      if (s.durationSeconds !== undefined) {
        total += s.durationSeconds;
      }
    }
    return total;
  }
  if (tt !== 'cardio') return 0;
  let total = 0;
  for (const s of inst.sets) {
    if (s.durationSeconds !== undefined) total += s.durationSeconds;
  }
  return total;
}

function buildWeeklyVolume(
  instances: Instance[],
  programs: Program[],
  library: LibraryExercise[],
  today: Date,
  category: Category,
  filter?: (inst: Instance) => boolean,
): number[] {
  const endMs = today.getTime();
  const startMs = endMs - BUCKETS * MS_PER_WEEK;
  const series = new Array<number>(BUCKETS).fill(0);
  for (const inst of instances) {
    if (inst.loggedAt < startMs || inst.loggedAt > endMs) continue;
    if (filter && !filter(inst)) continue;
    const idx = Math.min(
      BUCKETS - 1,
      Math.floor((inst.loggedAt - startMs) / MS_PER_WEEK),
    );
    series[idx] += instanceVolume(inst, category, programs, library);
  }
  return series;
}

function formatStrengthVolume(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatCardioVolume(seconds: number): string {
  if (seconds <= 0) return '0';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

// Two-line sparkline. Primary line always renders; accent line renders on
// top when filter is active. Both share the same y-scale (min anchored at
// 0, max = max across both series) so the lines are directly comparable.
function DualSparkline({
  primary,
  accent,
  width = 320,
  height = 80,
}: {
  primary: number[];
  accent: number[] | null;
  width?: number;
  height?: number;
}) {
  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const allValues = accent ? [...primary, ...accent] : primary;
  const max = Math.max(...allValues, 1);

  const buildPath = (vals: number[]): string => {
    const xs = vals.map((_, i) =>
      vals.length === 1 ? innerW / 2 : (i / (vals.length - 1)) * innerW,
    );
    const ys = vals.map((v) => innerH - (v / max) * innerH);
    return xs
      .map((x, i) => `${i === 0 ? 'M' : 'L'} ${x + pad} ${ys[i] + pad}`)
      .join(' ');
  };

  const primaryPath = buildPath(primary);
  const accentPath = accent ? buildPath(accent) : null;
  const primaryLast = primary[primary.length - 1];
  const primaryArea = `${primaryPath} L ${pad + innerW} ${innerH + pad} L ${pad} ${innerH + pad} Z`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className="block"
    >
      <defs>
        <linearGradient id="volume-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {primaryLast > 0 && <path d={primaryArea} fill="url(#volume-fill)" />}
      <path
        d={primaryPath}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {accentPath && (
        <path
          d={accentPath}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

type Direction = 'up' | 'down' | 'flat';

function direction(series: number[], threshold = 0.05): Direction {
  const first = series[0];
  const last = series[series.length - 1];
  if (first === 0 && last === 0) return 'flat';
  if (first === 0) return last > 0 ? 'up' : 'flat';
  const delta = (last - first) / first;
  if (Math.abs(delta) < threshold) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function TrendIcon({
  dir,
  className,
}: {
  dir: Direction;
  className?: string;
}) {
  const Icon =
    dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  return <Icon aria-hidden className={cn('size-4', className)} />;
}


function VolumeChart({
  title,
  category,
  tagOptions,
  programs,
  instances,
  library,
  today,
  formatValue,
}: {
  title: string;
  category: Category;
  tagOptions: readonly ExerciseTag[];
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
  today: Date;
  formatValue: (n: number) => string;
}) {
  const [selectedTags, setSelectedTags] = useState<ExerciseTag[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  // Available exercise chips — anything in the chart's category that's been
  // logged in the last BUCKETS weeks. Keeps the filter list relevant and
  // short.
  const availableExercises = useMemo(() => {
    const cutoff = today.getTime() - BUCKETS * MS_PER_WEEK;
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const inst of instances) {
      if (inst.loggedAt < cutoff) continue;
      const tt = resolveTrackingType(inst, programs, library);
      if (category === 'strength' && tt !== 'weight' && tt !== 'time') continue;
      if (category === 'cardio' && tt !== 'cardio') continue;
      if (seen.has(inst.exerciseId)) continue;
      seen.add(inst.exerciseId);
      const name = resolveExerciseName(inst, programs, library);
      if (name) out.push({ id: inst.exerciseId, name });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [instances, programs, library, today, category]);

  const overall = useMemo(
    () => buildWeeklyVolume(instances, programs, library, today, category),
    [instances, programs, library, today, category],
  );

  const filterActive =
    selectedTags.length > 0 || selectedExercises.length > 0;

  const filtered = useMemo(() => {
    if (!filterActive) return null;
    const tagSet = new Set(selectedTags);
    const exSet = new Set(selectedExercises);
    return buildWeeklyVolume(
      instances,
      programs,
      library,
      today,
      category,
      (inst) => {
        if (exSet.has(inst.exerciseId)) return true;
        if (tagSet.size === 0) return false;
        const tags = resolveExerciseTags(inst, programs, library);
        return tags.some((t) => tagSet.has(t));
      },
    );
  }, [
    filterActive,
    selectedTags,
    selectedExercises,
    instances,
    programs,
    library,
    today,
    category,
  ]);

  const toggleTag = (t: ExerciseTag) => {
    setSelectedTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    );
  };
  const toggleExercise = (id: string) => {
    setSelectedExercises((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  const overallThis = overall[overall.length - 1];
  const overallDir = direction(overall);
  const filteredThis = filtered ? filtered[filtered.length - 1] : 0;
  const filteredDir = filtered ? direction(filtered) : 'flat';
  const hasAnyOverall = overall.some((v) => v > 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        <TrendIcon
          dir={overallDir}
          className={cn(
            overallDir === 'up'
              ? 'text-primary'
              : overallDir === 'down'
                ? 'text-destructive'
                : 'text-muted-foreground',
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tagOptions.map((t) => {
          const active = selectedTags.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(t)}
              className={cn(
                'inline-flex min-h-7 items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                active
                  ? 'border-accent/60 bg-accent/15 text-accent'
                  : 'border-border bg-surface2 text-muted-foreground hover:text-foreground hover:border-accent/30',
              )}
            >
              {TAG_LABEL[t]}
            </button>
          );
        })}
        <MultiselectDropdown
          className="ml-auto"
          noun="exercise"
          options={availableExercises}
          selected={selectedExercises}
          onToggle={toggleExercise}
        />
      </div>

      <SelectedPillChips
        options={availableExercises}
        selected={selectedExercises}
        onToggle={toggleExercise}
      />

      {hasAnyOverall ? (
        <>
          <div className="-mx-1">
            <DualSparkline primary={overall} accent={filtered} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendIcon
                dir={overallDir}
                className={cn(
                  overallDir === 'up'
                    ? 'text-primary'
                    : overallDir === 'down'
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                )}
              />
              <span className="text-muted-foreground">Overall this week:</span>
              <strong className="text-foreground">
                {formatValue(overallThis)}
              </strong>
            </div>
            {filterActive && filtered && (
              <div className="flex items-center gap-1.5 text-accent">
                <TrendIcon dir={filteredDir} className="text-accent" />
                <span>Filtered this week:</span>
                <strong>{formatValue(filteredThis)}</strong>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="italic text-sm text-muted-foreground m-0 py-3">
          Log some sessions to see your trend here.
        </p>
      )}
    </Card>
  );
}

export function ProgressPanel({
  programs,
  instances,
  library,
  today,
}: Props) {
  return (
    <div className="space-y-3">
      <VolumeChart
        title="Strength Volume"
        category="strength"
        tagOptions={WEIGHTLIFTING_TAGS}
        programs={programs}
        instances={instances}
        library={library}
        today={today}
        formatValue={formatStrengthVolume}
      />
      <VolumeChart
        title="Cardio Volume"
        category="cardio"
        tagOptions={CARDIO_TAGS}
        programs={programs}
        instances={instances}
        library={library}
        today={today}
        formatValue={formatCardioVolume}
      />
    </div>
  );
}
