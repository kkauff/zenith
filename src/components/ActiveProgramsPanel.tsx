import { ChevronRight, FileText } from 'lucide-react';
import type { Program } from '../types';
import { getCategory } from '../templates';
import { Button } from './ui/button';

type Props = {
  // Caller filters to active programs only; inactive ones surface via
  // "Manage All Programs".
  programs: Program[];
  onOpen: (programId: string) => void;
  onManage: () => void;
};

export function ActiveProgramsPanel({ programs, onOpen, onManage }: Props) {
  if (programs.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4 flex flex-col gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          No active programs
        </div>
        <p className="m-0 text-xs text-muted-foreground">
          Activate one from My Programs to start tracking it.
        </p>
        <Button variant="secondary" size="sm" onClick={onManage}>
          Manage All Programs
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 flex flex-col gap-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {programs.length} Active Program{programs.length === 1 ? '' : 's'}
      </div>
      <ul className="flex flex-col gap-2 list-none m-0 p-0">
        {programs.map((p) => {
          const cat = getCategory(p.categoryKey);
          const Icon = cat?.Icon ?? FileText;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p.id)}
                aria-label={`Open ${p.name}`}
                className="w-full flex items-center gap-3 rounded-md bg-surface2 px-3 py-2 text-left transition-colors hover:bg-surface2/70 border border-transparent hover:border-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span
                  className={
                    p.categoryKey === 'warmup'
                      ? 'flex size-8 items-center justify-center rounded-md bg-warmup/10 text-warmup flex-shrink-0'
                      : p.categoryKey === 'rehab'
                        ? 'flex size-8 items-center justify-center rounded-md bg-rehab/10 text-rehab flex-shrink-0'
                        : 'flex size-8 items-center justify-center rounded-md bg-accent/10 text-accent flex-shrink-0'
                  }
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cat?.name ?? p.categoryKey}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 text-muted-foreground flex-shrink-0"
                />
              </button>
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" size="sm" onClick={onManage}>
        Manage All Programs
      </Button>
    </div>
  );
}
