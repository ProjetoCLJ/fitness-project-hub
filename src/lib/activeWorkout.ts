import { useSyncExternalStore } from "react";

// Treino em andamento (ou pausado) neste aparelho. Fica salvo para sobreviver a recarregar a página
// e para permitir navegar pela plataforma enquanto o treino está pausado.

const KEY = "active-workout";
const MAX_AGE_MS = 24 * 3600 * 1000;

export interface ActiveWorkout {
  workoutId: string;
  workoutName: string;
  /** Rota da tela do treino (aluno ou professor), usada para voltar a ele quando pausado. */
  path: string;
  /** Início (ms). O tempo pausado é descontado em pausedMs. */
  startedAt: number;
  /** Quando está pausado, o momento em que pausou; senão null. */
  pausedAt: number | null;
  pausedMs: number;
  /** Rascunho do que foi preenchido (exercícios marcados, cargas, reps). */
  drafts?: unknown;
}

const read = (): ActiveWorkout | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkout;
    if (!parsed.workoutId || Date.now() - parsed.startedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

let current: ActiveWorkout | null = read();
const listeners = new Set<() => void>();

const commit = (next: ActiveWorkout | null) => {
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* sem storage */
  }
  listeners.forEach((l) => l());
};

export const getActiveWorkout = () => current;

export const useActiveWorkout = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );

export const startActiveWorkout = (workoutId: string, workoutName: string, path: string) =>
  commit({ workoutId, workoutName, path, startedAt: Date.now(), pausedAt: null, pausedMs: 0 });

export const pauseActiveWorkout = () => {
  if (current && current.pausedAt === null) commit({ ...current, pausedAt: Date.now() });
};

export const resumeActiveWorkout = () => {
  if (current && current.pausedAt !== null) commit({ ...current, pausedMs: current.pausedMs + (Date.now() - current.pausedAt), pausedAt: null });
};

export const saveActiveDrafts = (drafts: unknown) => {
  if (current) commit({ ...current, drafts });
};

export const clearActiveWorkout = () => commit(null);

/** Tempo de treino decorrido, sem contar o tempo pausado. */
export const activeElapsedMs = (a: ActiveWorkout, now: number) => Math.max(0, (a.pausedAt ?? now) - a.startedAt - a.pausedMs);
