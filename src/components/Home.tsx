import { ChevronRight, FileText, Plus } from 'lucide-react';
import type { Instance, Program } from '../types';
import { getCategory } from '../templates';
import { AdherenceRings } from './AdherenceRings';
import { TodayBox } from './TodayBox';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
  onOpen: (programId: string) => void;
  onNew: () => void;
  onOpenToday: () => void;
};

export function Home({
  programs,
  instances,
  today,
  onOpen,
  onNew,
  onOpenToday,
}: Props) {
  // First-time empty state — no programs yet, so no schedule and no adherence
  // to compute. Skip the today/adherence cards entirely.
  if (programs.length === 0) {
    return (
      <Card className="mt-4 text-center flex flex-col items-center gap-3 py-8">
        <h2 className="text-base font-semibold m-0">No programs yet</h2>
        <p className="text-sm text-muted-foreground m-0">
          Create a program to start tracking exercises and logging sessions.
        </p>
        <Button onClick={onNew}>
          <Plus aria-hidden /> New program
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <TodayBox
        programs={programs}
        instances={instances}
        today={today}
        onOpen={onOpenToday}
      />

      <AdherenceRings programs={programs} instances={instances} today={today} />

      <Card>
        <CardHeader>
          <CardTitle>Your programs</CardTitle>
          <Button size="sm" onClick={onNew}>
            <Plus aria-hidden /> New
          </Button>
        </CardHeader>
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
                  className="w-full min-h-14 flex items-center gap-3 rounded-lg bg-surface2 px-3.5 py-3 text-left transition-colors hover:border-primary/40 border border-transparent active:bg-surface2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="truncate font-semibold">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {cat?.name ?? p.categoryKey} · {p.exercises.length}{' '}
                      exercise{p.exercises.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="size-5 text-muted-foreground flex-shrink-0"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
