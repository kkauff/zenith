import type { Instance, Program, Reschedule, RestDay } from "../types";
import { adherenceMonth, adherenceToday, adherenceWeek } from "../today";
import { useSettings } from "../settings";
import { AdherenceInsights } from "./AdherenceInsights";
import { ProgressRing } from "./ProgressRing";
import { Card, CardTitle } from "./ui/card";

type Props = {
  programs: Program[];
  instances: Instance[];
  restDays: RestDay[];
  reschedules: Reschedule[];
  today: Date;
};

export function AdherenceRings({
  programs,
  instances,
  restDays,
  reschedules,
  today,
}: Props) {
  // Adherence reflects "what I'm currently planning to do" — inactive
  // (shelved) programs shouldn't count expected work toward the ring.
  const activePrograms = programs.filter((p) => p.active);
  const { weekStartDay } = useSettings();
  const day = adherenceToday(
    activePrograms,
    instances,
    restDays,
    today,
    reschedules,
  );
  const week = adherenceWeek(
    activePrograms,
    instances,
    restDays,
    today,
    reschedules,
    weekStartDay,
  );
  const month = adherenceMonth(
    activePrograms,
    instances,
    restDays,
    today,
    reschedules,
  );

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
          reschedules={reschedules}
          today={today}
        />
      </div>
    </Card>
  );
}
