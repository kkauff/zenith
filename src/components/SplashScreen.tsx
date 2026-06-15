import { Dumbbell } from 'lucide-react';

// Full-screen pulsating dumbbell icon shown while auth/data is loading or
// during the minimum splash window on first open. Mirrors the favicon: cool
// off-white stroke with a pink outer + green inner glow that pulses.
export function SplashScreen() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
    >
      <Dumbbell
        aria-hidden
        className="splash-icon text-foreground"
        size={192}
        strokeWidth={1.75}
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
