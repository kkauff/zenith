import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

export type MultiselectOption = {
  id: string;
  name: string;
};

type Props = {
  options: MultiselectOption[];
  selected: string[];
  onToggle: (id: string) => void;
  // Singular noun used in the empty trigger label ("Filter by {noun}")
  // and the single-selection summary. `nounPlural` defaults to `noun + 's'`
  // — override for words like "category" → "categories".
  noun: string;
  nounPlural?: string;
  className?: string;
};

// Pill-shaped multiselect dropdown trigger + popup. Renders only the
// trigger and its absolutely-positioned panel; selected-chip rendering is
// the parent's responsibility (see SelectedChips). Disabled and visually
// muted when there are no options.
export function MultiselectDropdown({
  options,
  selected,
  onToggle,
  noun,
  nounPlural,
  className,
}: Props) {
  const plural = nounPlural ?? `${noun}s`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.name.toLowerCase().includes(q))
    : options;

  const disabled = options.length === 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'inline-flex min-h-7 items-center gap-1.5 rounded-full border border-dashed border-border bg-transparent px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:border-primary/50 hover:text-foreground',
        )}
      >
        {selected.length > 0
          ? `${selected.length} ${selected.length === 1 ? noun : plural} selected`
          : `Filter by ${noun}`}
        <ChevronDown aria-hidden className="size-3" />
      </button>
      {open && !disabled && (
        <div className="absolute right-0 top-full mt-1 z-10 w-64 overflow-hidden rounded-lg border border-border/60 bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border/60 px-2">
            <Search aria-hidden className="size-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={`Search ${plural}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 border-0 bg-transparent px-0 text-xs focus-visible:ring-0"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs italic text-muted-foreground">
                No matches.
              </li>
            ) : (
              filtered.map((o) => {
                const active = selected.includes(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => onToggle(o.id)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface2/60 focus-visible:bg-surface2/60 focus-visible:outline-none',
                        active && 'bg-surface2/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-3.5 items-center justify-center rounded border',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border',
                        )}
                      >
                        {active && <Check aria-hidden className="size-2.5" />}
                      </span>
                      <span className="font-medium text-foreground">
                        {o.name}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Companion row of removable filled pills for currently-selected entries.
// Renders nothing when nothing is selected.
export function SelectedPillChips({
  options,
  selected,
  onToggle,
}: {
  options: MultiselectOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const selectedOptions = options.filter((o) => selected.includes(o.id));
  if (selectedOptions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {selectedOptions.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onToggle(o.id)}
          className="inline-flex min-h-7 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={`Remove ${o.name} filter`}
        >
          {o.name}
          <XIcon />
        </button>
      ))}
    </div>
  );
}

// Inlined small × so consumers don't all need to import lucide.
function XIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
