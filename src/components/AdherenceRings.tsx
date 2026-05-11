import type { Instance, Program, RestDay } from "../types";
import { adherenceMonth, adherenceToday, adherenceWeek } from "../today";
import { AdherenceInsights } from "./AdherenceInsights";
import { ProgressRing } from "./ProgressRing";
import { Card, CardTitle } from "./ui/card";

type Props = {
  programs: Program[];
  instances: Instance[];
  restDays: RestDay[];
  today: Date;
};

export function AdherenceRings({
  programs,
  instances,
  restDays,
  today,
}: Props) {
  const day = adherenceToday(programs, instances, restDays, today);
  const week = adherenceWeek(programs, instances, restDays, today);
  const month = adherenceMonth(programs, instances, restDays, today);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <CardTitle className="mb-5">Goal tracking</CardTitle>
        <div className="flex justify-around gap-3 mt-2">
          <ProgressRing percent={day} label="Day" />
          <ProgressRing percent={week} label="Week" />
          <ProgressRing percent={month} label="Month" />
        </div>
      </div>
      <div className="border-t border-border/40 pt-3">
        <AdherenceInsights
          programs={programs}
          instances={instances}
          restDays={restDays}
          today={today}
        />
      </div>
    </Card>
  );
}
