import type { Instance, Program } from '../types';
import { adherenceMonth, adherenceToday, adherenceWeek } from '../today';
import { ProgressRing } from './ProgressRing';

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
    <section className="card">
      <h2>Goal adherence</h2>
      <div className="rings-row">
        <ProgressRing percent={day} label="Day" />
        <ProgressRing percent={week} label="Week" />
        <ProgressRing percent={month} label="Month" />
      </div>
    </section>
  );
}
