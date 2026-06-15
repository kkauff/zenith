import { useMemo } from 'react';
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import Model from 'react-body-highlighter';
import type {
  Instance,
  LibraryExercise,
  Program,
} from '../../types';
import {
  BALANCE_TAGS,
  BALANCE_TAG_LABEL,
  type BalanceCallout,
  type Direction,
  detectImbalances,
  muscleIntensities,
  setCountByBalanceTag,
  setCountByMuscle,
  setCountDirection,
} from '../../progress-metrics';
import { useSettings } from '../../settings';
import { startOfWeek } from '../../today';
import { Card, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';

type Props = {
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
  today: Date;
};

// Tuned for the dark theme: body fill ≈ surface-2, three increasing
// shades of the ultraviolet accent for the intensity ramp. Hard-coded as
// hex/hsl strings because react-body-highlighter writes them straight
// into SVG `fill` attributes — it can't resolve CSS variables.
const BODY_COLOR = '#1a2436';
const INTENSITY_COLORS = ['#3a2a8a', '#6a4ad8', '#8a6dff'];

export function ProgramBalance({ programs, instances, library, today }: Props) {
  const { weekStartDay } = useSettings();

  const { thisStart, thisEnd, lastStart } = useMemo(() => {
    const thisStart = startOfWeek(today, weekStartDay);
    const thisEnd = new Date(thisStart);
    thisEnd.setDate(thisEnd.getDate() + 7);
    const lastStart = new Date(thisStart);
    lastStart.setDate(lastStart.getDate() - 7);
    return { thisStart, thisEnd, lastStart };
  }, [today, weekStartDay]);

  const tagCounts = useMemo(
    () => setCountByBalanceTag(instances, programs, library, thisStart, thisEnd),
    [instances, programs, library, thisStart, thisEnd],
  );
  const lastWeekTagCounts = useMemo(
    () => setCountByBalanceTag(instances, programs, library, lastStart, thisStart),
    [instances, programs, library, lastStart, thisStart],
  );

  const muscleCounts = useMemo(
    () => setCountByMuscle(instances, programs, library, thisStart, thisEnd),
    [instances, programs, library, thisStart, thisEnd],
  );
  const intensities = useMemo(
    () => muscleIntensities(muscleCounts),
    [muscleCounts],
  );

  const callouts = useMemo(() => detectImbalances(tagCounts), [tagCounts]);

  const data = useMemo(
    () =>
      Array.from(intensities.entries()).map(([muscle, bucket]) => ({
        name: muscle,
        muscles: [muscle],
        frequency: bucket,
      })),
    [intensities],
  );

  const totalSetsThisWeek =
    tagCounts.push + tagCounts.pull + tagCounts.legs + tagCounts.core;

  if (totalSetsThisWeek === 0) {
    return (
      <Card className="flex flex-col gap-3">
        <CardTitle>Program balance — this week</CardTitle>
        <p className="italic text-sm text-muted-foreground m-0 py-3">
          No tagged sets logged this week. Tag your exercises with push,
          pull, legs, or core to see your training split.
        </p>
      </Card>
    );
  }

  const sortedTags = [...BALANCE_TAGS].sort((a, b) => tagCounts[b] - tagCounts[a]);
  const maxCount = Math.max(...sortedTags.map((t) => tagCounts[t]), 1);

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Program balance — this week</CardTitle>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-1">
        <div className="flex flex-row gap-1 sm:gap-2">
          <BodyView data={data} type="anterior" />
          <BodyView data={data} type="posterior" />
        </div>

        <div className="flex w-full flex-col gap-2 sm:max-w-[180px]">
          {sortedTags.map((tag) => {
            const thisWk = tagCounts[tag];
            const lastWk = lastWeekTagCounts[tag];
            const dir = setCountDirection(thisWk, lastWk);
            const widthPct = (thisWk / maxCount) * 100;
            const lastWidthPct = (lastWk / maxCount) * 100;
            return (
              <div key={tag} className="text-xs">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{BALANCE_TAG_LABEL[tag]}</span>
                  <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
                    <DirArrow dir={dir} />
                    {thisWk}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-sm bg-surface2/40">
                  {lastWk > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm bg-accent/15"
                      style={{ width: `${lastWidthPct}%` }}
                      aria-hidden
                    />
                  )}
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm bg-accent"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Legend />

      {callouts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {callouts.map((c) => (
            <CalloutRow key={calloutKey(c)} callout={c} />
          ))}
        </div>
      )}
    </Card>
  );
}

function BodyView({
  data,
  type,
}: {
  data: { name: string; muscles: string[]; frequency: number }[];
  type: 'anterior' | 'posterior';
}) {
  return (
    <div className="w-[120px] sm:w-[140px]">
      <Model
        data={data as never}
        type={type}
        bodyColor={BODY_COLOR}
        highlightedColors={INTENSITY_COLORS}
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
      <span>Sets per muscle:</span>
      {INTENSITY_COLORS.map((color, i) => (
        <span key={color} className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: color }}
            aria-hidden
          />
          {['Low', 'Med', 'High'][i]}
        </span>
      ))}
    </div>
  );
}

function DirArrow({ dir }: { dir: Direction }) {
  if (dir === 'up') return <TrendingUp aria-label="trending up" className="size-3 text-accent" />;
  if (dir === 'down') return <TrendingDown aria-label="trending down" className="size-3 text-destructive" />;
  return <Minus aria-label="flat" className="size-3 text-muted-foreground" />;
}

function calloutKey(c: BalanceCallout): string {
  if (c.kind === 'zero-volume') return `zero:${c.group}`;
  return `skew:${c.direction}`;
}

function CalloutRow({ callout }: { callout: BalanceCallout }) {
  const text =
    callout.kind === 'zero-volume'
      ? `No ${BALANCE_TAG_LABEL[callout.group].toLowerCase()} sets this week.`
      : callout.direction === 'push'
        ? `Push-heavy: ${callout.pushSets} push vs ${callout.pullSets} pull this week. Watch for shoulder strain.`
        : `Pull-heavy: ${callout.pullSets} pull vs ${callout.pushSets} push this week.`;
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-xs',
        'border-rest/40 bg-rest/10 text-foreground',
      )}
    >
      <AlertTriangle aria-hidden className="mt-0.5 size-3.5 flex-shrink-0 text-rest" />
      <span>{text}</span>
    </div>
  );
}
