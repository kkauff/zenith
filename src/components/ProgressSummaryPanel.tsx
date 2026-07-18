import type { Instance, Program, Reschedule, RestDay } from '../types';
import {
  adherencePast30Days,
  adherencePast7Days,
  adherenceToday,
} from '../today';
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
  const day = adherenceToday(programs, instances, restDays, today, reschedules);
  const week = adherencePast7Days(
    programs,
    instances,
    restDays,
    today,
    reschedules,
  );
  const month = adherencePast30Days(
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
        <ProgressRing percent={day} label="Today" size={72} />
        <ProgressRing percent={week} label="7 days" size={72} />
        <ProgressRing percent={month} label="30 days" size={72} />
      </div>
      <Button variant="secondary" size="sm" onClick={onSeeMore}>
        See more
      </Button>
    </div>
  );
}
