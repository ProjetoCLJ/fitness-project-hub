// Treinos concluídos sem internet ficam guardados no aparelho ("registrado offline") e sobem quando a conexão volta.
// O servidor aceita registros de até 24 h; depois disso o treino fica no histórico, mas sem XP.

import { ExecutionResult, ExerciseLog, recordExecution } from "@/lib/planStore";

const KEY = "pending-executions";

export interface PendingPayload {
  planId: string;
  workoutId: string;
  workoutName: string;
  observations?: string;
  exerciseLogs: ExerciseLog[];
  startedAt: string;
  finishedAt: string;
}

interface Pending {
  id: string;
  studentId: string;
  payload: PendingPayload;
}

const read = (): Pending[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Pending[];
  } catch {
    return [];
  }
};

const write = (items: Pending[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* sem storage */
  }
};

/** Erro sem código do Postgres/PostgREST = falha de rede (fetch não chegou ao servidor). */
export const isNetworkError = (error: unknown) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const e = error as { code?: string; message?: string } | null;
  return !e?.code;
};

export const queueExecution = (studentId: string, payload: PendingPayload) => {
  write([...read(), { id: crypto.randomUUID(), studentId, payload }]);
};

export const pendingCount = (studentId: string) => read().filter((p) => p.studentId === studentId).length;

/** Envia o que estiver na fila; devolve quantos treinos subiram. */
export const flushPending = async (studentId: string): Promise<{ synced: number; results: ExecutionResult[] }> => {
  const results: ExecutionResult[] = [];
  let items = read();
  for (const item of items.filter((p) => p.studentId === studentId)) {
    try {
      results.push(await recordExecution(studentId, { ...item.payload, source: "offline" }));
      items = items.filter((p) => p.id !== item.id);
    } catch (error) {
      if (isNetworkError(error)) break; // continua offline: tenta de novo depois
      items = items.filter((p) => p.id !== item.id); // rejeitado pelo servidor: não adianta insistir
    }
  }
  write(items);
  return { synced: results.length, results };
};
