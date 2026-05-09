import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from './ui/button';
import * as store from '../storage';

type Props = {
  userId: string;
};

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function DataMenu({ userId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await store.exportData(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenith-export-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusy(false);
    }
  };

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
    <div className="mt-2 flex justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        disabled={busy}
      >
        <Download aria-hidden />
        Export
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleImportClick}
        disabled={busy}
      >
        <Upload aria-hidden />
        Import
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
