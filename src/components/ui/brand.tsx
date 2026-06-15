import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  as?: 'h1' | 'h2' | 'span' | 'div';
  children?: React.ReactNode;
};

/**
 * Brand wordmark — "zenith" in small font, then "LIFT" with a dumbbell icon.
 */
export function Brand({ className, as: Tag = 'span', children }: Props) {
  return (
    <Tag
      className={cn(
        'font-display text-glow-bio select-none inline-flex items-baseline gap-1',
        className,
      )}
    >
      {children ?? (
        <>
          <span style={{ fontFamily: '"Knewave Outline", cursive' }}>LIFT</span>
          <Dumbbell aria-hidden className="size-[0.6em] self-center" />
        </>
      )}
    </Tag>
  );
}
