# Zenith

A tiny weight-lifting + goal-tracking app. Built as a **PWA** (installable web
app) so you can use it on your phone without ever shipping an iOS app to the
App Store.

- **Stack:** Vite + React + TypeScript
- **Auth:** Firebase Auth (Google provider) — no usernames / passwords to manage
- **Storage:** Firestore, scoped per user — programs and logged instances live
  under `users/{uid}/...` and sync live across all your devices
- **Mobile:** installs to the iOS / Android home screen and runs full-screen
  via the included Web App Manifest + service worker

## Run it locally

```sh
npm install
# Create .env.local with your Firebase web config (see "Firebase setup" below)
npm run dev
```

Open the URL it prints (default `http://localhost:5173`). You'll see the login
screen. Click "Continue with Google", pick an account, and you'll land in an
empty programs list — your own. Sign out and back in with a different Google
account and you'll see a separate (also empty) data set.

```sh
npm run build      # type-check + production build → dist/
npm run preview    # serve dist/ locally to test the PWA
npm run typecheck  # type-check only
```

If you ever want to regenerate the PWA icons (e.g. you change the brand color):

```sh
node scripts/gen-icons.mjs
```

## Firebase setup (one-time)

You need a Firebase project for auth + Firestore. The free Spark plan is more
than enough for personal use.

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and create a new project (any name, e.g. "Zenith").
2. **Enable Authentication:**
   - Left sidebar → **Authentication** → **Get started**.
   - **Sign-in method** tab → click **Google** → toggle Enable, fill in
     project public-facing name + support email → **Save**.
3. **Enable Firestore:**
   - Left sidebar → **Firestore Database** → **Create database** → start in
     **production mode** → pick a region close to you.
4. **Lock down access** — Firestore Database → **Rules** tab, replace with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   Click **Publish**. Each user can only touch their own `users/{uid}/...`
   subtree.
5. **Register a web app:**
   - Project Overview → **+ Add app** → web (`</>`) icon.
   - Nickname: anything. Skip Firebase Hosting.
   - Copy the `firebaseConfig` object it shows.
6. **Paste config into `.env.local`:**
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<project>
   VITE_FIREBASE_APP_ID=1:...:web:...
   ```
7. Restart `npm run dev` so Vite picks up the new env vars.

When you deploy, set the same four env vars in your hosting provider and add
the deployed origin to **Authentication → Settings → Authorized domains** in
the Firebase console (otherwise sign-in popups will fail with
`auth/unauthorized-domain`).

## How the per-user storage works

All programs and logged instances live in Firestore under the signed-in
user's Firebase Auth UID:

```
users/{uid}/programs/{programId}     → Program docs
users/{uid}/instances/{instanceId}   → Instance docs (one per logged session)
```

Reads use `onSnapshot`, so changes from another device propagate live — log a
workout on your phone and the laptop updates without reloading. The security
rules above mean a user's data is only readable / writable by that user.

See `src/storage.ts`, `src/auth.ts`, and `src/firebase.ts`.

### Export / import

The "Export" button downloads everything in your account as JSON. "Import"
takes that file and merges it back in (existing records win on conflict, so
re-importing the same file is a safe no-op). Useful for backups or migrating
between accounts.

## Hosting it so your friends can use it on their phones

Pick one — all are free for this kind of project. **In every case, after
deploying, go to Firebase Console → Authentication → Settings → Authorized
domains and add the deployed origin** so sign-in popups work.

### Option A — Vercel (recommended, easiest)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, "Add New
   Project", pick this repo.
3. Vercel auto-detects Vite. Under "Environment Variables" add the four
   `VITE_FIREBASE_*` values from your `.env.local`. Click Deploy.
4. You get a `https://<project>.vercel.app` URL. Every push to `main`
   redeploys automatically. Vite bakes env vars in at build time, so adding
   or changing them requires a redeploy.

### Option B — Cloudflare Pages

1. Push to GitHub.
2. [pages.cloudflare.com](https://pages.cloudflare.com) → "Create project" →
   connect your repo.
3. Build command: `npm run build`. Output dir: `dist`. Add the four
   `VITE_FIREBASE_*` environment variables.
4. You get a `https://<project>.pages.dev` URL.

### Option C — Netlify

Same flow. Build command `npm run build`, publish directory `dist`. Add the
four `VITE_FIREBASE_*` vars under Site settings → Environment variables.

### Option D — GitHub Pages (cheapest, slightly fiddly)

Works fine for this app since it's a pure SPA. You'll need to set Vite's
`base` to the repo name in `vite.config.ts` and add a GitHub Actions workflow
to publish `dist/` to the `gh-pages` branch. Inject env vars at build time
via Actions secrets.

## Installing it on a phone (no App Store needed)

### iOS (Safari)

1. Open the deployed URL in **Safari** (not Chrome — only Safari can install
   PWAs on iOS).
2. Tap the Share button → **Add to Home Screen**.
3. Tap Add. The Zenith icon appears on your home screen and launches
   full-screen, no browser chrome.

### Android (Chrome)

1. Open the URL in Chrome.
2. Chrome shows an "Install" prompt automatically, or tap the menu →
   **Install app**.

## Project structure

```
src/
  App.tsx              top-level component; gates on auth, subscribes to Firestore
  auth.ts              Firebase Auth wrapper (Google provider)
  firebase.ts          Firebase app init from env vars
  storage.ts           Firestore reads / writes / live subscriptions
  types.ts             Program, Exercise, PlannedSet, Instance, …
  templates.ts         starter program templates
  today.ts             "what's scheduled today" helpers
  index.css            mobile-first styles
  main.tsx             React entry point
  components/
    Login.tsx          sign-in screen
    SignedInBar.tsx    header showing avatar + name + sign-out
    DataMenu.tsx       export / import buttons
    Home.tsx           program list + adherence rings
    NewProgram.tsx     create-a-program form
    ProgramDetail.tsx  view / edit a program; per-exercise log button
    ExerciseForm.tsx   add / edit a single exercise
    SchedulePicker.tsx weekday picker
    SetEditor.tsx      planned-sets editor
    LogInstance.tsx    log-a-session form
    TodayScreen.tsx    today's scheduled exercises
    TodayBox.tsx       home-screen "today" summary
    TodayExerciseCard  inline log card on the today screen
    AdherenceRings.tsx weekly adherence visualization
    ProgressRing.tsx   single-ring SVG primitive
public/
  pwa-*.png            PWA icons (used by manifest)
  apple-touch-icon.png iOS home-screen icon
  favicon.svg          browser tab icon
scripts/
  gen-icons.mjs        regenerates the icons above
```
