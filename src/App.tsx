import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { SignedInBar } from './components/SignedInBar';
import { DataMenu } from './components/DataMenu';
import { Home } from './components/Home';
import { NewProgram } from './components/NewProgram';
import { ProgramDetail } from './components/ProgramDetail';
import { LogInstance } from './components/LogInstance';
import { TodayScreen } from './components/TodayScreen';
import * as auth from './auth';
import * as store from './storage';
import type { AuthUser } from './auth';
import type { Instance, Program } from './types';

type View =
  | { kind: 'home' }
  | { kind: 'today' }
  | { kind: 'newProgram' }
  | { kind: 'program'; programId: string }
  | { kind: 'logInstance'; programId: string; exerciseId: string };

function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <section className="card empty-card">
      <h2>Not found</h2>
      <p className="muted">
        That program or exercise no longer exists. It may have been deleted.
      </p>
      <button onClick={onHome}>Back to home</button>
    </section>
  );
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

  // While signed in, keep state synced with Firestore via onSnapshot. Both
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
    setView({ kind: 'home' });
  };

  // Records an instance — does NOT navigate. Today screen and inline logging
  // stay put; screens that should navigate after logging do it themselves.
  const addInstance = async (fields: Omit<Instance, 'id' | 'loggedAt'>) => {
    if (!user) return;
    await store.addInstance(user.sub, fields);
  };

  if (!authReady) return null;
  if (!user) return <Login />;

  const goHome = () => setView({ kind: 'home' });
  const today = new Date();

  let body: React.ReactNode;
  if (view.kind === 'home') {
    body = (
      <Home
        programs={programs}
        instances={instances}
        today={today}
        onOpen={(programId) => setView({ kind: 'program', programId })}
        onNew={() => setView({ kind: 'newProgram' })}
        onOpenToday={() => setView({ kind: 'today' })}
      />
    );
  } else if (view.kind === 'today') {
    body = (
      <TodayScreen
        programs={programs}
        instances={instances}
        today={today}
        onBack={goHome}
        onLog={addInstance}
      />
    );
  } else if (view.kind === 'newProgram') {
    body = <NewProgram onCreate={createProgram} onCancel={goHome} />;
  } else if (view.kind === 'program') {
    const program = programs.find((p) => p.id === view.programId);
    if (!program) {
      body = <NotFound onHome={goHome} />;
    } else {
      const programInstances = instances.filter((i) => i.programId === program.id);
      body = (
        <ProgramDetail
          program={program}
          instances={programInstances}
          onBack={goHome}
          onLog={(exerciseId) =>
            setView({ kind: 'logInstance', programId: program.id, exerciseId })
          }
          onUpdate={updateProgram}
          onDelete={() => deleteProgram(program.id)}
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
      <header className="top">
        <h1>Zenith</h1>
      </header>
      <SignedInBar user={user} onSignOut={signOut} />
      <DataMenu userId={user.sub} />
      {body}
    </main>
  );
}
