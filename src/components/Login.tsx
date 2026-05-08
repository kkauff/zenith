import { useEffect, useRef, useState } from 'react';
import { getClientId, initSignInButton, type AuthUser } from '../auth';

type Props = {
  onSignIn: (user: AuthUser) => void;
};

export function Login({ onSignIn }: Props) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = getClientId();

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;
    initSignInButton(buttonRef.current, clientId, onSignIn).catch((e) => {
      setError(e instanceof Error ? e.message : 'Sign-in failed to load');
    });
  }, [clientId, onSignIn]);

  return (
    <div className="login">
      <div className="login-card">
        <h1>Zenith</h1>
        <p className="muted">Lift logging and goal tracking.</p>

        {!clientId ? (
          <div className="config-warning">
            <strong>Set up needed.</strong>
            <p className="muted">
              Add your Google OAuth Client ID to <code>.env.local</code> as
              <br />
              <code>VITE_GOOGLE_CLIENT_ID</code>. See the README for setup steps.
            </p>
          </div>
        ) : (
          <>
            <div ref={buttonRef} className="google-btn-wrap" />
            <p className="muted small">
              Signing in with Google is the same as creating an account — Google
              handles the password, we just remember which account is yours.
            </p>
            {error && <p className="error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
