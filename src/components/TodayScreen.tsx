import type { Instance, Program } from '../types';
import {
  dayName,
  exercisesForDay,
  instancesOnDay,
} from '../today';
import { TodayExerciseCard } from './TodayExerciseCard';

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
    <div className="stack">
      <header className="screen-header">
        <button type="button" className="secondary" onClick={onBack}>
          ← Back
        </button>
        <h1>{dayName(today)} Goals</h1>
      </header>
      <p className="muted">{dateStr}</p>

      {scheduled.length === 0 ? (
        <section className="card empty-card">
          <h2>Nothing scheduled</h2>
          <p className="muted">No exercises on the calendar for today.</p>
        </section>
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
