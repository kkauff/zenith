import { cn } from '@/lib/utils';

type Props<T extends string> = {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
  className?: string;
};

// iOS-style segmented control: capsule with the active segment lifted by a
// slight background contrast.
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-surface2 p-0.5 text-[11px] font-semibold',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-[5px] px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
