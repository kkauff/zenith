import { FileText } from 'lucide-react';
import type { Program } from '../types';
import { getCategory } from '../templates';
import { Button } from './ui/button';

type Props = {
  programs: Program[];
  onManage: () => void;
};

export function ActiveProgramsPanel({ programs, onManage }: Props) {
  if (programs.length === 0) return null;

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
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-md bg-surface2 px-3 py-2"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {cat?.name ?? p.categoryKey}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" size="sm" onClick={onManage}>
        Manage Programs
      </Button>
    </div>
  );
}
