# Zenith

A tiny weight-lifting + goal-tracking app. Built as a **PWA** (installable web
app) so you can use it on your phone without ever shipping an iOS app to the
App Store.

- **Stack:** Vite + React + TypeScript
- **Auth:** Sign in with Google (no usernames / passwords to manage)
- **Storage:** `localStorage`, namespaced by Google account ID — different
  Google accounts signing in on the same device get isolated data
- **Mobile:** installs to the iOS / Android home screen and runs full-screen
  via the included Web App Manifest + service worker

## Run it locally

```sh
npm install
cp .env.example .env.local   # then paste your Google Client ID (see below)
npm run dev
```

Open the URL it prints (default `http://localhost:5173`). You'll see the login
screen. Click "Continue with Google", pick an account, and you'll land in an
empty lift log + goal list — your own. Sign out and back in with a different
Google account and you'll see a separate (also empty) data set.

```sh
npm run build      # type-check + production build → dist/
npm run preview    # serve dist/ locally to test the PWA
npm run typecheck  # type-check only
```

If you ever want to regenerate the PWA icons (e.g. you change the brand color):

```sh
node scripts/gen-icons.mjs
```

## Google Cloud setup (one-time, ~5 minutes)

You need a Google OAuth Client ID so Google's "Sign in with Google" button
knows which app is asking. It's free.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and
   sign in with the Google account you want to own this project.
2. Create a project (top bar dropdown → "New Project") — name it whatever, e.g.
   "Zenith".
3. Configure the OAuth consent screen:
   - Left sidebar → **APIs & Services → OAuth consent screen**.
   - User type: **External**. Click Create.
   - Fill in App name (Zenith), user support email, developer contact email.
     Skip scopes and test users for now. Save.
   - You don't need to publish/verify the app for personal use — anyone you
     add as a "test user" can sign in. Add yourself + your friends'
     Gmail addresses under **Test users**.
4. Create the Client ID:
   - Left sidebar → **APIs & Services → Credentials**.
   - **+ Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: "Zenith web".
   - **Authorized JavaScript origins** — add every URL the app will be served
     from. At minimum:
     - `http://localhost:5173` (dev)
     - your deployed URL once you have one (e.g. `https://zenith.vercel.app`)
   - Click Create. Copy the **Client ID**.
5. Paste it into `.env.local`:
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
   ```
6. Restart `npm run dev` so Vite picks up the new env var.

When you deploy, set `VITE_GOOGLE_CLIENT_ID` as an environment variable in
your hosting provider (Vercel/Cloudflare/Netlify all have a UI for this) and
add the deployed origin to "Authorized JavaScript origins" in step 4.

## How the per-user storage works

There's no backend. All data lives in the browser's `localStorage`, keyed by
the Google account's stable subject ID (`sub`):

```
zenith:v1:auth                       → currently signed-in user
zenith:v1:user:<googleSub>:lifts     → LiftEntry[]
zenith:v1:user:<googleSub>:goals     → Goal[]
```

So if you and a friend share a phone, you each "Sign in with Google" with your
own account and only see your own data. Sign out swaps the active session.
See `src/storage.ts` and `src/auth.ts`.

**Important caveat:** because everything runs client-side, "Sign in with
Google" here is for *identity / UX* (which localStorage bucket are we
reading?), not server-enforced security. The data isn't actually protected
from someone with hands-on access to the phone — they could open dev tools or
clear storage. That's fine for "me and my friends tracking lifts on our own
phones." When you eventually add a backend for cross-device sync, the backend
will verify the Google ID token server-side and that's where real auth kicks
in.

## Hosting it so your friends can use it on their phones

Pick one — all are free for this kind of project. **In every case, after
deploying, go back to the Google Cloud Credentials page and add the deployed
URL to your OAuth client's "Authorized JavaScript origins."**

### Option A — Vercel (recommended, easiest)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, "Add New
   Project", pick this repo.
3. Vercel auto-detects Vite. Under "Environment Variables" add
   `VITE_GOOGLE_CLIENT_ID` = your client ID. Click Deploy.
4. You get a `https://<project>.vercel.app` URL. Every push to `main` redeploys
   automatically.

### Option B — Cloudflare Pages

1. Push to GitHub.
2. [pages.cloudflare.com](https://pages.cloudflare.com) → "Create project" →
   connect your repo.
3. Build command: `npm run build`. Output dir: `dist`. Add the
   `VITE_GOOGLE_CLIENT_ID` environment variable.
4. You get a `https://<project>.pages.dev` URL.

### Option C — Netlify

Same flow. Build command `npm run build`, publish directory `dist`. Add
`VITE_GOOGLE_CLIENT_ID` under Site settings → Environment variables.

### Option D — GitHub Pages (cheapest, slightly fiddly)

Works fine for this app since it's a pure SPA. You'll need to set Vite's
`base` to the repo name in `vite.config.ts` and add a GitHub Actions workflow
to publish `dist/` to the `gh-pages` branch. For env vars you'd inject the
client ID at build time via Actions secrets.

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
  App.tsx              top-level component; gates on auth, wires state to storage
  auth.ts              Google Identity Services wrapper + session persistence
  storage.ts           per-user localStorage (lifts, goals)
  types.ts             LiftEntry, Goal
  index.css            mobile-first styles
  main.tsx             React entry point
  components/
    Login.tsx          sign-in screen with Google button
    SignedInBar.tsx    header showing avatar + name + sign-out
    LiftLog.tsx        log-a-lift form + recent list
    Goals.tsx          goal list with toggle
public/
  pwa-*.png            PWA icons (used by manifest)
  apple-touch-icon.png iOS home-screen icon
  favicon.svg          browser tab icon
scripts/
  gen-icons.mjs        regenerates the icons above
```

## When you outgrow localStorage

Flagging the obvious limits so future-you isn't surprised:

- **No cross-device sync.** Switch to IndexedDB + a sync backend (Supabase is
  the lowest-friction option, and it has built-in Google OAuth) when you
  want this.
- **localStorage caps at ~5 MB per origin.** Plenty for thousands of lifts;
  not fine for photos/videos.
- **Auth is identity-only.** Adding a backend turns Google sign-in into real
  enforced auth — the server validates the Google ID token before serving
  any data.
