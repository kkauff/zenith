import { useMemo } from 'react';
import type { Instance, RestDay } from '../../types';
import { useSettings } from '../../settings';
import { dateKey, startOfWeek } from '../../today';
import { Card, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';

type Props = {
  instances: Instance[];
  restDays: RestDay[];
  today: Date;
};

type CellState = 'lift' | 'sick' | 'rest' | 'empty' | 'future';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const NUM_WEEKS = 8;

export function ConsistencyCalendar({ instances, restDays, today }: Props) {
  const { weekStartDay } = useSettings();

  const liftDays = useMemo(() => {
    const s = new Set<string>();
    for (const inst of instances) s.add(dateKey(new Date(inst.loggedAt)));
    return s;
  }, [instances]);

  const restDayMap = useMemo(() => {
    const m = new Map<string, RestDay>();
    for (const rd of restDays) m.set(rd.date, rd);
    return m;
  }, [restDays]);

  const todayStr = dateKey(today);

  // rows[week][day] — week 0 = oldest, week NUM_WEEKS-1 = current
  const rows = useMemo(() => {
    const weekStart = startOfWeek(today, weekStartDay);
    const gridStart = new Date(weekStart);
    gridStart.setDate(gridStart.getDate() - (NUM_WEEKS - 1) * 7);
    return Array.from({ length: NUM_WEEKS }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => {
        const d = new Date(gridStart);
        d.setDate(d.getDate() + week * 7 + day);
        return d;
      }),
    );
  }, [today, weekStartDay]);

  function getState(date: Date): CellState {
    const ds = dateKey(date);
    if (ds > todayStr) return 'future';
    if (liftDays.has(ds)) return 'lift';
    const rd = restDayMap.get(ds);
    if (!rd) return 'empty';
    return rd.reason === 'sick' || rd.reason === 'injured' ? 'sick' : 'rest';
  }

  // Streak: lift days ending today; intentional rest (reason='other') doesn't break it
  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date(today);
    while (true) {
      const dk = dateKey(cursor);
      if (liftDays.has(dk)) {
        count++;
      } else {
        const rd = restDayMap.get(dk);
        if (!rd || rd.reason !== 'other') break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [today, liftDays, restDayMap]);

  const { liftCount, restCount, sickCount } = useMemo(() => {
    let lift = 0, rest = 0, sick = 0;
    for (const row of rows) {
      for (const date of row) {
        const ds = dateKey(date);
        if (ds > todayStr) continue;
        if (liftDays.has(ds)) { lift++; continue; }
        const rd = restDayMap.get(ds);
        if (rd) {
          if (rd.reason === 'sick' || rd.reason === 'injured') sick++;
          else rest++;
        }
      }
    }
    return { liftCount: lift, restCount: rest, sickCount: sick };
  }, [rows, liftDays, restDayMap, todayStr]);

  // Day-of-week column headers
  const dayLabels = Array.from({ length: 7 }, (_, i) => DAY_SHORT[(weekStartDay + i) % 7]);

  // Row label: show "Apr 20"; when month rolls over show abbreviated month
  const rowLabels = rows.map((week, i) => {
    const d = week[0];
    const monthStr = MONTH_SHORT[d.getMonth()];
    if (i === 0) return `${monthStr} ${d.getDate()}`;
    const prevMonth = rows[i - 1][0].getMonth();
    if (d.getMonth() !== prevMonth) return `${monthStr} ${d.getDate()}`;
    return String(d.getDate());
  });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <CardTitle>Consistency — 8 weeks</CardTitle>
        {streak > 0 && (
          <span className="text-sm font-semibold tabular-nums text-accent">
            {streak}d streak
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        {/* Day-of-week column headers */}
        <div className="flex gap-0.5">
          <div className="w-10 flex-shrink-0" />
          {dayLabels.map((label) => (
            <div
              key={label}
              className="flex-1 text-center text-[10px] font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {rows.map((week, weekIdx) => (
          <div key={weekIdx} className="flex items-center gap-0.5">
            <div className="w-10 flex-shrink-0 text-right pr-1.5 text-[9px] tabular-nums text-muted-foreground">
              {rowLabels[weekIdx]}
            </div>
            {week.map((date, dayIdx) => {
              const state = getState(date);
              const isToday = dateKey(date) === todayStr;
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'flex-1 h-5 rounded-[3px]',
                    state === 'lift' && 'bg-accent',
                    state === 'sick' && 'bg-rest',
                    state === 'rest' && 'bg-muted-foreground/25',
                    (state === 'empty' || state === 'future') && 'bg-surface2/50',
                    isToday && 'ring-1 ring-accent/60 ring-offset-1 ring-offset-card',
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <LegendDot bgClass="bg-accent" label="Lift" />
          <LegendDot bgClass="bg-muted-foreground/25" label="Rest" />
          <LegendDot bgClass="bg-rest" label="Sick" />
        </div>
        <div className="flex gap-4 text-xs">
          <StatChip value={liftCount} label="lifts" className="text-accent" />
          <StatChip value={restCount} label="rest" className="text-muted-foreground" />
          {sickCount > 0 && (
            <StatChip value={sickCount} label="sick" className="text-rest" />
          )}
        </div>
      </div>
    </Card>
  );
}

function LegendDot({ bgClass, label }: { bgClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn('inline-block size-2.5 rounded-[2px]', bgClass)} />
      {label}
    </span>
  );
}

function StatChip({ value, label, className }: { value: number; label: string; className?: string }) {
  return (
    <span>
      <strong className={cn('tabular-nums', className)}>{value}</strong>{' '}
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
