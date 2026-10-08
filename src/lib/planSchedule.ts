// Visão em semanas de um plano: quais treinos caem em cada dia e se já foram feitos.
// Um treino "feito" é uma execução do mesmo treino próxima da data prevista (adiantar/atrasar
// alguns dias continua valendo). Fazer outro treino no lugar NÃO marca o original como feito.

import { Plan, Workout, WorkoutExecution, workoutsOnDate } from "@/lib/planStore";
import { toLocalISO } from "@/lib/agendaStore";

export type SlotState = "done" | "late" | "today" | "upcoming";

export interface WeekSlot {
  workout: Workout;
  state: SlotState;
  execution?: WorkoutExecution;
}

export interface WeekDay {
  dateISO: string;
  day: number;
  slots: WeekSlot[];
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};

const sundayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return addDays(iso, -d.getDay());
};

const dayDiff = (a: string, b: string) =>
  Math.round((new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()) / 86400000);

/** Número da semana dentro do ciclo (1-based) para o domingo informado; null se fora do plano ou sem ciclo. */
export const cycleWeekLabel = (plan: Plan, sundayISO: string): number | null => {
  if (!plan.cycleWeeks) return null;
  const weeks = Math.round(dayDiff(sundayISO, sundayOf(plan.startDate)) / 7);
  if (weeks < 0) return null;
  if (plan.endDate && sundayISO > plan.endDate) return null;
  return (weeks % plan.cycleWeeks) + 1;
};

export const executionDay = (exec: WorkoutExecution) => exec.date.slice(0, 10);

/** Domingos das semanas exibidas: o ciclo atual inteiro (com ciclo) ou esta semana + a próxima (sem ciclo). */
const windowStarts = (plan: Plan, todayISO: string, offsetWeeks: number): string[] => {
  if (plan.cycleWeeks) {
    const planStart = sundayOf(plan.startDate);
    const weeksSince = Math.max(0, Math.floor(dayDiff(sundayOf(todayISO), planStart) / 7));
    const block = Math.floor(weeksSince / plan.cycleWeeks) * plan.cycleWeeks;
    return Array.from({ length: plan.cycleWeeks }, (_, i) => addDays(planStart, (block + i + offsetWeeks) * 7));
  }
  const thisWeek = addDays(sundayOf(todayISO), offsetWeeks * 7);
  return [thisWeek, addDays(thisWeek, 7)];
};

export const buildPlanWeeks = (plan: Plan, executions: WorkoutExecution[], todayISO: string, offsetWeeks = 0): WeekDay[][] => {
  const starts = windowStarts(plan, todayISO, offsetWeeks);
  const weeks = starts.map((start) =>
    Array.from({ length: 7 }, (_, i) => {
      const dateISO = addDays(start, i);
      return { dateISO, day: new Date(`${dateISO}T00:00:00`).getDate(), workouts: workoutsOnDate(plan, dateISO) };
    })
  );

  // Casa cada execução com a ocorrência mais próxima do mesmo treino (uma a uma).
  const limit = plan.cycleWeeks ? Math.floor((plan.cycleWeeks * 7) / 2) : 7;
  const matched = new Map<string, WorkoutExecution>();
  const occurrences = weeks.flat().flatMap((d) => d.workouts.map((w) => ({ workoutId: w.id, dateISO: d.dateISO })));
  const planExecs = executions
    .filter((e) => e.planId === plan.id && e.workoutId)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const exec of planExecs) {
    const execDay = executionDay(exec);
    let best: { key: string; diff: number } | null = null;
    for (const occ of occurrences) {
      if (occ.workoutId !== exec.workoutId) continue;
      const key = `${occ.workoutId}|${occ.dateISO}`;
      if (matched.has(key)) continue;
      const diff = Math.abs(dayDiff(occ.dateISO, execDay));
      if (diff <= limit && (!best || diff < best.diff)) best = { key, diff };
    }
    if (best) matched.set(best.key, exec);
  }

  return weeks.map((week) =>
    week.map((d) => ({
      dateISO: d.dateISO,
      day: d.day,
      slots: d.workouts.map((workout): WeekSlot => {
        const execution = matched.get(`${workout.id}|${d.dateISO}`);
        const state: SlotState = execution ? "done" : d.dateISO < todayISO ? "late" : d.dateISO === todayISO ? "today" : "upcoming";
        return { workout, state, execution };
      }),
    }))
  );
};
