# Zenith

Zenith is a fitness goal-tracking app for strength training. You build
programs, schedule exercises across the week, log your sessions, and
watch your adherence and volume trend over time. It's a **PWA** —
install it to your phone's home screen and it runs full-screen, no App
Store needed.

Live at **<https://zenith-theta-puce.vercel.app/>**.

---

## For users

### What it does

- **Track strength work.** Programs are made of individual exercises.
  Log sets × reps × weight, held duration (planks, hangs, wall sits),
  resistance-band color × reps, or reps alone for bodyweight moves.
- **Programs as plans.** Each program has its own exercises with their
  own schedule — pinned weekdays ("Mon/Wed/Fri") or a frequency target
  ("3× per week"). Mark programs **active** to put them in your daily
  plan, or **inactive** to shelve them without losing their history.
- **Warm-up and rehab, not just lifting.** Programs come in three
  types — Weight Lifting, Warm Up, and Rehab — each color-coded, with
  warm-ups surfaced first in the day's plan and rehab programs carrying
  a stated focus (e.g. "right knee tracking").
- **Swap exercises on the road.** Traveling, and the hotel gym doesn't
  have your machine? Substitute any exercise for one that trains the
  same movement pattern (a chest-press machine for a dumbbell bench, a
  back squat for a goblet squat). The swap counts toward the day, so
  your streak survives the trip.
- **Program updates from what you actually lifted.** When a logged
  session diverges from the plan — heavier weight, or reps outside the
  target range — Zenith offers an "Update program?" prompt with new
  targets pre-filled. You can tweak the suggestion before confirming.
- **Adherence at a glance.** Day / week / month rings on the progress
  screen show how close you are to your scheduled work. A 12-week
  trend chart and weekday heatmap break it down further.
- **Reschedule a day.** Push today's lift to a later day this week
  without it counting as a miss. Useful when the body says no but the
  week still has room.
- **Rest when you need to.** If you're sick or injured, log a rest day
  with a reason and optional note. Rest days are "out of program" —
  they neither count as misses nor toward your numerator.
- **Settings.** Pick the day your week starts on (any day, defaults to
  Monday) and your weight unit (lb or kg).

### How to use it

1. **Sign in** with Google.
2. **Create a program** — give it a name, then add exercises. Type a
   name and Zenith suggests matches from its catalog (with default
   tags and tracking type). Pick a schedule per exercise. Tick
   "Activate now" if you want it in today's plan immediately.

   <img src="docs/screenshots/edit-program.png" alt="Editing an exercise inside a program" width="420" />

3. **Log from the home screen.** "Today" shows what's scheduled. Tap
   an exercise card to log sets, then save. Use **Log ad-hoc** to pull
   in any other weekday's set or pick individual exercises. Short on
   equipment? Hit the **↻ substitute** button on a card to swap in an
   exercise that trains the same movement.
4. **Check progress** on the Progress screen. Filter the Strength
   Volume chart by tag (push / pull / legs / upper / lower / core) or
   by specific exercise.
5. **Mark a rest day** from the home screen when you're sick or
   injured. Those days won't be counted as misses.

   <img src="docs/screenshots/rest-day-1.png" alt="Take a rest day CTA below today's goals" width="500" />

   <img src="docs/screenshots/rest-day-2.png" alt="Rest day modal with reason chips and an optional note" width="420" />

6. **Or reschedule today** instead — pushes today's exercises onto a
   later day this week, with the option to undo before doing them.
7. **Export / import** your data as JSON at any time from a program's
   detail page — useful for backups.

### Signing in

Zenith is **open to anyone** — no invite or approval needed. Just open
the live URL above and sign in.

Sign-in uses **Google authentication only**, so you'll need a valid
Google / Gmail account. Your data is scoped to your own account; every
user gets their own private, isolated set of programs and history.

### Data & privacy

Zenith stores **only** what you explicitly enter into it. There is no
analytics, no tracking pixels, no third-party telemetry.

- **What's collected:** the Google account info Firebase Authentication
  exposes (display name, email, profile picture URL, Google UID), plus
  the workout data you create — programs, exercises, logged sessions,
  rest days, reschedules, settings.
- **Where it lives:** in [Cloud Firestore](https://firebase.google.com/products/firestore)
  under a Firebase project I (the maintainer) operate. Data is scoped
  per-user via Firestore security rules — your records are only
  readable/writable by your own signed-in session.
- **Who can see it:** I can see signed-in users in the Firebase Auth
  console (names + emails) and, as the project owner, I have technical
  read access to the underlying Firestore documents. I don't routinely
  look at them, but you should know it's possible.
- **Export / delete:** every program can be exported as JSON from its
  detail page at any time. To delete your account and all associated
  Firestore data, reach out via my GitHub profile
  ([@kkauff](https://github.com/kkauff)) and I'll remove it.

If you're not comfortable with the above, the project is MIT-licensed
and self-hostable — see the
[Firebase setup](#firebase-setup-one-time) section to run your own
Firebase project so the data lives entirely under your control.

### Installing it on your phone (PWA)

Once you're signed in, install Zenith to your home screen so it
launches full-screen like a native app — no App Store needed.

**iPhone / iPad (Safari only — Chrome on iOS can't install PWAs):**

1. Open <https://zenith-theta-puce.vercel.app/> in **Safari**.
2. Tap the **Share** button (the square with the up-arrow) at the
   bottom of the screen.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name ("Zenith") and tap **Add** in the top-right.
5. The Zenith icon appears on your home screen. Tap it to launch —
   it runs full-screen, no browser chrome.

**Android (Chrome):**

1. Open <https://zenith-theta-puce.vercel.app/> in **Chrome**.
2. Chrome usually shows an **Install** prompt at the bottom of the
   screen — tap **Install** and you're done.
3. If you don't see the prompt: tap the **⋮** menu (top-right) and
   choose **Install app** (or **Add to Home screen**).
4. Confirm. The Zenith icon appears in your app drawer / home
   screen. Tap it to launch full-screen.

After installing, sign in with Google once and you'll stay signed in
across launches.

---

## Architecture

- **Frontend:** Vite + React + TypeScript, styled with Tailwind.
- **Hosting:** [Vercel](https://vercel.com). Every push to `main`
  auto-deploys. Live at <https://zenith-theta-puce.vercel.app/>.
- **Auth:** Firebase Authentication, Google provider only.
- **Storage:** Cloud Firestore. Data is scoped per signed-in user
  under `users/{uid}/...`. Firestore security rules restrict each
  document subtree to its owning UID — a user can only read / write
  their own data.
- **Live sync:** Firestore `onSnapshot` listeners — log a session on
  your phone and the desktop view updates without a reload.
- **PWA:** A Web App Manifest + service worker make the app
  installable to the iOS / Android home screen and runnable
  full-screen offline-friendly.

### Per-user Firestore layout

```
users/{uid}/programs/{programId}                Program docs (with embedded exercises)
users/{uid}/instances/{instanceId}              Instance docs (one per logged session)
users/{uid}/exercises/{exerciseId}              Library mirror of every exercise ever in a program
users/{uid}/restDays/{YYYY-MM-DD}               Rest days, keyed by local date
users/{uid}/reschedules/{YYYY-MM-DD}            Push-a-day records, keyed by source date
users/{uid}/settings/preferences                Singleton preferences doc (week start, weight unit)
```

The library mirror lets historical instances resolve their exercise
name / tags even after the source program is deleted — programs
behave more like tags than containers.

---

## Features (exhaustive)

### Programs

- **Three program types**, each color-coded across the app: **Weight
  Lifting**, **Warm Up** (sorted first in the day's plan), and **Rehab**
  (which requires a short focus, e.g. "right knee tracking", shown on
  the program). Warm-up and rehab programs unlock band and reps-only
  tracking in addition to weight and time.
- Each program is **active** or **inactive**. Active programs feed
  today's plan and adherence math; inactive ones stay in *My Programs*
  (dimmed with an "Inactive" pill) and keep their full history. Toggle
  via the gear menu on the program detail page.
- Multiple programs at once. Deleting a program does **not** delete
  your logged sessions — instances keep a dangling `programId` so
  progress survives.
- Each program holds its own list of exercises with their own
  scheduling.

### Exercises

- **Tracking types:**
  - `weight` — sets × reps × weight.
  - `time` — sets × held duration (planks, hangs, wall sits).
  - `band` — resistance-band color × reps (with a free-text "Other"
    band).
  - `count` — reps alone, for bodyweight moves.
- **Schedules:**
  - `weekly-days` — pinned weekdays (any subset of Sun–Sat).
  - `frequency` — N times per week / month, no specific day attached.
- **Planned sets:** describe what you intend to do (warmups, working
  sets, rep ranges like `8-10`). The log form pre-fills from these.
- **Hardcoded exercise catalog** of common moves: bench press, squat,
  deadlift, lat pulldown, hammer curl, plank, dead hang, etc. Fuzzy
  matching means "bnch press" surfaces "Bench Press"; aliases like
  "rdl", "ohp", "pullup" all resolve.
- **Tags:** `upper`, `lower`, `core`, `push`, `pull`, `legs` (plus
  `pre-run` / `pre-lift` for warm-ups). Auto-inferred from the catalog
  (exact alias match + fuzzy fallback) for exercises that match an
  entry; user-overridable per-exercise from the program detail page.
- **Movement patterns** — a finer label (horizontal / vertical push and
  pull, squat, hinge, hamstring-curl, with single-leg as a modifier)
  that powers substitution: swapping only ever offers an exercise that
  shares a pattern, and single-leg lifts stay within their own family
  (a Bulgarian split squat won't offer a barbell back squat).

### Today screen

- Greeting + day's scheduled exercises across all active programs.
- Inline log cards: set the values, tap save, done.
- "Today" includes both pinned-day exercises and frequency-target
  progress for the current period.
- **Log ad-hoc** — one dropdown for borrowing another weekday's full
  set (missed days bubbled to the top), or picking specific exercises
  one at a time.
- **Update program from a logged session** — when your sets diverge
  from the plan, an "Update program?" button surfaces after logging.
  The modal pre-fills per-set weights from what you actually lifted;
  if set 1's reps fell outside the rep range, every set's range shifts
  by the same diff (set 1's deviation from the original midpoint, with
  `min` clamped at 1). Everything is editable before you confirm.
- **Substitute an exercise** — a today-only swap for when you're short
  on equipment. Pick from exercises sharing the same movement pattern;
  the substitute logs against the scheduled slot, so the card still
  reads "done" and adherence is untouched. Gone tomorrow — your saved
  program is never edited.
- **Reschedule today** — push today's exercises onto a later day this
  week. Source day stops expecting them; target day picks them up. An
  undo banner appears on the source day until the next reschedule.
- **Rest day modal** with reason (sick / injured / other) and optional
  notes.

### Progress screen

- **Adherence rings** for day, week, and month. Adherence prorates
  uniformly across weekly-pinned days and frequency goals. Rest days
  drop out of the denominator entirely.
- **Adherence insights** — 12-week trend chart with weekday averages
  and a time-of-day histogram. Filterable by program.
- **Volume chart** — 8-week sparkline of strength volume. Filter by
  tag chip (push / pull / legs / upper / lower / core) or by specific
  exercise via a multiselect dropdown. The filtered series overlays
  the overall series on the same y-axis so you can compare directly.
- **History** list of every logged session, with delete. Sessions
  whose program was deleted still show, tagged "Removed program";
  ad-hoc sessions are tagged "Ad-hoc".

### Program detail page

- Exercises grouped by weekday with a colored heatmap header — tap a
  weekday cell to expand its exercise list. Each row has clickable
  tag chips so you can re-tag without opening the edit form.
- Recent sessions grouped by date with a per-day progress ring (how
  many of the day's scheduled exercises you logged).
- Gear menu in the header for deactivate / activate / delete, each
  behind a confirmation modal.

### Settings

- **Start of week** — any day, Monday by default.
- **Weight unit** — lb or kg (display label only; values aren't
  auto-converted).

### Data

- **Per-user isolation** via Firestore security rules.
- **Live cross-device sync** via `onSnapshot`.
- **Export / import** a single program as JSON from its detail page.

### Platform

- Installable PWA (iOS Safari + Android Chrome).
- Mobile-first responsive layout.

---

## Roadmap

Next features I'm planning to tackle:

- **User-provided API keys for AI providers** so the app can offer
  AI-driven insights and workflows (training suggestions, weekly
  recaps, plateau detection) using _your_ key — no shared inference
  costs.
- **Improved muscle-group visualization** for strength progression,
  using
  [`react-native-body-highlighter`](https://github.com/Onyo/react-native-body-highlighter)
  (or its web equivalent) to render which muscles you've trained and
  how recently.

---

## For developers

### Run it locally

```sh
npm install
# Create .env.local with your Firebase web config (see below)
npm run dev
```

Open the URL it prints (default `http://localhost:5173`). Click
"Continue with Google", pick an account, and you'll land in an empty
programs list. Sign in with a different Google account and you'll see
a separate (also empty) data set.

```sh
npm run build      # type-check + production build → dist/
npm run preview    # serve dist/ locally to test the PWA
npm run typecheck  # type-check only
```

To regenerate the PWA icons (e.g. if you change the brand color):

```sh
node scripts/gen-icons.mjs
```

### Firebase setup (one-time)

You need a Firebase project for auth + Firestore. The free Spark plan
is more than enough for personal use.

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and create a new project.
2. **Enable Authentication:** Authentication → Get started →
   **Sign-in method** → enable **Google** → fill project public name
   - support email → Save.
3. **Enable Firestore:** Firestore Database → Create database →
   **production mode** → pick a nearby region.
4. **Lock down access** — Firestore Database → **Rules**:
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
5. **Register a web app:** Project Overview → **+ Add app** → web
   (`</>`). Copy the `firebaseConfig`.
6. **Paste config into `.env.local`:**
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<project>
   VITE_FIREBASE_APP_ID=1:...:web:...
   ```
7. Restart `npm run dev` so Vite picks up the new env vars.

When you deploy, set the same four env vars in the hosting provider
and add the deployed origin to **Authentication → Settings →
Authorized domains** (otherwise sign-in popups fail with
`auth/unauthorized-domain`).

### Deploying

Live deploys go to Vercel. Push to GitHub, import the repo on
[vercel.com](https://vercel.com), set the four `VITE_FIREBASE_*`
environment variables, and deploy. Every push to `main` redeploys
automatically. Vite bakes env vars in at build time, so changing them
requires a redeploy.

After the first deploy, add the Vercel origin to Firebase
**Authentication → Settings → Authorized domains**.

### Project structure

```
src/
  App.tsx                top-level component; gates on auth, subscribes to Firestore
  auth.ts                Firebase Auth wrapper (Google provider)
  firebase.ts            Firebase app init from env vars
  storage.ts             Firestore reads / writes / live subscriptions
  settings.tsx           SettingsContext + useSettings hook
  types.ts               Program, Exercise, PlannedSet, Instance, RestDay, Reschedule, UserSettings
  templates.ts           categories + helpers (schedule/reps/duration parsing)
  today.ts               "what's scheduled today" + adherence math
  instance.ts            name / tag / tracking-type resolution for logged instances
  exercise-library.ts    hardcoded exercise catalog + fuzzy matching + substitutes
  program-suggestion.ts  diff a logged session against plannedSets → suggested update
  index.css              mobile-first styles
  main.tsx               React entry point
  components/
    Login.tsx                sign-in screen
    AppHeader.tsx            header showing avatar + name + nav + settings menu
    Home.tsx                 home / today screen
    TodayBox.tsx             today summary card
    TodayExerciseCard.tsx    inline log card for one exercise
    UpdateProgramModal.tsx   editable "update program from logged session" modal
    RestDayModal.tsx         rest-day form
    RescheduleModal.tsx      push-a-day picker modal
    SubstituteModal.tsx      movement-pattern exercise-swap picker
    LogAdhocPicker.tsx       unified ad-hoc picker (weekday or specific exercise)
    ActiveProgramsPanel.tsx  active program list on the home screen
    NewProgram.tsx           create-a-program form
    ProgramDetail.tsx        view / edit a program (heatmap + sessions)
    ProgramsScreen.tsx       all programs view
    ExerciseForm.tsx         add / edit a single exercise
    ExercisePicker.tsx       searchable single-exercise picker
    SchedulePicker.tsx       weekday / frequency picker
    SetEditor.tsx            planned-sets editor
    SettingsScreen.tsx       user preferences (week start, weight unit)
    ProgressScreen.tsx       progress wrapper
    ProgressPanel.tsx        strength volume chart
    ProgressSummaryPanel.tsx home-screen mini progress summary
    AdherenceRings.tsx       day/week/month adherence rings
    AdherenceInsights.tsx    trend + weekday + time-of-day insights
    ProgressRing.tsx         single-ring SVG primitive
    HistoryPanel.tsx         logged-instance history
    MultiselectDropdown.tsx  reusable multiselect with pills
    ConfirmDialog.tsx        confirm modal
public/
  pwa-*.png            PWA icons (used by manifest)
  apple-touch-icon.png iOS home-screen icon
  favicon.svg          browser tab icon
scripts/
  gen-icons.mjs        regenerates the icons above
```

---

## Contributing

Issues and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for
the (light) process. For security issues, please follow
[SECURITY.md](SECURITY.md) instead of filing a public issue.

---

## Credits

- **Knewave Outline** display font by Tyler Finck — distributed via
  [The League of Moveable Type](https://www.theleagueofmoveabletype.com/knewave)
  under the [SIL Open Font License 1.1](public/fonts/OFL.txt).
  The font file is bundled in `public/fonts/` alongside its OFL.
- Icons from [Lucide](https://lucide.dev) (ISC license).
- UI primitives adapted from [shadcn/ui](https://ui.shadcn.com) (MIT).

---

## License

Zenith is licensed under the **MIT License**. See [LICENSE](LICENSE)
for the full text.

Third-party assets bundled in this repository retain their own
licenses — see [Credits](#credits).
