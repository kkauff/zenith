import { ArrowLeft } from 'lucide-react';
import type { Instance, Program } from '../types';
import {
  dayName,
  exercisesForDay,
  instancesOnDay,
} from '../today';
import { TodayExerciseCard } from './TodayExerciseCard';
import { Button } from './ui/button';
import { Card } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
  onBack: () => void;
  onLog: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
};

export function TodayScreen({
  programs,
  instances,
  today,
  onBack,
  onLog,
}: Props) {
  const scheduled = exercisesForDay(programs, today);
  const todays = instancesOnDay(instances, today);

  const dateStr = today.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
          {dayName(today)} Goals
        </h1>
      </header>
      <p className="text-sm text-muted-foreground m-0">{dateStr}</p>

      {scheduled.length === 0 ? (
        <Card className="text-center flex flex-col items-center gap-3 py-8">
          <h2 className="text-base font-semibold m-0">Nothing scheduled</h2>
          <p className="text-sm text-muted-foreground m-0">
            No exercises on the calendar for today.
          </p>
        </Card>
      ) : (
        scheduled.map(({ program, exercise }) => (
          <TodayExerciseCard
            key={exercise.id}
            program={program}
            exercise={exercise}
            todaysInstances={todays.filter((i) => i.exerciseId === exercise.id)}
            onLog={onLog}
          />
        ))
      )}
    </div>
  );
}
