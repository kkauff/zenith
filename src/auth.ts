// Google Identity Services wrapper.
//
// We don't talk to a backend, so this module's job is purely:
//   1. Render Google's official "Sign in with Google" button.
//   2. Receive the ID token (JWT) Google hands back.
//   3. Pull the user's identity (sub, email, name, picture) out of it.
//   4. Persist that identity locally so they stay "signed in" across reloads.
//
// We do NOT verify the JWT signature here — that requires a server. For a
// client-only app this is fine: the Google `sub` is what we namespace storage
// by, and a user spoofing it would only be lying to themselves about which
// localStorage bucket to read.

const SESSION_KEY = 'zenith:v1:auth';

export type AuthUser = {
  sub: string; // Google's stable user ID
  email: string;
  name: string;
  picture: string;
};

// Minimal subset of the Google Identity Services API that we touch.
type GsiCredentialResponse = { credential: string };
type GsiButtonOptions = {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
};
type Gsi = {
  accounts: {
    id: {
      initialize: (opts: {
        client_id: string;
        callback: (response: GsiCredentialResponse) => void;
        auto_select?: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, opts: GsiButtonOptions) => void;
      disableAutoSelect: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: Gsi;
  }
}

export function getClientId(): string | undefined {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return id && id.length > 0 ? id : undefined;
}

// JWT payloads are base64url-encoded JSON. The browser's `atob` only handles
// standard base64, so we normalize first.
function decodeJwt(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '==='.slice((normalized.length + 3) % 4);
    const json = atob(padded);
    // Use TextDecoder so non-ASCII characters in names (é, 日本語, …) survive.
    const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    if (!decoded.sub) return null;
    return {
      sub: String(decoded.sub),
      email: String(decoded.email ?? ''),
      name: String(decoded.name ?? decoded.email ?? 'User'),
      picture: String(decoded.picture ?? ''),
    };
  } catch {
    return null;
  }
}

export function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  // Tell GIS to forget the auto-selected account, otherwise the next sign-in
  // attempt may silently log the user back in with the same Google account.
  window.google?.accounts.id.disableAutoSelect();
}

// The GIS script loads asynchronously via <script async> in index.html. This
// resolves once `window.google` is defined.
export function waitForGoogle(): Promise<Gsi> {
  return new Promise((resolve, reject) => {
    if (window.google) return resolve(window.google);
    let elapsed = 0;
    const tick = 50;
    const timeout = 8000;
    const handle = setInterval(() => {
      if (window.google) {
        clearInterval(handle);
        resolve(window.google);
        return;
      }
      elapsed += tick;
      if (elapsed >= timeout) {
        clearInterval(handle);
        reject(new Error('Google Identity Services failed to load'));
      }
    }, tick);
  });
}

export async function initSignInButton(
  container: HTMLElement,
  clientId: string,
  onSignIn: (user: AuthUser) => void,
): Promise<void> {
  const gsi = await waitForGoogle();
  gsi.accounts.id.initialize({
    client_id: clientId,
    callback: (resp) => {
      const user = decodeJwt(resp.credential);
      if (user) {
        saveSession(user);
        onSignIn(user);
      }
    },
  });
  gsi.accounts.id.renderButton(container, {
    theme: 'filled_blue',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
  });
}
