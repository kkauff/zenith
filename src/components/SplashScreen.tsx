import { Dumbbell } from 'lucide-react';

// Full-screen pulsating dumbbell icon shown while auth/data is loading or
// during the minimum splash window on first open. Renders in accent pink with
// a pulsing drop-shadow glow.
export function SplashScreen() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
    >
      <Dumbbell
        aria-hidden
        className="splash-icon text-accent"
        size={192}
        strokeWidth={1.75}
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
