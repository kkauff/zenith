import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label: ReactNode;
  children: ReactNode;
  // Which side of the trigger the bubble sits on.
  side?: 'top' | 'bottom';
  // Horizontal anchoring — use 'start'/'end' near a container edge so the
  // bubble doesn't clip off screen.
  align?: 'start' | 'center' | 'end';
  // Extra classes for the wrapper (e.g. flex sizing when the trigger is a
  // flex-item like a chart bar).
  className?: string;
};

// Lightweight CSS-only tooltip in the app's styling. Shows instantly on
// hover/focus via a named group — no JS, no portal — so it must wrap its
// trigger. For a plain hover hint, prefer this over the native `title`
// attribute (which is delayed and unstyled).
export function Tooltip({
  label,
  children,
  side = 'top',
  align = 'center',
  className,
}: Props) {
  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-20 hidden w-max max-w-[220px] rounded-md border border-primary/40 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-glow-primary-sm group-hover/tooltip:block group-focus-within/tooltip:block',
          side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'start' && 'left-0',
          align === 'end' && 'right-0',
        )}
      >
        {label}
      </span>
    </span>
  );
}
