import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { Instance } from '../../types';
import { Card, CardTitle } from '../ui/card';

type Props = {
  instances: Instance[];
};

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

const X_TICKS = [0, 6, 12, 18, 22];

export function LiftTimeDistribution({ instances }: Props) {
  const { data, peakHour } = useMemo(() => {
    const counts = new Array<number>(24).fill(0);
    for (const inst of instances) {
      counts[new Date(inst.loggedAt).getHours()]++;
    }
    const d = counts.map((count, hour) => ({ hour, count }));
    const peak = d.reduce((best, cur) => (cur.count > best.count ? cur : best), d[0]);
    return { data: d, peakHour: peak };
  }, [instances]);

  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <Card className="flex flex-col gap-3">
        <CardTitle>When you lift</CardTitle>
        <p className="italic text-sm text-muted-foreground m-0 py-3">
          Log some sessions to see your training hours here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>When you lift</CardTitle>
        <span className="text-xs text-muted-foreground">
          Peak: <strong className="text-foreground">{formatHour(peakHour.hour)}</strong>
        </span>
      </div>

      <div className="-ml-2 h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="15%">
            <XAxis
              dataKey="hour"
              ticks={X_TICKS}
              tickFormatter={formatHour}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--accent))', fillOpacity: 0.06 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const { hour, count } = payload[0].payload as { hour: number; count: number };
                if (count === 0) return null;
                return (
                  <div className="rounded-md border border-border/60 bg-card/95 px-2.5 py-1.5 text-[11px] shadow-md">
                    <div className="font-semibold">{formatHour(hour)}</div>
                    <div className="text-muted-foreground">
                      {count} session{count !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill="hsl(var(--accent))"
                  fillOpacity={
                    entry.count === 0
                      ? 0.08
                      : entry.count === peakHour.count
                        ? 1
                        : 0.55
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
