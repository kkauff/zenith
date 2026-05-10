import { ArrowLeft } from 'lucide-react';
import type { Instance, Program } from '../types';
import { AdherenceRings } from './AdherenceRings';
import { ProgressPanel } from './ProgressPanel';
import { Button } from './ui/button';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
  onBack: () => void;
};

export function ProgressScreen({ programs, instances, today, onBack }: Props) {
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

      <AdherenceRings programs={programs} instances={instances} today={today} />

      <ProgressPanel programs={programs} instances={instances} today={today} />
    </div>
  );
}
