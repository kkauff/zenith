import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { firebaseAuth, isConfigured } from './firebase';

export type AuthUser = {
  // Firebase UID — used as the Firestore root key for this user.
  sub: string;
  email: string;
  name: string;
  picture: string;
};

export { isConfigured };

function toAuthUser(u: User): AuthUser {
  return {
    sub: u.uid,
    email: u.email ?? '',
    name: u.displayName ?? u.email ?? 'User',
    picture: u.photoURL ?? '',
  };
}

// Subscribe to auth state. Fires once with the current user (or null) and then
// again on every sign-in / sign-out. Returns the unsubscribe function.
export function subscribeAuth(cb: (user: AuthUser | null) => void): () => void {
  if (!firebaseAuth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, (u) => cb(u ? toAuthUser(u) : null));
}

export async function signIn(): Promise<void> {
  if (!firebaseAuth) throw new Error('Firebase is not configured.');
  const provider = new GoogleAuthProvider();
  await signInWithPopup(firebaseAuth, provider);
}

export async function signOut(): Promise<void> {
  if (!firebaseAuth) return;
  await fbSignOut(firebaseAuth);
}
