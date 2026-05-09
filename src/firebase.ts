import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isConfigured =
  Boolean(config.apiKey) &&
  Boolean(config.authDomain) &&
  Boolean(config.projectId) &&
  Boolean(config.appId);

const app = isConfigured ? initializeApp(config) : null;

// Non-null assertions are safe at call sites because the Login screen blocks
// the rest of the app when `isConfigured` is false.
export const firebaseAuth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
