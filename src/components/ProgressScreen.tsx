import { ArrowLeft } from 'lucide-react';
import type { Instance, LibraryExercise, Program, RestDay } from '../types';
import { ConsistencyCalendar } from './progress/ConsistencyCalendar';
import { LiftTimeDistribution } from './progress/LiftTimeDistribution';
import { ProgramBalance } from './progress/ProgramBalance';
import { StrengthProgression } from './progress/StrengthProgression';
import { VolumeProgression } from './progress/VolumeProgression';
import { Button } from './ui/button';

type Props = {
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
  restDays: RestDay[];
  today: Date;
  onBack: () => void;
};

export function ProgressScreen({
  programs,
  instances,
  library,
  restDays,
  today,
  onBack,
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

      <VolumeProgression programs={programs} instances={instances} library={library} today={today} />
      <StrengthProgression programs={programs} instances={instances} library={library} />
      <ProgramBalance programs={programs} instances={instances} library={library} today={today} />
      <ConsistencyCalendar instances={instances} restDays={restDays} today={today} />
      <LiftTimeDistribution instances={instances} />
    </div>
  );
}
