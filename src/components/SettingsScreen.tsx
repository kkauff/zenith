import { ArrowLeft } from 'lucide-react';
import type { UserSettings, WeekStartDay, WeightUnit } from '../types';
import { Button } from './ui/button';
import { Card, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';

type Props = {
  settings: UserSettings;
  onSave: (next: UserSettings) => void;
  onBack: () => void;
};

// Monday first since it's the default; Sunday last so the two most-
// common picks anchor the ends of the list.
const WEEK_START_OPTIONS: { value: WeekStartDay; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const WEIGHT_UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
];

// No local form state — each option click writes the full object, and
// App's snapshot subscription round-trips it back as the new `settings`
// prop.
export function SettingsScreen({ settings, onSave, onBack }: Props) {
  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
          Settings
        </h1>
      </header>

      <Card>
        <CardTitle className="mb-4">Start of week</CardTitle>
        <p className="m-0 mb-3 text-xs text-muted-foreground">
          Affects the weekly adherence ring, frequency goals, and the
          reschedule picker.
        </p>
        <div className="flex flex-col gap-2">
          {WEEK_START_OPTIONS.map((opt) => {
            const active = settings.weekStartDay === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onSave({ ...settings, weekStartDay: opt.value })}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  active
                    ? 'border-primary/60 bg-primary/10 text-primary shadow-glow-primary-sm'
                    : 'border-border bg-surface2 text-foreground hover:border-primary/40',
                )}
              >
                <span className="font-semibold">{opt.label}</span>
                {active && (
                  <span className="text-xs uppercase tracking-wider text-primary">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-4">Weight unit</CardTitle>
        <p className="m-0 mb-3 text-xs text-muted-foreground">
          Changes the label shown next to weights. Existing values aren't
          converted — pick the unit you actually lift in.
        </p>
        <div className="flex flex-col gap-2">
          {WEIGHT_UNIT_OPTIONS.map((opt) => {
            const active = settings.weightUnit === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => onSave({ ...settings, weightUnit: opt.value })}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  active
                    ? 'border-primary/60 bg-primary/10 text-primary shadow-glow-primary-sm'
                    : 'border-border bg-surface2 text-foreground hover:border-primary/40',
                )}
              >
                <span className="font-semibold">{opt.label}</span>
                {active && (
                  <span className="text-xs uppercase tracking-wider text-primary">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
