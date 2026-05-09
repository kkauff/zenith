import { DAY_LABELS } from '../templates';
import { cn } from '@/lib/utils';

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
    <div className="flex w-full gap-2" role="group" aria-label="Days of week">
      {DAY_LABELS.map((label, i) => {
        const active = days.includes(i);
        return (
          <button
            key={i}
            type="button"
            aria-pressed={active}
            onClick={() => toggleDay(i)}
            className={cn(
              'flex-1 min-w-0 h-11 rounded-full font-semibold text-[15px] transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'bg-primary text-primary-foreground border-2 border-primary shadow-glow-primary-sm'
                : 'bg-surface2 text-muted-foreground border-2 border-border hover:border-primary/40',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
