import { Trash2 } from 'lucide-react';
import type { Instance, LibraryExercise, Program } from '../types';
import { formatDistance, formatDuration } from '../templates';
import { resolveExerciseName } from '../instance';
import { Button } from './ui/button';
import { Card, CardTitle } from './ui/card';

type Props = {
  programs: Program[];
  instances: Instance[];
  library: LibraryExercise[];
  onDelete: (id: string) => void;
};

export function HistoryPanel({
  programs,
  instances,
  library,
  onDelete,
}: Props) {
  return (
    <Card>
      <CardTitle className="mb-5">History</CardTitle>
      {instances.length === 0 ? (
        <p className="italic text-sm text-muted-foreground py-2 m-0">
          No sessions logged yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 list-none m-0 p-0">
          {instances.map((inst) => {
            const program = programs.find((p) => p.id === inst.programId);
            const name =
              resolveExerciseName(inst, programs, library) ??
              'Unknown exercise';
            // Three states for the program tag:
            //   - matched: show the program name as a normal tag
            //   - dangling programId (program was deleted): "Removed program"
            //   - no programId at all (logged ad-hoc from the catalog): "Ad-hoc"
            const tag = program
              ? program.name
              : inst.programId
                ? 'Removed program'
                : 'Ad-hoc';
            const isOrphan = !program;
            return (
              <li
                key={inst.id}
                className="flex items-start gap-2 rounded-lg bg-surface2 p-3.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <strong className="font-semibold truncate">{name}</strong>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(inst.loggedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span
                      className={
                        isOrphan ? 'italic text-muted-foreground/70' : ''
                      }
                    >
                      {tag}
                    </span>
                    {' · '}
                    {summarizeSets(inst)}
                  </div>
                  {inst.notes && (
                    <div className="text-xs text-muted-foreground italic">
                      “{inst.notes}”
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Delete session"
                  onClick={() => {
                    if (confirm('Delete this logged session?')) {
                      onDelete(inst.id);
                    }
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function summarizeSets(inst: Instance): string {
  if (inst.sets.length === 0) return 'No sets recorded';
  const unit = inst.cardioUnit ?? 'miles';
  return inst.sets
    .map((s) => {
      if (s.distance !== undefined && s.durationSeconds !== undefined) {
        return `${formatDistance(s.distance, unit)} · ${formatDuration(s.durationSeconds)}`;
      }
      if (s.distance !== undefined) return formatDistance(s.distance, unit);
      if (s.durationSeconds !== undefined)
        return formatDuration(s.durationSeconds);
      if (s.weight !== undefined && s.reps !== undefined)
        return `${s.weight}×${s.reps}`;
      return '—';
    })
    .join(', ');
}
