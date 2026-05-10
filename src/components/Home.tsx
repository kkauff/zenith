import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Instance, Program } from '../types';
import { exercisesForDay, greetingFor, instancesOnDay } from '../today';
import { TodayBox } from './TodayBox';
import { TodayExerciseCard } from './TodayExerciseCard';
import { Button } from './ui/button';
import { Card } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
  userName: string;
  onNew: () => void;
  onLogInstance: (fields: Omit<Instance, 'id' | 'loggedAt'>) => void;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
};

export function Home({
  programs,
  instances,
  today,
  userName,
  onNew,
  onLogInstance,
  onUpdateInstance,
  onDeleteInstance,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const greeting = greetingFor(today, userName);

  // First-time empty state — still show the greeting; just point at program
  // creation instead of the today panel.
  if (programs.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <h2 className="text-2xl font-bold tracking-tight m-0">{greeting}!</h2>
        <Card className="text-center flex flex-col items-center gap-3 py-8">
          <h2 className="text-base font-semibold m-0">No programs yet</h2>
          <p className="text-sm text-muted-foreground m-0">
            Create a program to start tracking exercises and logging sessions.
          </p>
          <Button onClick={onNew}>
            <Plus aria-hidden /> New program
          </Button>
        </Card>
      </div>
    );
  }

  const scheduled = exercisesForDay(programs, today);
  const todays = instancesOnDay(instances, today);

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-2xl font-bold tracking-tight m-0">{greeting}!</h2>
      <TodayBox
        programs={programs}
        instances={instances}
        today={today}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />
      {expanded && scheduled.length > 0 && (
        <div className="space-y-3">
          {scheduled.map(({ program, exercise }) => (
            <TodayExerciseCard
              key={exercise.id}
              program={program}
              exercise={exercise}
              todaysInstances={todays.filter(
                (i) => i.exerciseId === exercise.id,
              )}
              onLog={onLogInstance}
              onUpdate={onUpdateInstance}
              onDelete={onDeleteInstance}
            />
          ))}
        </div>
      )}
    </div>
  );
}
