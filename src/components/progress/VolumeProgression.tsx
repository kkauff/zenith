import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check, ChevronDown } from 'lucide-react';
import type { Instance, LibraryExercise, Program } from '../../types';
import {
  BALANCE_TAG_LABEL,
  BALANCE_TAGS,
  type BalanceTag,
} from '../../progress-metrics';
import {
  resolveExerciseName,
  resolveExerciseTags,
  resolveTrackingType,
} from '../../instance';
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

const NUM_WEEKS = 8;

// Four distinct ultraviolet shades, light→dark so the legend reads naturally.
const TAG_COLORS: Record<BalanceTag, string> = {
  push: '#c4b8ff',
  pull: '#9480ff',
  legs: '#6651ee',
  core: '#3b2cb0',
};

function instanceVolume(
  inst: Instance,
  programs: Program[],
  library: LibraryExercise[],
): number {
  const tt = resolveTrackingType(inst, programs, library);
  if (tt !== 'weight' && tt !== 'time') return 0;
  let total = 0;
  for (const s of inst.sets) {
    if (s.weight !== undefined && s.reps !== undefined && s.reps > 0) {
      total += Math.abs(s.weight) * s.reps;
    }
    if (s.durationSeconds !== undefined && s.durationSeconds > 0) {
      total += s.durationSeconds;
    }
  }
  return total;
}

function formatVolume(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toString();
}

type WeekPoint = { label: string } & Partial<Record<BalanceTag, number>> & {
  volume?: number;
};

// Compact multi-select dropdown scoped to this component.
function ExerciseMultiSelect({
  options,
  selectedIds,
  onChange,
}: {
  options: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const triggerLabel =
    selectedIds.length === 0
      ? 'All Exercises'
      : selectedIds.length === 1
        ? (options.find((o) => o.id === selectedIds[0])?.name ?? 'All Exercises')
        : `${selectedIds.length} exercises`;

  const hasSelection = selectedIds.length > 0;

  return (
    <div ref={containerRef} className="relative ml-auto w-44 flex-shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-7 w-full items-center justify-between rounded-md border px-2 py-0 text-[11px] font-semibold transition-colors focus-visible:outline-none',
          hasSelection
            ? 'border-accent/60 bg-accent/15 text-accent hover:border-accent/80'
            : 'border-border bg-input text-muted-foreground hover:border-primary/40',
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          aria-hidden
          className={cn('ml-1 size-3 flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && options.length > 0 && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-card py-1 shadow-lg"
        >
          {options.map((o) => {
            const active = selectedIds.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => toggle(o.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface2/60 focus-visible:bg-surface2/60 focus-visible:outline-none',
                  active && 'text-primary',
                )}
              >
                <Check
                  aria-hidden
                  className={cn(
                    'size-4 flex-shrink-0',
                    active ? 'opacity-100 text-primary' : 'opacity-0',
                  )}
                />
                <span className="truncate">{o.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VolumeProgression({ programs, instances, library, today }: Props) {
  const { weekStartDay } = useSettings();
  const [selectedTags, setSelectedTags] = useState<BalanceTag[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  const weekBuckets = useMemo(() => {
    const ws = startOfWeek(today, weekStartDay);
    return Array.from({ length: NUM_WEEKS }, (_, i) => {
      const start = new Date(ws);
      start.setDate(start.getDate() - (NUM_WEEKS - 1 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const label = start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      return { start, end, label };
    });
  }, [today, weekStartDay]);

  const exerciseOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const inst of instances) {
      if (!byId.has(inst.exerciseId)) {
        const name = resolveExerciseName(inst, programs, library);
        if (name) byId.set(inst.exerciseId, name);
      }
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [instances, programs, library]);

  // Tags actually shown as stacked segments. If tags are selected, use those;
  // otherwise show all four. Upper/lower are excluded here — they'd double-count.
  const displayTags: BalanceTag[] =
    selectedTags.length > 0 ? selectedTags : [...BALANCE_TAGS];

  const hasExerciseFilter = selectedExerciseIds.length > 0;

  const data = useMemo((): WeekPoint[] => {
    return weekBuckets.map(({ start, end, label }) => {
      const startMs = start.getTime();
      const endMs = end.getTime();

      if (hasExerciseFilter) {
        // Sum volume across all selected exercises.
        let volume = 0;
        for (const inst of instances) {
          if (inst.loggedAt < startMs || inst.loggedAt >= endMs) continue;
          if (!selectedExerciseIds.includes(inst.exerciseId)) continue;
          volume += instanceVolume(inst, programs, library);
        }
        return { label, volume: Math.round(volume) };
      }

      // Stacked by balance tag — always compute all four so recharts axes
      // are stable when the selected-tag set changes.
      const point: WeekPoint = { label };
      for (const tag of BALANCE_TAGS) {
        let vol = 0;
        for (const inst of instances) {
          if (inst.loggedAt < startMs || inst.loggedAt >= endMs) continue;
          const tags = resolveExerciseTags(inst, programs, library);
          if (!tags.includes(tag)) continue;
          vol += instanceVolume(inst, programs, library);
        }
        point[tag] = Math.round(vol);
      }
      return point;
    });
  }, [weekBuckets, instances, programs, library, selectedExerciseIds, hasExerciseFilter]);

  const hasData = data.some((d) =>
    hasExerciseFilter
      ? (d.volume ?? 0) > 0
      : BALANCE_TAGS.some((t) => (d[t] ?? 0) > 0),
  );

  const toggleTag = (t: BalanceTag) => {
    setSelectedExerciseIds([]);
    setSelectedTags((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    );
  };

  const filterActive = hasExerciseFilter || selectedTags.length > 0;

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Volume by week</CardTitle>

      {/* Tag chips + compact multi-select exercise picker on the right */}
      <div className="flex flex-wrap items-center gap-1.5">
        {BALANCE_TAGS.map((t) => {
          const active = selectedTags.includes(t) && !hasExerciseFilter;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(t)}
              className={cn(
                'inline-flex min-h-7 items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors',
                active
                  ? 'border-accent/60 bg-accent/15 text-accent'
                  : 'border-border bg-surface2 text-muted-foreground hover:text-foreground hover:border-accent/30',
              )}
            >
              {BALANCE_TAG_LABEL[t]}
            </button>
          );
        })}

        <ExerciseMultiSelect
          options={exerciseOptions}
          selectedIds={selectedExerciseIds}
          onChange={(ids) => {
            setSelectedExerciseIds(ids);
            if (ids.length > 0) setSelectedTags([]);
          }}
        />
      </div>

      {hasData ? (
        <>
          <div className="-ml-2 h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatVolume}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent))', fillOpacity: 0.06 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const total = payload.reduce(
                      (s, p) => s + ((p.value as number) || 0),
                      0,
                    );
                    if (!total) return null;
                    return (
                      <div className="rounded-md border border-border/60 bg-card/95 px-2.5 py-1.5 text-[11px] shadow-md">
                        <div className="mb-1 font-semibold">
                          Week of {label as string}
                        </div>
                        {payload
                          .slice()
                          .reverse()
                          .map((p) =>
                            (p.value as number) > 0 ? (
                              <div
                                key={p.dataKey as string}
                                className="flex items-center gap-1.5 text-muted-foreground"
                              >
                                <span
                                  className="inline-block size-2 rounded-[1px] flex-shrink-0"
                                  style={{ background: p.fill as string }}
                                />
                                {hasExerciseFilter
                                  ? formatVolume(p.value as number)
                                  : `${BALANCE_TAG_LABEL[p.dataKey as BalanceTag] ?? p.dataKey}: ${formatVolume(p.value as number)}`}
                              </div>
                            ) : null,
                          )}
                        {!hasExerciseFilter && payload.length > 1 && (
                          <div className="mt-1 border-t border-border/40 pt-1 font-semibold text-foreground">
                            Total: {formatVolume(total)}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {hasExerciseFilter ? (
                  <Bar
                    dataKey="volume"
                    fill={TAG_COLORS.push}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                ) : (
                  displayTags.map((tag, i) => (
                    <Bar
                      key={tag}
                      dataKey={tag}
                      stackId="a"
                      fill={TAG_COLORS[tag]}
                      radius={
                        i === displayTags.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]
                      }
                      isAnimationActive={false}
                    />
                  ))
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color legend (only for stacked view) */}
          {!hasExerciseFilter && (
            <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              {displayTags.map((tag) => (
                <span key={tag} className="flex items-center gap-1">
                  <span
                    className="inline-block size-2.5 rounded-[2px]"
                    style={{ background: TAG_COLORS[tag] }}
                  />
                  {BALANCE_TAG_LABEL[tag]}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="italic text-sm text-muted-foreground m-0 py-3">
          {filterActive
            ? 'No volume logged for this filter.'
            : 'Log some sessions to see your weekly volume here.'}
        </p>
      )}
    </Card>
  );
}
