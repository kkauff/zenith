import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export type PickerOption = {
  id: string;
  name: string;
  programName: string;
};

type Props = {
  options: PickerOption[];
  onSelect: (id: string) => void;
  // Notifies the parent when the dropdown opens/closes — lets a containing
  // modal keep its own Escape-to-close from firing while the dropdown is open.
  onOpenChange?: (open: boolean) => void;
};

// Searchable dropdown. Trigger button reveals an input + filtered list;
// picking an option fires onSelect and closes. Outside-click and Escape
// dismiss without choosing.
export function ExercisePicker({ options, onSelect, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

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
    ? options.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.programName.toLowerCase().includes(q),
      )
    : options;

  const pick = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  if (options.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full justify-start"
      >
        <Plus aria-hidden /> Log another exercise
      </Button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-10 overflow-hidden rounded-lg border border-border/60 bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border/60 px-3">
            <Search aria-hidden className="size-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search exercises…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs italic text-muted-foreground">
                No matches.
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => pick(o.id)}
                    className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors hover:bg-surface2/60 focus-visible:bg-surface2/60 focus-visible:outline-none"
                  >
                    <span className="text-sm font-semibold">{o.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.programName}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
