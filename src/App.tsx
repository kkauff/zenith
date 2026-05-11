import { useEffect, useState } from 'react';
import { AppHeader, type NavView } from './components/AppHeader';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { NewProgram } from './components/NewProgram';
import { ProgramDetail } from './components/ProgramDetail';
import { ProgramsScreen } from './components/ProgramsScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { SplashScreen } from './components/SplashScreen';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import * as auth from './auth';
import * as store from './storage';
import type { AuthUser } from './auth';
import type { Instance, LibraryExercise, Program, RestDay } from './types';

type View =
  | { kind: 'home' }
  | { kind: 'programs' }
  | { kind: 'progress' }
  | { kind: 'newProgram' }
  | { kind: 'program'; programId: string };

function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <Card className="mt-4 text-center flex flex-col items-center gap-3 py-8">
      <h2 className="text-lg font-semibold m-0">Not found</h2>
      <p className="text-sm text-muted-foreground">
        That program or exercise no longer exists. It may have been deleted.
      </p>
      <Button onClick={onHome}>Back to home</Button>
    </Card>
  );
}

// Map our internal view type onto the three nav-menu destinations so the
// header can highlight the active one. Sub-screens (program detail, new
// program) bucket under 'programs' since they're not menu destinations.
function navFor(view: View): NavView {
  switch (view.kind) {
    case 'programs':
    case 'newProgram':
    case 'program':
      return 'programs';
    case 'progress':
      return 'progress';
    default:
      return 'home';
  }
}

// Minimum time the splash stays visible on first app open. Long enough for
// the branding pulse to register, short enough to not feel sluggish.
const MIN_SPLASH_MS = 1500;

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [restDays, setRestDays] = useState<RestDay[]>([]);
  const [view, setView] = useState<View>({ kind: 'home' });
  // Each flag flips true the first time its Firestore snapshot is delivered,
  // so we can wait until real data is in-hand before rendering the app and
  // avoid the "no programs" flash on cold start.
  const [loaded, setLoaded] = useState({
    programs: false,
    instances: false,
    library: false,
    restDays: false,
  });
  const [splashElapsed, setSplashElapsed] = useState(false);

  // Subscribe to Firebase auth state. Fires once on mount with the current
  // session (or null), then again on every sign-in/sign-out.
  useEffect(() => {
    return auth.subscribeAuth((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSplashElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // While signed in, keep state synced with Firestore via onSnapshot. All
  // listeners auto-fire on remote changes too — so logging on phone updates
  // laptop and vice-versa.
  useEffect(() => {
    if (!user) {
      setPrograms([]);
      setInstances([]);
      setLibrary([]);
      setRestDays([]);
      setLoaded({
        programs: false,
        instances: false,
        library: false,
        restDays: false,
      });
      setView({ kind: 'home' });
      return;
    }
    // Idempotent backfill of the exercise library from any pre-library
    // programs. Runs in the background; the subscriber below will pick up
    // the writes on the next snapshot.
    store.backfillExerciseLibrary(user.sub).catch((err) => {
      console.error('Library backfill failed:', err);
    });
    const unsubP = store.subscribePrograms(user.sub, (next) => {
      setPrograms(next);
      setLoaded((s) => (s.programs ? s : { ...s, programs: true }));
    });
    const unsubI = store.subscribeInstances(user.sub, (next) => {
      setInstances(next);
      setLoaded((s) => (s.instances ? s : { ...s, instances: true }));
    });
    const unsubL = store.subscribeExerciseLibrary(user.sub, (next) => {
      setLibrary(next);
      setLoaded((s) => (s.library ? s : { ...s, library: true }));
    });
    const unsubR = store.subscribeRestDays(user.sub, (next) => {
      setRestDays(next);
      setLoaded((s) => (s.restDays ? s : { ...s, restDays: true }));
    });
    return () => {
      unsubP();
      unsubI();
      unsubL();
      unsubR();
    };
  }, [user]);

  const signOut = async () => {
    await auth.signOut();
  };

  const createProgram = async (fields: Omit<Program, 'id' | 'createdAt'>) => {
    if (!user) return;
    const program = await store.createProgram(user.sub, fields);
    setView({ kind: 'program', programId: program.id });
  };

  const updateProgram = async (program: Program) => {
    if (!user) return;
    await store.updateProgram(user.sub, program);
  };

  const deleteProgram = async (programId: string) => {
    if (!user) return;
    await store.deleteProgram(user.sub, programId);
    setView({ kind: 'programs' });
  };

  const addInstance = async (fields: Omit<Instance, 'id' | 'loggedAt'>) => {
    if (!user) return;
    await store.addInstance(user.sub, fields);
  };

  const updateInstance = async (instance: Instance) => {
    if (!user) return;
    await store.updateInstance(user.sub, instance);
  };

  const deleteInstance = async (id: string) => {
    if (!user) return;
    await store.deleteInstance(user.sub, id);
  };

  const saveRestDay = async (restDay: RestDay) => {
    if (!user) return;
    await store.saveRestDay(user.sub, restDay);
  };

  const deleteRestDay = async (date: string) => {
    if (!user) return;
    await store.deleteRestDay(user.sub, date);
  };

  // Show the splash until: auth resolves, the minimum splash window passes,
  // and — if signed in — all four Firestore subscriptions have delivered
  // their first snapshot. Skip the data wait on the Login screen so signed-
  // out users aren't held hostage by the timer past the splash window.
  const dataReady =
    !user ||
    (loaded.programs && loaded.instances && loaded.library && loaded.restDays);
  if (!authReady || !splashElapsed || !dataReady) {
    return <SplashScreen />;
  }
  if (!user) return <Login />;

  const goHome = () => setView({ kind: 'home' });
  const today = new Date();

  const navigate = (nav: NavView) => {
    if (nav === 'home') setView({ kind: 'home' });
    else if (nav === 'programs') setView({ kind: 'programs' });
    else setView({ kind: 'progress' });
  };

  let body: React.ReactNode;
  if (view.kind === 'home') {
    body = (
      <Home
        programs={programs}
        instances={instances}
        library={library}
        restDays={restDays}
        today={today}
        userName={user.name}
        onNew={() => setView({ kind: 'newProgram' })}
        onSeeProgress={() => setView({ kind: 'progress' })}
        onManagePrograms={() => setView({ kind: 'programs' })}
        onLogInstance={addInstance}
        onUpdateInstance={updateInstance}
        onDeleteInstance={deleteInstance}
        onSaveRestDay={saveRestDay}
        onDeleteRestDay={deleteRestDay}
      />
    );
  } else if (view.kind === 'programs') {
    body = (
      <ProgramsScreen
        userId={user.sub}
        programs={programs}
        onBack={goHome}
        onOpen={(programId) => setView({ kind: 'program', programId })}
        onNew={() => setView({ kind: 'newProgram' })}
      />
    );
  } else if (view.kind === 'progress') {
    body = (
      <ProgressScreen
        programs={programs}
        instances={instances}
        library={library}
        restDays={restDays}
        today={today}
        onBack={goHome}
        onDeleteInstance={deleteInstance}
      />
    );
  } else if (view.kind === 'newProgram') {
    body = (
      <NewProgram
        onCreate={createProgram}
        onCancel={() => setView({ kind: 'programs' })}
      />
    );
  } else if (view.kind === 'program') {
    const program = programs.find((p) => p.id === view.programId);
    if (!program) {
      body = <NotFound onHome={goHome} />;
    } else {
      const programInstances = instances.filter((i) => i.programId === program.id);
      body = (
        <ProgramDetail
          userId={user.sub}
          program={program}
          instances={programInstances}
          onBack={() => setView({ kind: 'programs' })}
          onUpdate={updateProgram}
          onDelete={() => deleteProgram(program.id)}
          onUpdateInstance={updateInstance}
          onDeleteInstance={deleteInstance}
        />
      );
    }
  }

  return (
    <main>
      <AppHeader
        user={user}
        current={navFor(view)}
        onNavigate={navigate}
        onSignOut={signOut}
      />
      {body}
    </main>
  );
}
