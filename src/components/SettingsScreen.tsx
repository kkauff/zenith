import { useEffect, useState } from 'react';
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

// No local form state for button options — each click writes the full
// object and App's snapshot subscription round-trips it back.
// Body weight uses a local draft so we don't fire a save on every keystroke.
export function SettingsScreen({ settings, onSave, onBack }: Props) {
  const [bodyWeightDraft, setBodyWeightDraft] = useState(
    () => (settings.bodyWeight !== undefined ? String(settings.bodyWeight) : ''),
  );

  // Keep the draft in sync whenever the saved value changes (e.g. after a
  // unit conversion saves a new body weight).
  useEffect(() => {
    setBodyWeightDraft(
      settings.bodyWeight !== undefined ? String(settings.bodyWeight) : '',
    );
  }, [settings.bodyWeight]);

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
                onClick={() => {
                  const next: UserSettings = { ...settings, weightUnit: opt.value };
                  // Convert stored body weight to match the new unit.
                  if (settings.bodyWeight !== undefined && !active) {
                    if (settings.weightUnit === 'lb' && opt.value === 'kg') {
                      next.bodyWeight = Math.round((settings.bodyWeight / 2.2046) * 10) / 10;
                    } else if (settings.weightUnit === 'kg' && opt.value === 'lb') {
                      next.bodyWeight = Math.round(settings.bodyWeight * 2.2046);
                    }
                  }
                  onSave(next);
                }}
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
        <CardTitle className="mb-4">Body weight</CardTitle>
        <p className="m-0 mb-3 text-xs text-muted-foreground">
          Used to calculate effective load for assisted exercises (e.g. assisted
          pull-ups logged as negative weights). Stored in your current weight
          unit.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step={0.5}
            value={bodyWeightDraft}
            placeholder={settings.weightUnit === 'kg' ? '68' : '150'}
            onChange={(e) => setBodyWeightDraft(e.target.value)}
            onBlur={() => {
              const val = parseFloat(bodyWeightDraft);
              if (!isNaN(val) && val > 0) {
                onSave({ ...settings, bodyWeight: val });
              }
            }}
            className="w-28 rounded-lg border border-border bg-input px-3 py-2 text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-sm text-muted-foreground">
            {settings.weightUnit}
          </span>
        </div>
      </Card>
    </div>
  );
}
