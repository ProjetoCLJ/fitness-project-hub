// Planos de treino, treinos, execuções e restrições do aluno — tudo no Supabase.
// O treino de um plano tem posição no ciclo (semana + dia da semana, repetindo a
// cada N semanas) ou data específica (plano sem ciclo).

import { supabase } from "@/integrations/supabase/client";

export type PlanStatus = "active" | "completed" | "cancelled";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  load: string;
  rest: string;
  supersetGroup?: string;
}

export interface Workout {
  id: string;
  planId: string;
  name: string;
  description: string;
  /** Posição no ciclo (planos com ciclo). */
  weekIndex: number | null;
  weekday: number | null;
  /** Data específica (planos sem ciclo). */
  workoutDate: string | null;
  exercises: Exercise[];
}

export interface Plan {
  id: string;
  studentId: string;
  trainerId: string;
  trainerName: string;
  title: string;
  objective: string;
  description: string;
  startDate: string;
  /** Prazo / data de fim (opcional). */
  endDate: string | null;
  cycleWeeks: number | null;
  status: PlanStatus;
  createdAt: string;
  workouts: Workout[];
}

export interface SetLog {
  setNumber: number;
  weight: string;
  reps: string;
  effort?: number;
}

export interface ExerciseLog {
  exerciseId: string | null;
  plannedName: string;
  performedName: string;
  sets: SetLog[];
  notes?: string;
  isPR?: boolean;
}

export interface WorkoutExecution {
  id: string;
  planId: string | null;
  workoutId: string | null;
  workoutName: string;
  date: string;
  exerciseLogs: ExerciseLog[];
  observations?: string;
}

// ---------- Ciclo ----------

const startOfWeekSunday = (dateISO: string) => {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

/** Em que semana do ciclo (0-based) cai uma data. Null se a data está fora do plano ou o plano não tem ciclo. */
export const cycleWeekIndexFor = (plan: Plan, dateISO: string): number | null => {
  if (!plan.cycleWeeks) return null;
  if (dateISO < plan.startDate) return null;
  if (plan.endDate && dateISO > plan.endDate) return null;
  const weeks = Math.round((startOfWeekSunday(dateISO).getTime() - startOfWeekSunday(plan.startDate).getTime()) / (7 * 24 * 3600 * 1000));
  return weeks % plan.cycleWeeks;
};

/** Treinos que caem em determinada data (respeitando ciclo, datas e status do plano). */
export const workoutsOnDate = (plan: Plan, dateISO: string): Workout[] => {
  if (plan.status !== "active") return [];
  if (!plan.cycleWeeks) return plan.workouts.filter((w) => w.workoutDate === dateISO);
  const week = cycleWeekIndexFor(plan, dateISO);
  if (week === null) return [];
  const weekday = new Date(`${dateISO}T00:00:00`).getDay();
  return plan.workouts.filter((w) => w.weekIndex === week && w.weekday === weekday);
};

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const workoutPositionLabel = (w: Pick<Workout, "weekIndex" | "weekday" | "workoutDate">) => {
  if (w.workoutDate) return new Date(`${w.workoutDate}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  if (w.weekIndex !== null && w.weekday !== null) return `Semana ${w.weekIndex + 1} · ${WEEKDAY_NAMES[w.weekday]}`;
  return "";
};

// ---------- Leitura de planos ----------

type ExerciseRow = {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest: string | null;
  superset_group: string | null;
  order_index: number | null;
};

type WorkoutRow = {
  id: string;
  plan_id: string;
  name: string;
  observations: string | null;
  week_index: number | null;
  weekday: number | null;
  workout_date: string | null;
  order_index: number | null;
  workout_exercises: ExerciseRow[] | null;
};

type PlanRow = {
  id: string;
  student_id: string;
  trainer_id: string;
  title: string;
  objective: string | null;
  description: string | null;
  start_date: string;
  deadline: string | null;
  cycle_weeks: number | null;
  status: PlanStatus | null;
  created_at: string | null;
  trainer_profiles: { profiles: { full_name: string } | null } | null;
  workouts: WorkoutRow[] | null;
};

const mapWorkout = (row: WorkoutRow): Workout => ({
  id: row.id,
  planId: row.plan_id,
  name: row.name,
  description: row.observations ?? "",
  weekIndex: row.week_index,
  weekday: row.weekday,
  workoutDate: row.workout_date,
  exercises: [...(row.workout_exercises ?? [])]
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets ?? 1,
      reps: ex.reps ?? "",
      load: ex.load ?? "",
      rest: ex.rest ?? "",
      supersetGroup: ex.superset_group ?? undefined,
    })),
});

const mapPlan = (row: PlanRow): Plan => ({
  id: row.id,
  studentId: row.student_id,
  trainerId: row.trainer_id,
  trainerName: row.trainer_profiles?.profiles?.full_name ?? "Profissional",
  title: row.title,
  objective: row.objective ?? "",
  description: row.description ?? "",
  startDate: row.start_date,
  endDate: row.deadline,
  cycleWeeks: row.cycle_weeks,
  status: row.status ?? "active",
  createdAt: row.created_at ?? "",
  workouts: [...(row.workouts ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map(mapWorkout),
});

const PLAN_SELECT = "*, trainer_profiles(profiles(full_name)), workouts(*, workout_exercises(*))";

/** Planos de um aluno. Para o profissional, o banco só devolve os planos criados por ele. */
export const fetchPlansForStudent = async (studentId: string): Promise<Plan[]> => {
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_SELECT)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as PlanRow[]).map(mapPlan);
};

// ---------- Escrita de planos ----------

export interface PlanInput {
  title: string;
  objective: string;
  description: string;
  startDate: string;
  endDate: string | null;
  cycleWeeks: number | null;
}

export const createPlan = async (trainerId: string, studentId: string, input: PlanInput): Promise<string> => {
  const { data, error } = await supabase
    .from("plans")
    .insert({
      trainer_id: trainerId,
      student_id: studentId,
      title: input.title,
      objective: input.objective || null,
      description: input.description || null,
      start_date: input.startDate,
      deadline: input.endDate,
      cycle_weeks: input.cycleWeeks,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
};

export const updatePlan = async (planId: string, patch: Pick<PlanInput, "title" | "objective" | "description" | "endDate">) => {
  const { error } = await supabase
    .from("plans")
    .update({
      title: patch.title,
      objective: patch.objective || null,
      description: patch.description || null,
      deadline: patch.endDate,
    })
    .eq("id", planId);
  if (error) throw error;
};

/** "completed" encerra o plano; "cancelled" é a exclusão (vai para o histórico). */
export const setPlanStatus = async (planId: string, status: PlanStatus) => {
  const { error } = await supabase
    .from("plans")
    .update({ status, end_date: status === "active" ? null : new Date().toISOString().slice(0, 10) })
    .eq("id", planId);
  if (error) throw error;
};

export interface WorkoutInput {
  id?: string;
  name: string;
  description: string;
  weekIndex: number | null;
  weekday: number | null;
  workoutDate: string | null;
  exercises: Exercise[];
}

export const saveWorkout = async (planId: string, input: WorkoutInput): Promise<void> => {
  const row = {
    plan_id: planId,
    name: input.name,
    observations: input.description || null,
    week_index: input.weekIndex,
    weekday: input.weekday,
    workout_date: input.workoutDate,
  };

  let workoutId = input.id;
  if (workoutId) {
    const { error } = await supabase.from("workouts").update(row).eq("id", workoutId);
    if (error) throw error;
    const del = await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
    if (del.error) throw del.error;
  } else {
    const { data, error } = await supabase.from("workouts").insert(row).select("id").single();
    if (error) throw error;
    workoutId = data.id;
  }

  if (input.exercises.length > 0) {
    const { error } = await supabase.from("workout_exercises").insert(
      input.exercises.map((ex, index) => ({
        workout_id: workoutId as string,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        load: ex.load,
        rest: ex.rest,
        superset_group: ex.supersetGroup ?? null,
        order_index: index,
      }))
    );
    if (error) throw error;
  }
};

export const deleteWorkout = async (workoutId: string) => {
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw error;
};

// ---------- Execuções ----------

type ExecutionRow = {
  id: string;
  plan_id: string | null;
  workout_id: string | null;
  workout_name: string | null;
  date: string;
  observations: string | null;
  workouts: { name: string } | null;
  exercise_logs:
    | {
        id: string;
        workout_exercise_id: string | null;
        planned_name: string;
        performed_name: string;
        notes: string | null;
        is_pr: boolean | null;
        set_logs: { set_number: number; weight: string | null; reps: string | null; effort: number | null }[] | null;
      }[]
    | null;
};

export const fetchExecutions = async (studentId: string): Promise<WorkoutExecution[]> => {
  const { data, error } = await supabase
    .from("workout_executions")
    .select("*, workouts(name), exercise_logs(*, set_logs(*))")
    .eq("student_id", studentId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ExecutionRow[]).map((row) => ({
    id: row.id,
    planId: row.plan_id,
    workoutId: row.workout_id,
    workoutName: row.workout_name ?? row.workouts?.name ?? "Treino",
    date: `${row.date}T12:00:00`,
    observations: row.observations ?? undefined,
    exerciseLogs: (row.exercise_logs ?? []).map((log) => ({
      exerciseId: log.workout_exercise_id,
      plannedName: log.planned_name,
      performedName: log.performed_name,
      notes: log.notes ?? undefined,
      isPR: log.is_pr ?? false,
      sets: [...(log.set_logs ?? [])]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ setNumber: s.set_number, weight: s.weight ?? "", reps: s.reps ?? "", effort: s.effort ?? undefined })),
    })),
  }));
};

export const recordExecution = async (
  studentId: string,
  execution: { planId: string; workoutId: string; workoutName: string; observations?: string; exerciseLogs: ExerciseLog[] }
): Promise<void> => {
  const { data, error } = await supabase
    .from("workout_executions")
    .insert({
      student_id: studentId,
      plan_id: execution.planId,
      workout_id: execution.workoutId,
      workout_name: execution.workoutName,
      date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
      observations: execution.observations ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  for (const log of execution.exerciseLogs) {
    const logRes = await supabase
      .from("exercise_logs")
      .insert({
        execution_id: data.id,
        workout_exercise_id: log.exerciseId,
        planned_name: log.plannedName,
        performed_name: log.performedName,
        notes: log.notes ?? null,
        is_pr: log.isPR ?? false,
      })
      .select("id")
      .single();
    if (logRes.error) throw logRes.error;

    if (log.sets.length > 0) {
      const setsRes = await supabase.from("set_logs").insert(
        log.sets.map((s) => ({
          exercise_log_id: logRes.data.id,
          set_number: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          effort: s.effort ?? null,
        }))
      );
      if (setsRes.error) throw setsRes.error;
    }
  }
};

// ---------- Restrições do aluno ----------

export interface Restriction {
  id: string;
  description: string;
  trainerId: string;
  trainerName: string;
  createdAt: string;
}

export const fetchRestrictions = async (studentId: string): Promise<Restriction[]> => {
  const { data, error } = await supabase
    .from("student_restrictions")
    .select("id, description, trainer_id, created_at, trainer_profiles(profiles(full_name))")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as {
    id: string;
    description: string;
    trainer_id: string;
    created_at: string | null;
    trainer_profiles: { profiles: { full_name: string } | null } | null;
  }[]).map((row) => ({
    id: row.id,
    description: row.description,
    trainerId: row.trainer_id,
    trainerName: row.trainer_profiles?.profiles?.full_name ?? "Profissional",
    createdAt: row.created_at ?? "",
  }));
};

export const addRestriction = async (trainerId: string, studentId: string, description: string) => {
  const { error } = await supabase.from("student_restrictions").insert({ trainer_id: trainerId, student_id: studentId, description });
  if (error) throw error;
};

export const deleteRestriction = async (id: string) => {
  const { error } = await supabase.from("student_restrictions").delete().eq("id", id);
  if (error) throw error;
};
