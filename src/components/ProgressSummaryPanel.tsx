import type { Instance, Program, Reschedule, RestDay } from '../types';
import { adherenceMonth, adherenceToday, adherenceWeek } from '../today';
import { useSettings } from '../settings';
import { ProgressRing } from './ProgressRing';
import { Button } from './ui/button';

type Props = {
  programs: Program[];
  instances: Instance[];
  restDays: RestDay[];
  reschedules: Reschedule[];
  today: Date;
  onSeeMore: () => void;
};

export function ProgressSummaryPanel({
  programs,
  instances,
  restDays,
  reschedules,
  today,
  onSeeMore,
}: Props) {
  const { weekStartDay } = useSettings();
  const day = adherenceToday(programs, instances, restDays, today, reschedules);
  const week = adherenceWeek(
    programs,
    instances,
    restDays,
    today,
    reschedules,
    weekStartDay,
  );
  const month = adherenceMonth(
    programs,
    instances,
    restDays,
    today,
    reschedules,
  );

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 flex flex-col gap-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Progress
      </div>
      <div className="flex justify-around gap-3">
        <ProgressRing percent={day} label="Day" size={72} />
        <ProgressRing percent={week} label="Week" size={72} />
        <ProgressRing percent={month} label="Month" size={72} />
      </div>
      <Button variant="secondary" size="sm" onClick={onSeeMore}>
        See more
      </Button>
    </div>
  );
}
