import type { Instance, Program } from '../types';
import { getCategory } from '../templates';
import { AdherenceRings } from './AdherenceRings';
import { TodayBox } from './TodayBox';

type Props = {
  programs: Program[];
  instances: Instance[];
  today: Date;
  onOpen: (programId: string) => void;
  onNew: () => void;
  onOpenToday: () => void;
};

export function Home({
  programs,
  instances,
  today,
  onOpen,
  onNew,
  onOpenToday,
}: Props) {
  // First-time empty state — no programs yet, so no schedule and no adherence
  // to compute. Skip the today/adherence cards entirely.
  if (programs.length === 0) {
    return (
      <section className="card empty-card">
        <h2>No programs yet</h2>
        <p className="muted">
          Create a program to start tracking exercises and logging sessions.
        </p>
        <button onClick={onNew}>+ New program</button>
      </section>
    );
  }

  return (
    <>
      <TodayBox
        programs={programs}
        instances={instances}
        today={today}
        onOpen={onOpenToday}
      />

      <AdherenceRings programs={programs} instances={instances} today={today} />

      <section className="card">
        <div className="card-header">
          <h2>Your programs</h2>
          <button onClick={onNew}>+ New</button>
        </div>
        <ul className="list program-list">
          {programs.map((p) => {
            const cat = getCategory(p.categoryKey);
            return (
              <li key={p.id}>
                <button
                  className="row-button"
                  onClick={() => onOpen(p.id)}
                  aria-label={`Open ${p.name}`}
                >
                  <span className="program-icon" aria-hidden>
                    {cat?.icon ?? '📋'}
                  </span>
                  <span className="program-text">
                    <span className="program-name">{p.name}</span>
                    <span className="muted small">
                      {cat?.name ?? p.categoryKey} · {p.exercises.length} exercise
                      {p.exercises.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="chev" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
