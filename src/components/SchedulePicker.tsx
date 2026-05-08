import { DAY_LABELS } from '../templates';

type Props = {
  days: number[];
  onChange: (days: number[]) => void;
};

export function SchedulePicker({ days, onChange }: Props) {
  const toggleDay = (d: number) => {
    const has = days.includes(d);
    const next = has ? days.filter((x) => x !== d) : [...days, d];
    next.sort((a, b) => a - b);
    onChange(next);
  };

  return (
    <div className="day-pills" role="group" aria-label="Days of week">
      {DAY_LABELS.map((label, i) => {
        const active = days.includes(i);
        return (
          <button
            key={i}
            type="button"
            className={`day-pill ${active ? 'day-pill-active' : ''}`}
            aria-pressed={active}
            onClick={() => toggleDay(i)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
