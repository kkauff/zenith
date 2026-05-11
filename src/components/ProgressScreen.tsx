import { ArrowLeft } from 'lucide-react';
import type { Instance, LibraryExercise, Program, RestDay } from '../types';
import { AdherenceRings } from './AdherenceRings';
import { HistoryPanel } from './HistoryPanel';
import { ProgressPanel } from './ProgressPanel';
import { Button } from './ui/button';

type Props = {
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
  restDays: RestDay[];
  today: Date;
  onBack: () => void;
  onDeleteInstance: (id: string) => void;
};

export function ProgressScreen({
  programs,
  instances,
  library,
  restDays,
  today,
  onBack,
  onDeleteInstance,
}: Props) {
  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
          My Progress
        </h1>
      </header>

      <AdherenceRings
        programs={programs}
        instances={instances}
        restDays={restDays}
        today={today}
      />

      <ProgressPanel
        programs={programs}
        instances={instances}
        library={library}
        today={today}
      />

      <HistoryPanel
        programs={programs}
        instances={instances}
        library={library}
        onDelete={onDeleteInstance}
      />
    </div>
  );
}
