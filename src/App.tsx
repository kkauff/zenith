import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { SignedInBar } from './components/SignedInBar';
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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [view, setView] = useState<View>({ kind: 'home' });

  // Restore session on first load.
  useEffect(() => {
    setUser(auth.loadSession());
  }, []);

  // Whenever the signed-in user changes, swap the data we display. Storage is
  // keyed by Google `sub`, so a different account is a different bucket.
  useEffect(() => {
    if (!user) {
      setPrograms([]);
      setInstances([]);
      setView({ kind: 'home' });
      return;
    }
    setPrograms(store.loadPrograms(user.sub));
    setInstances(store.loadInstances(user.sub));
  }, [user]);

  const refresh = () => {
    if (!user) return;
    setPrograms(store.loadPrograms(user.sub));
    setInstances(store.loadInstances(user.sub));
  };

  const signOut = () => {
    auth.clearSession();
    setUser(null);
  };

  const createProgram = (fields: Omit<Program, 'id' | 'createdAt'>) => {
    if (!user) return;
    const program = store.createProgram(user.sub, fields);
    refresh();
    setView({ kind: 'program', programId: program.id });
  };

  const updateProgram = (program: Program) => {
    if (!user) return;
    store.updateProgram(user.sub, program);
    refresh();
  };

  const deleteProgram = (programId: string) => {
    if (!user) return;
    store.deleteProgram(user.sub, programId);
    refresh();
    setView({ kind: 'home' });
  };

  // Records an instance and refreshes state — does NOT navigate. Today screen
  // and inline logging want to stay put. Screens that should navigate after
  // logging do it themselves.
  const addInstance = (fields: Omit<Instance, 'id' | 'loggedAt'>) => {
    if (!user) return;
    store.addInstance(user.sub, fields);
    refresh();
  };

  if (!user) return <Login onSignIn={setUser} />;

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
      {body}
    </main>
  );
}
