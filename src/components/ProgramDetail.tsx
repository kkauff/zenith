import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Exercise,
  ExerciseTag,
  Instance,
  Program,
  Reschedule,
} from '../types';
import { TAG_LABEL, visibleTagsForCategory } from '../types';
import {
  formatDuration,
  formatPlannedSets,
  formatSchedule,
  getCategory,
  summarizeSets,
} from '../templates';
import * as store from '../storage';
import { effectiveExerciseTags } from '../instance';
import { useSettings } from '../settings';
import { dateKey, exercisesForDay, isSameDay } from '../today';
import { ConfirmDialog } from './ConfirmDialog';
import { ExerciseForm } from './ExerciseForm';
import { SetEditor } from './SetEditor';
import { Button } from './ui/button';
import { Card, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

type Props = {
  userId: string;
  program: Program;
  instances: Instance[];
  reschedules: Reschedule[];
  onBack: () => void;
  onUpdate: (program: Program) => void;
  onDelete: () => void;
  onUpdateInstance: (instance: Instance) => void;
  onDeleteInstance: (id: string) => void;
};

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'program';
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Indexed by JS getDay() (0 = Sunday). WEEK_DAY_ORDER walks them
// Mon → Sun to match the rest of the app's week ordering.
const DAY_LABELS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEK_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function DayRing({
  done,
  total,
  size = 40,
}: {
  done: number;
  total: number;
  size?: number;
}) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const offset = circ - pct * circ;
  const center = size / 2;
  const isComplete = total > 0 && done >= total;
  return (
    <svg
      width={size}
      height={size}
      aria-hidden
      className="flex-shrink-0"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="hsl(var(--surface-2))"
        strokeWidth={stroke}
        fill="none"
      />
      {total > 0 && (
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill={
          total === 0
            ? 'hsl(var(--muted-foreground))'
            : isComplete
              ? 'hsl(var(--primary))'
              : 'hsl(var(--foreground))'
        }
        fontSize="10"
        fontWeight="700"
      >
        {total === 0 ? '—' : `${done}/${total}`}
      </text>
    </svg>
  );
}

function WeekHeatmap({
  counts,
  expanded,
  onSelect,
}: {
  counts: number[];
  expanded: Set<number>;
  onSelect: (dow: number) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEK_DAY_ORDER.map((dow) => {
        const count = counts[dow] ?? 0;
        const isExpanded = expanded.has(dow);
        const isEmpty = count === 0;
        const stateClass = isEmpty
          ? 'bg-surface2/60 text-muted-foreground/60 border-transparent cursor-default'
          : isExpanded
            ? 'bg-primary/25 text-primary border-primary shadow-glow-primary'
            : 'bg-primary/5 text-primary border-primary/60 shadow-glow-primary-sm hover:bg-primary/15 hover:shadow-glow-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
        return (
          <button
            key={dow}
            type="button"
            onClick={() => (isEmpty ? undefined : onSelect(dow))}
            disabled={isEmpty}
            aria-pressed={isExpanded}
            aria-label={`${DAY_LABELS_LONG[dow]} — ${count} exercise${count === 1 ? '' : 's'}${isExpanded ? ' (expanded)' : ''}`}
            className={cn(
              'flex aspect-square flex-col items-center justify-center rounded-md border text-center transition-all',
              stateClass,
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
              {DAY_LABELS_SHORT[dow]}
            </span>
            <span className="text-base font-bold tabular-nums leading-none mt-0.5">
              {count > 0 ? count : '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// An exercise scheduled M/W/F appears under all three byDay groups —
// edit/remove still operate on the single canonical record.
type ExerciseGroups = {
  byDay: { dow: number; exercises: Exercise[] }[];
  weekly: Exercise[];
  monthly: Exercise[];
  unscheduled: Exercise[];
};

function groupExercises(exercises: Exercise[]): ExerciseGroups {
  const byDayMap = new Map<number, Exercise[]>();
  const weekly: Exercise[] = [];
  const monthly: Exercise[] = [];
  const unscheduled: Exercise[] = [];
  for (const ex of exercises) {
    if (ex.schedule.kind === 'weekly-days') {
      if (ex.schedule.days.length === 0) {
        unscheduled.push(ex);
        continue;
      }
      for (const dow of ex.schedule.days) {
        const list = byDayMap.get(dow) ?? [];
        list.push(ex);
        byDayMap.set(dow, list);
      }
    } else if (ex.schedule.kind === 'frequency') {
      if (ex.schedule.period === 'week') weekly.push(ex);
      else monthly.push(ex);
    }
  }
  const byDay: { dow: number; exercises: Exercise[] }[] = [];
  for (const dow of WEEK_DAY_ORDER) {
    const list = byDayMap.get(dow);
    if (list && list.length > 0) byDay.push({ dow, exercises: list });
  }
  return { byDay, weekly, monthly, unscheduled };
}

export function ProgramDetail({
  userId,
  program,
  instances,
  reschedules,
  onBack,
  onUpdate,
  onDelete,
  onUpdateInstance,
  onDeleteInstance,
}: Props) {
  const { weightUnit } = useSettings();
  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingActiveToggle, setConfirmingActiveToggle] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!actionsOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      ) {
        setActionsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActionsOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [actionsOpen]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await store.exportProgram(userId, program.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenith-${safeFilename(program.name)}-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(false);
    }
  };

  const category = getCategory(program.categoryKey);
  const CategoryIcon = category?.Icon;

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(program.name);
  const [addingExercise, setAddingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  // Default-expanded: most recent day only, so the page is informative on
  // landing without sprawling.
  const [expandedSessionDays, setExpandedSessionDays] = useState<Set<string>>(
    () => {
      if (instances.length === 0) return new Set();
      return new Set([dateKey(new Date(instances[0].loggedAt))]);
    },
  );
  const toggleSessionDay = (key: string) => {
    setExpandedSessionDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Section headers and heatmap cells share `expandedDows`. The chevron
  // toggles a single dow (multi-expand); the heatmap acts radio-style and
  // replaces the selection. Either way, the heatmap reflects every
  // expanded dow.
  const [expandedDows, setExpandedDows] = useState<Set<number>>(new Set());
  const toggleDow = (dow: number) => {
    setExpandedDows((prev) => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow);
      else next.add(dow);
      return next;
    });
  };
  const selectDow = (dow: number) => {
    setExpandedDows((prev) => {
      if (prev.has(dow) && prev.size === 1) return new Set();
      return new Set([dow]);
    });
  };

  const lastByExercise = new Map<string, Instance>();
  for (const inst of instances) {
    if (!lastByExercise.has(inst.exerciseId)) {
      lastByExercise.set(inst.exerciseId, inst);
    }
  }

  const saveName = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onUpdate({ ...program, name: trimmed });
    setEditingName(false);
  };

  const cancelRename = () => {
    setDraftName(program.name);
    setEditingName(false);
  };

  const addExercise = (ex: Exercise) => {
    onUpdate({ ...program, exercises: [...program.exercises, ex] });
    setAddingExercise(false);
  };

  const updateExercise = (ex: Exercise) => {
    onUpdate({
      ...program,
      exercises: program.exercises.map((e) => (e.id === ex.id ? ex : e)),
    });
    setEditingExerciseId(null);
  };

  const removeExercise = (id: string) => {
    if (!confirm('Remove this exercise from the program?')) return;
    onUpdate({
      ...program,
      exercises: program.exercises.filter((e) => e.id !== id),
    });
  };

  return (
    <div className="space-y-3 mt-3">
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden /> Back
        </Button>
        {editingName ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') cancelRename();
            }}
            aria-label="Program name"
          />
        ) : (
          <h1 className="flex-1 truncate text-xl font-bold tracking-tight m-0">
            {program.name}
          </h1>
        )}
        {editingName ? (
          <>
            <Button size="sm" onClick={saveName}>
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelRename}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="iconSm"
              onClick={handleExport}
              disabled={exporting}
              aria-label="Export program"
            >
              <Download aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="iconSm"
              onClick={() => {
                setDraftName(program.name);
                setEditingName(true);
              }}
              aria-label="Rename program"
            >
              <Pencil aria-hidden />
            </Button>
            <div ref={actionsRef} className="relative">
              <Button
                variant="secondary"
                size="iconSm"
                aria-haspopup="menu"
                aria-expanded={actionsOpen}
                aria-label="Program actions"
                onClick={() => setActionsOpen((v) => !v)}
              >
                <Settings aria-hidden />
              </Button>
              {actionsOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 z-20 w-56 overflow-hidden rounded-lg border border-border/60 bg-card shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsOpen(false);
                      setConfirmingActiveToggle(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface2/60 focus-visible:outline-none focus-visible:bg-surface2/60"
                  >
                    {program.active ? (
                      <PowerOff
                        aria-hidden
                        className="size-4 text-muted-foreground"
                      />
                    ) : (
                      <Power
                        aria-hidden
                        className="size-4 text-primary"
                      />
                    )}
                    {program.active ? 'Deactivate program' : 'Activate program'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsOpen(false);
                      setConfirmingDelete(true);
                    }}
                    className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:bg-destructive/10"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Delete program
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </header>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="m-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {CategoryIcon && <CategoryIcon aria-hidden className="size-4" />}
            {category?.name ?? program.categoryKey}
          </p>
          {program.purpose && (
            <p className="m-0 text-xs text-rehab text-glow-rehab">
              {program.purpose}
            </p>
          )}
        </div>
        <span
          aria-label={program.active ? 'Active program' : 'Inactive program'}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
            program.active
              ? 'border-primary/60 bg-primary/10 text-primary shadow-glow-primary-sm'
              : 'border-border bg-surface2 text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              program.active ? 'bg-primary' : 'bg-muted-foreground/60',
            )}
          />
          {program.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <Card>
        <CardTitle className="mb-5">Exercises</CardTitle>

        {program.exercises.length === 0 && !addingExercise && (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            No exercises yet. Tap “Add exercise” below to start.
          </p>
        )}

        {editingExerciseId !== null &&
          (() => {
            const ex = program.exercises.find((e) => e.id === editingExerciseId);
            if (!ex) return null;
            return (
              <div className="rounded-lg bg-surface2 p-3.5">
                <ExerciseForm
                  categoryKey={program.categoryKey}
                  initial={ex}
                  onSave={updateExercise}
                  onCancel={() => setEditingExerciseId(null)}
                />
              </div>
            );
          })()}

        {program.exercises.length > 0 &&
          (() => {
            const groups = groupExercises(program.exercises);
            const editing = (e: Exercise) => e.id === editingExerciseId;
            // Start from EFFECTIVE tags so toggling an inferred tag off
            // stores a deliberate override rather than re-inferring next
            // render.
            const toggleExerciseTag = (ex: Exercise, t: ExerciseTag) => {
              const current = new Set(effectiveExerciseTags(ex));
              if (current.has(t)) current.delete(t);
              else current.add(t);
              const nextTags = Array.from(current);
              onUpdate({
                ...program,
                exercises: program.exercises.map((e) =>
                  e.id === ex.id
                    ? { ...e, tags: nextTags.length > 0 ? nextTags : undefined }
                    : e,
                ),
              });
            };

            const renderRow = (ex: Exercise) => {
              const last = lastByExercise.get(ex.id);
              const goal = (() => {
                if (
                  ex.trackingType === 'time' &&
                  ex.goalDurationSeconds !== undefined
                ) {
                  return ` · goal ${formatDuration(ex.goalDurationSeconds)}`;
                }
                if (
                  ex.trackingType === 'weight' &&
                  ex.goalWeight !== undefined
                ) {
                  return ` · goal ${ex.goalWeight} ${weightUnit}`;
                }
                return '';
              })();
              const middleLine = formatPlannedSets(
                ex.plannedSets,
                ex.trackingType,
                weightUnit,
              );
              const exTags = new Set(effectiveExerciseTags(ex));
              return (
                <li
                  key={ex.id}
                  className="flex items-start gap-2 rounded-lg bg-surface2 p-3.5"
                >
                  <div className="flex-1 min-w-0">
                    <div>
                      <strong className="font-semibold">{ex.name}</strong>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatSchedule(ex.schedule)} · {middleLine}
                      {goal}
                    </div>
                    {visibleTagsForCategory(program.categoryKey).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {visibleTagsForCategory(program.categoryKey).map((t) => {
                          const active = exTags.has(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggleExerciseTag(ex, t)}
                              className={cn(
                                'inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                                active
                                  ? 'border-accent/60 bg-accent/15 text-accent'
                                  : 'border-border bg-surface2 text-muted-foreground/70 hover:text-foreground hover:border-accent/40',
                              )}
                            >
                              {TAG_LABEL[t]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {last && (
                      <div className="mt-1 text-xs text-primary text-glow-primary">
                        Last: {summarizeSets(last)} ·{' '}
                        {new Date(last.loggedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      variant="secondary"
                      size="iconSm"
                      onClick={() => setEditingExerciseId(ex.id)}
                      aria-label={`Edit ${ex.name}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => removeExercise(ex.id)}
                      aria-label={`Remove ${ex.name}`}
                    >
                      <X aria-hidden />
                    </Button>
                  </div>
                </li>
              );
            };

            const renderSection = (title: string, items: Exercise[]) => {
              const visible = items.filter((e) => !editing(e));
              if (visible.length === 0) return null;
              return (
                <section key={title} className="space-y-2">
                  <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                  </h3>
                  <ul className="flex flex-col gap-2 list-none m-0 p-0">
                    {visible.map(renderRow)}
                  </ul>
                </section>
              );
            };

            const renderDaySection = (
              dow: number,
              items: Exercise[],
            ) => {
              const visible = items.filter((e) => !editing(e));
              if (visible.length === 0) return null;
              const isExpanded = expandedDows.has(dow);
              const Chevron = isExpanded ? ChevronDown : ChevronRight;
              return (
                <section key={dow} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleDow(dow)}
                    aria-expanded={isExpanded}
                    className={cn(
                      'flex w-full items-center gap-2 text-left transition-colors focus-visible:outline-none focus-visible:text-primary',
                      isExpanded ? 'text-primary' : 'hover:text-primary',
                    )}
                  >
                    <h3
                      className={cn(
                        'm-0 flex-1 text-xs font-semibold uppercase tracking-wider',
                        isExpanded
                          ? 'text-primary text-glow-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {DAY_LABELS_LONG[dow]}
                      <span
                        className={cn(
                          'ml-1.5 normal-case tracking-normal',
                          isExpanded
                            ? 'text-primary/80'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        ({visible.length})
                      </span>
                    </h3>
                    <Chevron
                      aria-hidden
                      className={cn(
                        'size-4',
                        isExpanded ? 'text-primary' : 'text-muted-foreground',
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <ul className="flex flex-col gap-2 list-none m-0 p-0">
                      {visible.map(renderRow)}
                    </ul>
                  )}
                </section>
              );
            };

            // Counts span the FULL exercise list (not the editing-filtered
            // view) so a cell doesn't dim while you edit its only entry.
            const countsByDow = new Array<number>(7).fill(0);
            for (const ex of program.exercises) {
              if (ex.schedule.kind === 'weekly-days') {
                for (const dow of ex.schedule.days) {
                  countsByDow[dow] = (countsByDow[dow] ?? 0) + 1;
                }
              }
            }

            return (
              <div className="space-y-4">
                {groups.byDay.length > 0 && (
                  <WeekHeatmap
                    counts={countsByDow}
                    expanded={expandedDows}
                    onSelect={selectDow}
                  />
                )}
                {groups.byDay.map(({ dow, exercises }) =>
                  renderDaySection(dow, exercises),
                )}
                {renderSection('Each week', groups.weekly)}
                {renderSection('Each month', groups.monthly)}
                {renderSection('Unscheduled', groups.unscheduled)}
              </div>
            );
          })()}

        {addingExercise && (
          <div className="mt-3 rounded-lg bg-surface2 p-3.5">
            <ExerciseForm
              categoryKey={program.categoryKey}
              onSave={addExercise}
              onCancel={() => setAddingExercise(false)}
            />
          </div>
        )}

        {!addingExercise && editingExerciseId === null && (
          <Button
            onClick={() => setAddingExercise(true)}
            className="mt-3 w-full"
          >
            <Plus aria-hidden /> Add exercise
          </Button>
        )}
      </Card>

      <Card>
        <CardTitle className="mb-5">Recent sessions</CardTitle>
        {instances.length === 0 ? (
          <p className="italic text-sm text-muted-foreground py-2 m-0">
            No sessions logged yet.
          </p>
        ) : (
          (() => {
            const dayMap = new Map<string, { date: Date; items: Instance[] }>();
            for (const inst of instances) {
              const d = new Date(inst.loggedAt);
              const key = dateKey(d);
              if (!dayMap.has(key)) dayMap.set(key, { date: d, items: [] });
              dayMap.get(key)!.items.push(inst);
            }
            const days = Array.from(dayMap.entries())
              .sort(
                ([, a], [, b]) => b.date.getTime() - a.date.getTime(),
              )
              .slice(0, 14);
            const today = new Date();
            return (
              <ul className="flex flex-col gap-2 list-none m-0 p-0">
                {days.map(([key, { date, items }]) => {
                  const isExpanded = expandedSessionDays.has(key);
                  const Chevron = isExpanded ? ChevronDown : ChevronRight;
                  // Schedule comes from this single program regardless of
                  // its active state — the user opened it directly.
                  const scheduled = exercisesForDay(
                    [program],
                    date,
                    reschedules,
                  );
                  const total = scheduled.length;
                  const loggedIds = new Set(items.map((i) => i.exerciseId));
                  const done = scheduled.filter((s) =>
                    loggedIds.has(s.exercise.id),
                  ).length;
                  const dayLabel = isSameDay(date, today)
                    ? 'Today'
                    : date.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      });
                  return (
                    <li key={key} className="rounded-lg bg-surface2">
                      <button
                        type="button"
                        onClick={() => toggleSessionDay(key)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <DayRing done={done} total={total} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{dayLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {total > 0
                              ? `${done} of ${total} scheduled${done > items.length ? '' : items.length > done ? ` · ${items.length} logged` : ''}`
                              : `${items.length} session${items.length === 1 ? '' : 's'} · no scheduled work`}
                          </div>
                        </div>
                        <Chevron
                          aria-hidden
                          className="size-5 text-muted-foreground flex-shrink-0"
                        />
                      </button>
                      {isExpanded && (
                        <ul className="border-t border-border/40 flex flex-col gap-2 list-none m-0 p-3">
                          {items.map((inst) => {
                            const ex = program.exercises.find(
                              (e) => e.id === inst.exerciseId,
                            );
                            if (editingInstanceId === inst.id && ex) {
                              return (
                                <li
                                  key={inst.id}
                                  className="rounded-lg bg-background/40 p-3.5"
                                >
                                  <div className="mb-2 text-xs text-muted-foreground">
                                    Edit session ·{' '}
                                    <strong className="font-semibold text-foreground">
                                      {ex.name}
                                    </strong>
                                  </div>
                                  <SetEditor
                                    exercise={ex}
                                    initial={inst}
                                    saveLabel="Save changes"
                                    onCancel={() => setEditingInstanceId(null)}
                                    onLog={(sets, notes) => {
                                      onUpdateInstance({
                                        ...inst,
                                        exerciseName:
                                          inst.exerciseName ?? ex.name,
                                        trackingType:
                                          inst.trackingType ?? ex.trackingType,
                                        sets,
                                        notes: notes.trim() || undefined,
                                      });
                                      setEditingInstanceId(null);
                                    }}
                                  />
                                </li>
                              );
                            }
                            return (
                              <li
                                key={inst.id}
                                className="flex items-start gap-2 rounded-lg bg-background/40 p-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <div>
                                    <strong className="font-semibold">
                                      {ex?.name ??
                                        inst.exerciseName ??
                                        'Removed exercise'}
                                    </strong>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {summarizeSets(inst)}
                                  </div>
                                  {ex && (() => {
                                    const tags = effectiveExerciseTags(ex);
                                    if (tags.length === 0) return null;
                                    return (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {tags.map((t) => (
                                          <span
                                            key={t}
                                            className="inline-flex items-center rounded border border-accent/30 bg-accent/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-accent"
                                          >
                                            {TAG_LABEL[t]}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                  {inst.notes && (
                                    <div className="text-xs text-muted-foreground italic">
                                      “{inst.notes}”
                                    </div>
                                  )}
                                </div>
                                {ex && (
                                  <Button
                                    variant="secondary"
                                    size="iconSm"
                                    aria-label="Edit session"
                                    onClick={() =>
                                      setEditingInstanceId(inst.id)
                                    }
                                  >
                                    <Pencil aria-hidden />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="iconSm"
                                  aria-label="Delete session"
                                  onClick={() => {
                                    if (confirm('Delete this logged session?')) {
                                      onDeleteInstance(inst.id);
                                    }
                                  }}
                                >
                                  <Trash2 aria-hidden />
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            );
          })()
        )}
      </Card>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete "${program.name}"?`}
        description="This removes the program but keeps every session you've already logged. Progress for those exercises will still show up under My Progress and roll forward into any new program with the same exercise name."
        confirmLabel="Delete program"
        destructive
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ConfirmDialog
        open={confirmingActiveToggle}
        title={
          program.active
            ? `Deactivate "${program.name}"?`
            : `Activate "${program.name}"?`
        }
        description={
          program.active
            ? "It'll move to the inactive list — hidden from today's plan, the weekday heatmap, and your adherence rings. Logged sessions stay in history, and you can reactivate any time."
            : "Its scheduled exercises will appear in today's plan and start counting toward your adherence rings."
        }
        confirmLabel={
          program.active ? 'Deactivate program' : 'Activate program'
        }
        onConfirm={() => {
          onUpdate({ ...program, active: !program.active });
          setConfirmingActiveToggle(false);
        }}
        onCancel={() => setConfirmingActiveToggle(false)}
      />
    </div>
  );
}

