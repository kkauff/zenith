import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  as?: 'h1' | 'h2' | 'span' | 'div';
  children?: React.ReactNode;
};

/**
 * Brand wordmark — renders text in Knewave Outline with a soft cyan neon glow.
 * Defaults to "Zenith" when no children are passed.
 */
export function Brand({ className, as: Tag = 'span', children = 'Zenith' }: Props) {
  return (
    <Tag className={cn('font-display select-none', className)}>{children}</Tag>
  );
}
