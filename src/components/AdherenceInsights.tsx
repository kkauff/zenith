import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Instance, Program, RestDay } from '../types';
import {
  type AdherenceCategory,
  type DayAdherence,
  dailyAdherence,
  instanceMatchesFilter,
} from '../today';
import { MultiselectDropdown } from './MultiselectDropdown';
import { SegmentedToggle } from './SegmentedToggle';
import { cn } from '@/lib/utils';

const WEEKS = 12;
const DAYS_IN_RANGE = WEEKS * 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
// 6 buckets covering 24h: [startHourInclusive, endHourExclusive, label].
// 9pm+ wraps to next-day pre-5am so late-night logs aren't lost.
const TIME_BUCKETS: { range: [number, number]; label: string }[] = [
  { range: [5, 9], label: '5–9a' },
  { range: [9, 12], label: '9–12' },
  { range: [12, 15], label: '12–3p' },
  { range: [15, 18], label: '3–6p' },
  { range: [18, 21], label: '6–9p' },
  { range: [21, 5], label: '9p+' },
];

type Tab = 'over-time' | 'weekday';

type Props = {
  programs: Program[];
  instances: Instance[];
  restDays: RestDay[];
  today: Date;
};

function startOfRange(today: Date): Date {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (DAYS_IN_RANGE - 1));
  return start;
}

function bucketForHour(hour: number): number {
  for (let i = 0; i < TIME_BUCKETS.length; i++) {
    const [lo, hi] = TIME_BUCKETS[i].range;
    if (lo < hi) {
      if (hour >= lo && hour < hi) return i;
    } else {
      // Wrapping bucket (21+ or <5)
      if (hour >= lo || hour < hi) return i;
    }
  }
  return -1;
}

function adherenceOf(day: DayAdherence): number | null {
  return day.expected > 0 ? day.completed / day.expected : null;
}

function formatPct(n: number | null): string {
  return n === null ? '—' : `${Math.round(n * 100)}%`;
}

export function AdherenceInsights({
  programs,
  instances,
  restDays,
  today,
}: Props) {
  const [selectedCategories, setSelectedCategories] = useState<
    AdherenceCategory[]
  >([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('over-time');

  const toggleCategory = (c: AdherenceCategory) => {
    setSelectedCategories((cur) =>
      cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c],
    );
  };
  const toggleProgram = (id: string) => {
    setSelectedPrograms((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  // Both categories selected = same as neither = no category filter.
  const effectiveCategories =
    selectedCategories.length === 2 ? [] : selectedCategories;
  const filter = useMemo(
    () => ({
      programIds: new Set(selectedPrograms),
      weekdays: new Set<number>(),
      categories: new Set(effectiveCategories),
    }),
    [selectedPrograms, effectiveCategories],
  );

  const programOptions = useMemo(
    () => programs.map((p) => ({ id: p.id, name: p.name })),
    [programs],
  );

  const categoryOptions = useMemo(
    () => [
      { id: 'cardio', name: 'Cardio' },
      { id: 'strength', name: 'Strength' },
    ],
    [],
  );

  // Unified pill list: every active filter renders as one removable pill
  // in a single wrapping row.
  const activePills = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = [];
    for (const c of selectedCategories) {
      pills.push({
        key: `cat:${c}`,
        label: c === 'cardio' ? 'Cardio' : 'Strength',
        onRemove: () => toggleCategory(c),
      });
    }
    for (const p of selectedPrograms) {
      const prog = programOptions.find((o) => o.id === p);
      pills.push({
        key: `prog:${p}`,
        label: prog?.name ?? p,
        onRemove: () => toggleProgram(p),
      });
    }
    return pills;
  }, [selectedCategories, selectedPrograms, programOptions]);

  // --- Core data --------------------------------------------------------

  const days = useMemo(() => {
    const start = startOfRange(today);
    return dailyAdherence(programs, instances, restDays, start, today, filter);
  }, [programs, instances, restDays, today, filter]);

  // Rest-day dates inside the visible range, expressed as "days offset from
  // range start" so the over-time chart can position yellow ticks on its
  // x-axis without re-computing the time scale.
  const restDayOffsets = useMemo(() => {
    const start = startOfRange(today);
    const startMs = start.getTime();
    const cutoffMs = startMs + DAYS_IN_RANGE * DAY_MS;
    const out: number[] = [];
    for (const r of restDays) {
      const [y, m, d] = r.date.split('-').map(Number);
      if (!y || !m || !d) continue;
      const ts = new Date(y, m - 1, d).getTime();
      if (ts < startMs || ts >= cutoffMs) continue;
      out.push(Math.floor((ts - startMs) / DAY_MS));
    }
    return out;
  }, [restDays, today]);

  // Weekly aggregate for the "Over time" tab: 12 buckets, each summing
  // expected/completed across 7 days. Smoother than daily and aligns
  // naturally with x-axis week labels.
  const weeklySeries = useMemo(() => {
    const start = startOfRange(today);
    const buckets = Array.from({ length: WEEKS }, () => ({
      expected: 0,
      completed: 0,
      // Midpoint date for axis labeling.
      midDate: new Date(0),
    }));
    for (const d of days) {
      const diff = Math.floor((d.date.getTime() - start.getTime()) / DAY_MS);
      const weekIdx = Math.floor(diff / 7);
      if (weekIdx < 0 || weekIdx >= WEEKS) continue;
      buckets[weekIdx].expected += d.expected;
      buckets[weekIdx].completed += d.completed;
    }
    for (let w = 0; w < WEEKS; w++) {
      const mid = new Date(start);
      mid.setDate(mid.getDate() + w * 7 + 3);
      buckets[w].midDate = mid;
    }
    return buckets.map((b) => ({
      midDate: b.midDate,
      adherence: b.expected > 0 ? b.completed / b.expected : null,
    }));
  }, [days, today]);

  // Average adherence per weekday across the 12-week range. Used by the
  // Weekday tab AND the "best/worst day" insight.
  const weekdayAverages = useMemo(() => {
    const sums = new Array<number>(7).fill(0);
    const counts = new Array<number>(7).fill(0);
    for (const d of days) {
      const a = adherenceOf(d);
      if (a === null) continue;
      const w = d.date.getDay();
      sums[w] += a;
      counts[w] += 1;
    }
    return sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : null));
  }, [days]);

  // --- Time-of-day companion -------------------------------------------

  // For each calendar day in the range, find the earliest log time of any
  // instance that matches the filter. Bin by hour bucket. Days with no
  // matching log contribute nothing (honest: missed days have no time).
  const timeOfDayCounts = useMemo(() => {
    const counts = new Array<number>(TIME_BUCKETS.length).fill(0);
    const start = startOfRange(today);
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    // Pre-bucket matching instances by yyyy-mm-dd.
    const earliestByDay = new Map<string, number>();
    for (const inst of instances) {
      if (inst.loggedAt < start.getTime() || inst.loggedAt >= end.getTime())
        continue;
      if (!instanceMatchesFilter(inst, programs, filter)) continue;
      const d = new Date(inst.loggedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const prior = earliestByDay.get(key);
      if (prior === undefined || inst.loggedAt < prior) {
        earliestByDay.set(key, inst.loggedAt);
      }
    }
    for (const ts of earliestByDay.values()) {
      const bucket = bucketForHour(new Date(ts).getHours());
      if (bucket >= 0) counts[bucket] += 1;
    }
    return counts;
  }, [programs, instances, today, filter]);

  // --- Render -----------------------------------------------------------

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <MultiselectDropdown
          noun="category"
          nounPlural="categories"
          placeholder="Category"
          align="left"
          options={categoryOptions}
          selected={selectedCategories}
          onToggle={(id) => toggleCategory(id as AdherenceCategory)}
        />
        <MultiselectDropdown
          noun="program"
          placeholder="Program"
          align="left"
          options={programOptions}
          selected={selectedPrograms}
          onToggle={toggleProgram}
        />
        <SegmentedToggle
          className="ml-auto"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'over-time', label: 'Trend' },
            { value: 'weekday', label: 'Weekday' },
          ]}
        />
      </div>

      {activePills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={pill.onRemove}
              aria-label={`Remove ${pill.label} filter`}
              className="inline-flex min-h-7 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {pill.label}
              <X aria-hidden className="size-3" />
            </button>
          ))}
        </div>
      )}

      <div>
        {tab === 'over-time' ? (
          <OverTimeChart
            series={weeklySeries}
            restDayOffsets={restDayOffsets}
          />
        ) : (
          <WeekdayChart averages={weekdayAverages} />
        )}
      </div>

      <TimeOfDayChart counts={timeOfDayCounts} />
    </div>
  );
}


// Weekly trend line. SVG path across 12 points, y-axis ticks at 0/50/100%.
// Padding is generous on all sides: left gutter for the % labels, top
// breathing room so the 100% label doesn't clip, bottom space for date
// ticks, right padding so the last data dot doesn't sit on the SVG edge.
//
// Rest days render as small yellow ticks on the chart baseline — one per
// rest day. Position is computed from day-of-range offset so a Wednesday
// rest day lands mid-week, not snapped to the week's midpoint.
function OverTimeChart({
  series,
  restDayOffsets,
}: {
  series: { midDate: Date; adherence: number | null }[];
  restDayOffsets: number[];
}) {
  const width = 320;
  const height = 130;
  const padLeft = 28;
  const padRight = 10;
  const padTop = 12;
  const padBottom = 22;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const maxY = 1;

  const pts = series.map((s, i) => {
    const x = padLeft + (i / Math.max(series.length - 1, 1)) * innerW;
    const val = s.adherence;
    const yVal = val === null ? null : Math.min(val, maxY);
    const y = yVal === null ? null : padTop + (1 - yVal / maxY) * innerH;
    return { x, y, label: s.midDate, raw: val };
  });

  let path = '';
  let pending = true;
  for (const p of pts) {
    if (p.y === null) {
      pending = true;
      continue;
    }
    path += `${pending ? 'M' : 'L'} ${p.x} ${p.y} `;
    pending = false;
  }

  const anyData = pts.some((p) => p.y !== null);

  const tickIdxs = [0, Math.floor(series.length / 2), series.length - 1];
  const tickFmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-1">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block"
        aria-label="Weekly adherence trend"
      >
        {[0, 0.5, 1].map((frac) => {
          const y = padTop + (1 - frac) * innerH;
          return (
            <g key={frac}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                strokeDasharray="2 3"
              />
              <text
                x={padLeft - 4}
                y={y + 3}
                fontSize="9"
                fill="hsl(var(--muted-foreground))"
                textAnchor="end"
              >
                {Math.round(frac * 100)}%
              </text>
            </g>
          );
        })}
        {anyData && (
          <path
            d={path.trim()}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {pts.map((p, i) =>
          p.y === null ? null : (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.2}
              fill="hsl(var(--primary))"
            >
              <title>
                {tickFmt(p.label)} · {formatPct(p.raw)}
              </title>
            </circle>
          ),
        )}
        {tickIdxs.map((idx) => {
          const p = pts[idx];
          if (!p) return null;
          const anchor =
            idx === 0 ? 'start' : idx === pts.length - 1 ? 'end' : 'middle';
          return (
            <text
              key={idx}
              x={p.x}
              y={height - 6}
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
              textAnchor={anchor}
            >
              {tickFmt(p.label)}
            </text>
          );
        })}
        {/* Rest-day ticks on the baseline. Day 0 sits at padLeft, day
           DAYS_IN_RANGE-1 at padLeft+innerW. Small yellow stems mimic the
           neon ticks on a synth panel. */}
        {restDayOffsets.map((offset, i) => {
          const x =
            padLeft + (offset / Math.max(DAYS_IN_RANGE - 1, 1)) * innerW;
          const yBase = padTop + innerH;
          return (
            <line
              key={`rest-${i}-${offset}`}
              x1={x}
              x2={x}
              y1={yBase - 5}
              y2={yBase + 1}
              stroke="hsl(var(--rest))"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {!anyData && (
        <p className="text-xs italic text-muted-foreground m-0">
          No matching data in the last 12 weeks.
        </p>
      )}
      {restDayOffsets.length > 0 && (
        <p className="m-0 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <svg width="8" height="8" aria-hidden>
            <line
              x1="4"
              x2="4"
              y1="0"
              y2="8"
              stroke="hsl(var(--rest))"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {restDayOffsets.length} rest day
          {restDayOffsets.length === 1 ? '' : 's'} in this range
        </p>
      )}
    </div>
  );
}

function WeekdayChart({ averages }: { averages: (number | null)[] }) {
  const anyData = averages.some((v) => v !== null);
  if (!anyData) {
    return (
      <p className="text-xs italic text-muted-foreground m-0">
        No matching data in the last 12 weeks.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {DAY_LABELS.map((name, i) => {
        const v = averages[i];
        const pct = v === null ? 0 : Math.min(v, 1);
        const colorClass =
          v === null
            ? 'bg-surface2'
            : v >= 0.9
              ? 'bg-primary'
              : v >= 0.6
                ? 'bg-primary/55'
                : v >= 0.3
                  ? 'bg-destructive/55'
                  : 'bg-destructive';
        return (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className="w-8 font-semibold text-muted-foreground">
              {name}
            </span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-surface2/40">
              <div
                className={cn('absolute inset-y-0 left-0 rounded-sm', colorClass)}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
            <span className="w-10 text-right font-semibold tabular-nums text-muted-foreground">
              {formatPct(v)}
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// Companion bar chart: count of days bucketed by earliest log time.
// Honest framing in the heading — "when you log" not "when adherence
// happens", since missed days have no time.
function TimeOfDayChart({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-1">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        When you usually log
      </p>
      {total === 0 ? (
        <p className="m-0 text-xs italic text-muted-foreground">
          No matching logs in the last 12 weeks.
        </p>
      ) : (
        <div className="flex items-end gap-3">
          {counts.map((c, i) => {
            const h = (c / max) * 38; // px height, max ~38
            return (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1.5"
                title={`${TIME_BUCKETS[i].label}: ${c} day${c === 1 ? '' : 's'}`}
              >
                <div className="flex h-10 w-full items-end justify-center">
                  <div
                    className={cn(
                      'w-3 rounded-t-sm',
                      c > 0 ? 'bg-primary' : 'bg-surface2/40',
                    )}
                    style={{ height: `${h}px`, minHeight: c > 0 ? '2px' : '0' }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {TIME_BUCKETS[i].label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
