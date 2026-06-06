import { useEffect, useState } from 'react';
import { AppHeader, type NavView } from './components/AppHeader';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { NewProgram } from './components/NewProgram';
import { ProgramDetail } from './components/ProgramDetail';
import { ProgramsScreen } from './components/ProgramsScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { SplashScreen } from './components/SplashScreen';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import * as auth from './auth';
import * as store from './storage';
import type { AuthUser } from './auth';
import type {
  Instance,
  LibraryExercise,
  Program,
  Reschedule,
  RestDay,
  UserSettings,
} from './types';
import { DEFAULT_SETTINGS } from './types';
import { SettingsProvider } from './settings';

type View =
  | { kind: 'home' }
  | { kind: 'programs' }
  | { kind: 'progress' }
  | { kind: 'newProgram' }
  | { kind: 'program'; programId: string }
  | { kind: 'settings' };

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

// Sub-screens bucket under their parent nav destination so the header
// highlight tracks correctly.
function navFor(view: View): NavView {
  switch (view.kind) {
    case 'programs':
    case 'newProgram':
    case 'program':
      return 'programs';
    case 'progress':
      return 'progress';
    case 'settings':
    default:
      return 'home';
  }
}

const MIN_SPLASH_MS = 1500;

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [library, setLibrary] = useState<LibraryExercise[]>([]);
  const [restDays, setRestDays] = useState<RestDay[]>([]);
  const [reschedules, setReschedules] = useState<Reschedule[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<View>({ kind: 'home' });
  // Each flag flips true on its first snapshot so we can hold the splash
  // until real data is in-hand and avoid the "no programs" flash on cold
  // start.
  const [loaded, setLoaded] = useState({
    programs: false,
    instances: false,
    library: false,
    restDays: false,
    reschedules: false,
    settings: false,
  });
  const [splashElapsed, setSplashElapsed] = useState(false);

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

  useEffect(() => {
    if (!user) {
      setPrograms([]);
      setInstances([]);
      setLibrary([]);
      setRestDays([]);
      setReschedules([]);
      setSettings(DEFAULT_SETTINGS);
      setLoaded({
        programs: false,
        instances: false,
        library: false,
        restDays: false,
        reschedules: false,
        settings: false,
      });
      setView({ kind: 'home' });
      return;
    }
    // Idempotent; the library subscriber below picks up the writes.
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
    const unsubSched = store.subscribeReschedules(user.sub, (next) => {
      setReschedules(next);
      setLoaded((s) => (s.reschedules ? s : { ...s, reschedules: true }));
    });
    const unsubSet = store.subscribeSettings(user.sub, (next) => {
      setSettings(next);
      setLoaded((s) => (s.settings ? s : { ...s, settings: true }));
    });
    return () => {
      unsubP();
      unsubI();
      unsubL();
      unsubR();
      unsubSched();
      unsubSet();
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

  const saveReschedule = async (reschedule: Reschedule) => {
    if (!user) return;
    await store.saveReschedule(user.sub, reschedule);
  };

  const deleteReschedule = async (fromDate: string) => {
    if (!user) return;
    await store.deleteReschedule(user.sub, fromDate);
  };

  const saveSettings = async (next: UserSettings) => {
    if (!user) return;
    await store.saveSettings(user.sub, next);
  };

  // Signed-out users skip the data wait so they don't get held on the
  // splash past the timer.
  const dataReady =
    !user ||
    (loaded.programs &&
      loaded.instances &&
      loaded.library &&
      loaded.restDays &&
      loaded.reschedules &&
      loaded.settings);
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
        restDays={restDays}
        reschedules={reschedules}
        today={today}
        userName={user.name}
        onNew={() => setView({ kind: 'newProgram' })}
        onSeeProgress={() => setView({ kind: 'progress' })}
        onManagePrograms={() => setView({ kind: 'programs' })}
        onOpenProgram={(programId) => setView({ kind: 'program', programId })}
        onLogInstance={addInstance}
        onUpdateInstance={updateInstance}
        onDeleteInstance={deleteInstance}
        onUpdateProgram={updateProgram}
        onSaveRestDay={saveRestDay}
        onDeleteRestDay={deleteRestDay}
        onSaveReschedule={saveReschedule}
        onDeleteReschedule={deleteReschedule}
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
        reschedules={reschedules}
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
  } else if (view.kind === 'settings') {
    body = (
      <SettingsScreen
        settings={settings}
        onSave={saveSettings}
        onBack={goHome}
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
          reschedules={reschedules}
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
    <SettingsProvider value={settings}>
      <main>
        <AppHeader
          user={user}
          current={navFor(view)}
          onNavigate={navigate}
          onSignOut={signOut}
          onOpenSettings={() => setView({ kind: 'settings' })}
        />
        {body}
      </main>
    </SettingsProvider>
  );
}
