import { useState } from 'react';
import * as auth from '../auth';

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await auth.signIn();
      // App.tsx is subscribed to auth state and will swap to the signed-in
      // view automatically.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>Zenith</h1>
        <p className="muted">Lift logging and goal tracking.</p>

        {!auth.isConfigured ? (
          <div className="config-warning">
            <strong>Set up needed.</strong>
            <p className="muted">
              Add your Firebase config to <code>.env.local</code>:
              <br />
              <code>VITE_FIREBASE_API_KEY</code>,{' '}
              <code>VITE_FIREBASE_AUTH_DOMAIN</code>,{' '}
              <code>VITE_FIREBASE_PROJECT_ID</code>,{' '}
              <code>VITE_FIREBASE_APP_ID</code>.
            </p>
          </div>
        ) : (
          <>
            <button onClick={handleSignIn} disabled={signingIn}>
              {signingIn ? 'Signing in…' : 'Continue with Google'}
            </button>
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
