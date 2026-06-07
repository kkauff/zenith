import { useState } from "react";
import * as auth from "../auth";
import { Brand } from "./ui/brand";
import { Button } from "./ui/button";

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
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-border/60 bg-card px-6 py-10 text-center flex flex-col items-center gap-5">
        <Brand as="h1" className="text-6xl leading-none m-0" />

        {!auth.isConfigured ? (
          <div className="w-full rounded-lg border border-border bg-surface2 p-4 text-left">
            <strong className="text-foreground">Set up needed.</strong>
            <p className="text-sm text-muted-foreground mt-1 mb-0">
              Add your Firebase config to{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">
                .env.local
              </code>
              :{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">
                VITE_FIREBASE_API_KEY
              </code>
              ,{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">
                VITE_FIREBASE_AUTH_DOMAIN
              </code>
              ,{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">
                VITE_FIREBASE_PROJECT_ID
              </code>
              ,{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">
                VITE_FIREBASE_APP_ID
              </code>
              .
            </p>
          </div>
        ) : (
          <>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSignIn}
              disabled={signingIn}
            >
              {signingIn ? "Signing in…" : "Continue with Google"}
            </Button>
            <p className="text-xs text-muted-foreground m-0">
              Signing in with Google is the same as creating an account — Google
              handles the password, we just remember which account is yours.
            </p>
            {error && <p className="text-sm text-destructive m-0">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
