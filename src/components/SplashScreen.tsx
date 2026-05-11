// Full-screen pulsating "Z" shown while auth/data is loading or during the
// minimum splash window on first open. Uses the Knewave Outline display font
// in the accent pink with a pulsing text-shadow glow.
export function SplashScreen() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
    >
      <span
        aria-hidden
        className="splash-z font-display text-accent"
        style={{ fontSize: '12rem', lineHeight: 1 }}
      >
        Z
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
