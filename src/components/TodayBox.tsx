import type { Instance, Program } from '../types';
import { dayName, exercisesForDay, instancesOnDay } from '../today';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
  onOpen: () => void;
};

export function TodayBox({ programs, instances, today, onOpen }: Props) {
  const scheduled = exercisesForDay(programs, today);
  const todays = instancesOnDay(instances, today);
  // An exercise counts as "done today" if any instance for it was logged
  // today. Multiple instances of the same exercise still count once.
  const doneIds = new Set(todays.map((i) => i.exerciseId));
  const done = scheduled.filter((s) => doneIds.has(s.exercise.id)).length;
  const total = scheduled.length;

  if (total === 0) {
    return (
      <section className="card today-box today-rest">
        <div className="today-rest-icon" aria-hidden>
          🌿
        </div>
        <div>
          <div className="today-title">{dayName(today)}</div>
          <div className="muted small">Nothing scheduled — rest day.</div>
        </div>
      </section>
    );
  }

  // First 3 names, then "+N more" if longer.
  const previewNames = scheduled.slice(0, 3).map((s) => s.exercise.name);
  const more = scheduled.length - previewNames.length;

  return (
    <button className="card today-box today-active" onClick={onOpen}>
      <div className="today-text">
        <div className="today-title">{dayName(today)} Goals</div>
        <div className="today-summary">
          {done} of {total} done
        </div>
        <div className="muted small today-preview">
          {previewNames.join(' · ')}
          {more > 0 ? ` · +${more} more` : ''}
        </div>
      </div>
      <span className="chev today-chev" aria-hidden>
        ›
      </span>
    </button>
  );
}
