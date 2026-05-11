import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// We expose the same surface area as a native <select> (value, onChange,
// children of <option> elements) so callers don't need to change. Under the
// hood it's a custom popover so the option list is fully themed instead of
// rendering as an unthemed OS menu.

export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'onChange'
> & {
  children: ReactNode;
  onChange?: (event: { target: { value: string } }) => void;
};

type Option = { value: string; label: ReactNode; labelText: string };

function readOptions(children: ReactNode): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    // Accept <option value="..."> elements (and ignore everything else).
    if (
      typeof child.type === 'string' &&
      (child.type === 'option' || child.type === 'OPTION')
    ) {
      const el = child as ReactElement<{
        value?: string | number;
        children?: ReactNode;
      }>;
      const value = String(el.props.value ?? '');
      const label = el.props.children ?? value;
      const labelText =
        typeof label === 'string' || typeof label === 'number'
          ? String(label)
          : value;
      out.push({ value, label, labelText });
    }
  });
  return out;
}

// We accept a ref typed as HTMLSelectElement for back-compat with callers
// that pass refs to ui/select. We never actually use it — exposed methods
// on the hidden native node should still work (focus, etc.).
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, value, onChange, disabled, ...props }, ref) => {
    const options = readOptions(children);
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenRef = useRef<HTMLSelectElement>(null);
    useImperativeHandle(
      ref,
      () => hiddenRef.current as HTMLSelectElement,
    );

    const [open, setOpen] = useState(false);
    const current = options.find((o) => o.value === value) ?? options[0];

    useEffect(() => {
      if (!open) return;
      const onMouseDown = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('keydown', onKey);
      return () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('keydown', onKey);
      };
    }, [open]);

    const pick = (v: string) => {
      onChange?.({ target: { value: v } });
      setOpen(false);
    };

    return (
      <div ref={containerRef} className="relative">
        {/* Hidden native select preserves form-submission semantics and
            screen-reader behavior even though the visible UI is custom. */}
        <select
          ref={hiddenRef}
          value={value as string | undefined}
          onChange={(e) => onChange?.({ target: { value: e.target.value } })}
          disabled={disabled}
          aria-hidden
          tabIndex={-1}
          className="sr-only"
          {...props}
        >
          {children}
        </select>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-lg border border-border bg-input pl-3.5 pr-3 py-2.5 text-left text-base text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className="truncate">{current?.label ?? ''}</span>
          <ChevronDown
            aria-hidden
            className={cn(
              'ml-2 size-4 text-foreground/70 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {open && options.length > 0 && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-20 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-card py-1 shadow-lg"
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(o.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface2/60 focus-visible:bg-surface2/60 focus-visible:outline-none',
                    active && 'text-primary',
                  )}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      'size-4 flex-shrink-0',
                      active ? 'opacity-100 text-primary' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
