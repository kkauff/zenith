import type { Instance, Program } from '../types';
import { adherenceMonth, adherenceToday, adherenceWeek } from '../today';
import { ProgressRing } from './ProgressRing';
import { Card, CardTitle } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
};

export function AdherenceRings({ programs, instances, today }: Props) {
  const day = adherenceToday(programs, instances, today);
  const week = adherenceWeek(programs, instances, today);
  const month = adherenceMonth(programs, instances, today);

  return (
    <Card>
      <CardTitle className="mb-2">Goal adherence</CardTitle>
      <div className="flex justify-around gap-3 mt-2">
        <ProgressRing percent={day} label="Day" />
        <ProgressRing percent={week} label="Week" />
        <ProgressRing percent={month} label="Month" />
      </div>
    </Card>
  );
}
