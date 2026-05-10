import { useEffect, useState } from 'react';
import { AppHeader, type NavView } from './components/AppHeader';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { NewProgram } from './components/NewProgram';
import { ProgramDetail } from './components/ProgramDetail';
import { ProgramsScreen } from './components/ProgramsScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { LogInstance } from './components/LogInstance';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import * as auth from './auth';
import * as store from './storage';
import type { AuthUser } from './auth';
import type { Instance, Program } from './types';

type View =
  | { kind: 'home' }
  | { kind: 'programs' }
  | { kind: 'progress' }
  | { kind: 'newProgram' }
  | { kind: 'program'; programId: string }
  | { kind: 'logInstance'; programId: string; exerciseId: string };

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
// header can highlight the active one. Sub-screens (program detail, log,
// new program) bucket under 'programs' since they're not menu destinations.
function navFor(view: View): NavView {
  switch (view.kind) {
    case 'programs':
    case 'newProgram':
    case 'program':
    case 'logInstance':
      return 'programs';
    case 'progress':
      return 'progress';
    default:
      return 'home';
  }
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [view, setView] = useState<View>({ kind: 'home' });

  // Subscribe to Firebase auth state. Fires once on mount with the current
  // session (or null), then again on every sign-in/sign-out.
  useEffect(() => {
    return auth.subscribeAuth((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // While signed in, keep state synced with Firestore via onSnapshot. All
  // listeners auto-fire on remote changes too — so logging on phone updates
  // laptop and vice-versa.
  useEffect(() => {
    if (!user) {
      setPrograms([]);
      setInstances([]);
      setView({ kind: 'home' });
      return;
    }
    const unsubP = store.subscribePrograms(user.sub, setPrograms);
    const unsubI = store.subscribeInstances(user.sub, setInstances);
    return () => {
      unsubP();
      unsubI();
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

  if (!authReady) return null;
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
        today={today}
        userName={user.name}
        onNew={() => setView({ kind: 'newProgram' })}
        onLogInstance={addInstance}
        onUpdateInstance={updateInstance}
        onDeleteInstance={deleteInstance}
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
        today={today}
        onBack={goHome}
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
          onLog={(exerciseId) =>
            setView({ kind: 'logInstance', programId: program.id, exerciseId })
          }
          onUpdate={updateProgram}
          onDelete={() => deleteProgram(program.id)}
          onUpdateInstance={updateInstance}
          onDeleteInstance={deleteInstance}
        />
      );
    }
  } else {
    const program = programs.find((p) => p.id === view.programId);
    const exercise = program?.exercises.find((e) => e.id === view.exerciseId);
    if (!program || !exercise) {
      body = <NotFound onHome={goHome} />;
    } else {
      body = (
        <LogInstance
          program={program}
          exercise={exercise}
          onSave={(fields) => {
            addInstance(fields);
            setView({ kind: 'program', programId: fields.programId });
          }}
          onCancel={() =>
            setView({ kind: 'program', programId: program.id })
          }
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
