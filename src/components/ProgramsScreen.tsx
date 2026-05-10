import { useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, Plus, Upload } from 'lucide-react';
import type { Program } from '../types';
import { getCategory } from '../templates';
import * as store from '../storage';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle } from './ui/card';

type Props = {
  userId: string;
  programs: Program[];
  onBack: () => void;
  onOpen: (programId: string) => void;
  onNew: () => void;
};

export function ProgramsScreen({
  userId,
  programs,
  onBack,
  onOpen,
  onNew,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = store.parseImportFile(text);
      const summary = await store.importData(userId, parsed);
      alert(
        `Imported ${summary.programsAdded} program(s) and ` +
          `${summary.instancesAdded} log entry(ies).` +
          (summary.programsSkipped || summary.instancesSkipped
            ? `\nSkipped ${summary.programsSkipped} program(s) and ` +
              `${summary.instancesSkipped} log entry(ies) already on this account.`
            : ''),
      );
    } catch (err) {
      alert(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
          My Programs
        </h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Programs</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleImportClick}
              disabled={busy}
            >
              <Upload aria-hidden /> Import
            </Button>
            <Button size="sm" onClick={onNew}>
              <Plus aria-hidden /> New
            </Button>
          </div>
        </CardHeader>

        {programs.length === 0 ? (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            No programs yet. Tap “New” to create one, or “Import” to load a
            previous export.
          </p>
        ) : (
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
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </Card>
    </div>
  );
}
