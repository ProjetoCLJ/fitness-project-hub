// Planos de treino, treinos, execuções e restrições do aluno — tudo no Supabase.
// O treino de um plano tem posição no ciclo (semana + dia da semana, repetindo a
// cada N semanas) ou data específica (plano sem ciclo).

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { SportCode } from "@/lib/sports";

// Colunas e funções novas (esporte, remoção, pausa, cronômetro) ainda não estão no arquivo de tipos gerado.
const db = supabase as unknown as SupabaseClient;

// Compatibilidade: se o banco ainda não recebeu as migrações 0009/0010 (colunas/funções novas), o app segue no formato antigo.
const missingSchema = (error: { code?: string; message?: string } | null) =>
  !!error && (["42P01", "42703", "42883", "PGRST200", "PGRST202", "PGRST204", "PGRST205"].includes(error.code ?? "") || /schema cache|does not exist/i.test(error.message ?? ""));

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
  /** Treino removido: deixa de valer a partir desta data (próxima segunda). */
  removedAt: string | null;
  /** Treino acompanhado pelo professor (só planos com profissional). */
  accompanied: boolean;
  /** Horário do treino (HH:MM), quando definido. */
  startTime: string | null;
  exercises: Exercise[];
}

export interface PlanPause {
  startsOn: string;
  endsOn: string | null;
}

export interface Plan {
  id: string;
  studentId: string;
  /** Null nos planos criados pelo próprio atleta. */
  trainerId: string | null;
  trainerName: string;
  sport: SportCode;
  /** Plano removido/encerrado: deixa de valer a partir desta data (próxima segunda). */
  removedAt: string | null;
  pauses: PlanPause[];
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
  durationMinutes?: number;
  /** Treino válido para XP/Foco (plano + pelo menos 25 min). */
  isValid?: boolean;
  exerciseLogs: ExerciseLog[];
  observations?: string;
}

// ---------- Ciclo ----------

/** Segunda-feira da semana (as semanas vão de segunda a domingo). */
const startOfWeekMonday = (dateISO: string) => {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

/** Em que semana do ciclo (0-based) cai uma data. Null se a data está fora do plano ou o plano não tem ciclo. */
export const cycleWeekIndexFor = (plan: Plan, dateISO: string): number | null => {
  if (!plan.cycleWeeks) return null;
  if (dateISO < plan.startDate) return null;
  if (plan.endDate && dateISO > plan.endDate) return null;
  const weeks = Math.round((startOfWeekMonday(dateISO).getTime() - startOfWeekMonday(plan.startDate).getTime()) / (7 * 24 * 3600 * 1000));
  return weeks % plan.cycleWeeks;
};

/** Treinos que caem em determinada data (respeitando ciclo, datas e status do plano). */
export const isPausedOn = (plan: Plan, dateISO: string) =>
  plan.pauses.some((p) => dateISO >= p.startsOn && (!p.endsOn || dateISO <= p.endsOn));

export const workoutsOnDate = (plan: Plan, dateISO: string): Workout[] => {
  if (plan.removedAt ? dateISO >= plan.removedAt : plan.status !== "active") return [];
  if (isPausedOn(plan, dateISO)) return [];
  const live = (w: Workout) => !w.removedAt || dateISO < w.removedAt;
  if (!plan.cycleWeeks) return plan.workouts.filter((w) => w.workoutDate === dateISO && live(w));
  const week = cycleWeekIndexFor(plan, dateISO);
  if (week === null) return [];
  const weekday = new Date(`${dateISO}T00:00:00`).getDay();
  return plan.workouts.filter((w) => w.weekIndex === week && w.weekday === weekday && live(w));
};

// Índices seguem Date.getDay() (0 = domingo); a semana é exibida de segunda a domingo (WEEK_COLUMNS).
export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEK_COLUMNS = [1, 2, 3, 4, 5, 6, 0];

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
  removed_at: string | null;
  accompanied: boolean | null;
  start_time: string | null;
  order_index: number | null;
  workout_exercises: ExerciseRow[] | null;
};

type PlanRow = {
  id: string;
  student_id: string;
  trainer_id: string | null;
  sport: SportCode | null;
  removed_at: string | null;
  plan_pauses: { starts_on: string; ends_on: string | null }[] | null;
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
  removedAt: row.removed_at,
  accompanied: !!row.accompanied,
  startTime: row.start_time ? row.start_time.slice(0, 5) : null,
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

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Plano removido/encerrado continua valendo até a data de remoção (próxima segunda). */
const effectiveStatus = (row: PlanRow): PlanStatus => {
  const status = row.status ?? "active";
  if (row.removed_at && todayISO() < row.removed_at) return "active";
  return status;
};

const mapPlan = (row: PlanRow): Plan => ({
  id: row.id,
  studentId: row.student_id,
  trainerId: row.trainer_id,
  trainerName: row.trainer_id ? row.trainer_profiles?.profiles?.full_name ?? "Profissional" : "Você",
  sport: row.sport ?? "outro",
  removedAt: row.removed_at,
  pauses: (row.plan_pauses ?? []).map((p) => ({ startsOn: p.starts_on, endsOn: p.ends_on })),
  title: row.title,
  objective: row.objective ?? "",
  description: row.description ?? "",
  startDate: row.start_date,
  endDate: row.deadline,
  cycleWeeks: row.cycle_weeks,
  status: effectiveStatus(row),
  createdAt: row.created_at ?? "",
  workouts: [...(row.workouts ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map(mapWorkout),
});

const PLAN_SELECT_LEGACY = "*, trainer_profiles(profiles(full_name)), workouts(*, workout_exercises(*))";
const PLAN_SELECT = "*, trainer_profiles(profiles(full_name)), workouts(*, workout_exercises(*)), plan_pauses(starts_on, ends_on)";

/** Planos de um aluno. Para o profissional, o banco só devolve os planos criados por ele. */
export const fetchPlansForStudent = async (studentId: string): Promise<Plan[]> => {
  const query = (select: string) => db.from("plans").select(select).eq("student_id", studentId).order("created_at", { ascending: false });
  let { data, error } = await query(PLAN_SELECT);
  if (missingSchema(error)) ({ data, error } = await query(PLAN_SELECT_LEGACY));
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
  sport: SportCode;
}

/** trainerId nulo = plano criado pelo próprio atleta. */
export const createPlan = async (trainerId: string | null, studentId: string, input: PlanInput): Promise<string> => {
  const row = {
    trainer_id: trainerId,
    student_id: studentId,
    title: input.title,
    objective: input.objective || null,
    description: input.description || null,
    start_date: input.startDate,
    deadline: input.endDate,
    cycle_weeks: input.cycleWeeks,
    status: "active",
  };
  let { data, error } = await db.from("plans").insert({ ...row, sport: input.sport }).select("id").single();
  if (missingSchema(error)) ({ data, error } = await db.from("plans").insert(row).select("id").single());
  if (error || !data) throw error;
  return data.id;
};

export const updatePlan = async (planId: string, patch: Pick<PlanInput, "title" | "objective" | "description" | "endDate">) => {
  const { error } = await db
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

/**
 * "completed" encerra o plano; "cancelled" é a exclusão (vai para o histórico). Vale a partir da próxima
 * segunda-feira: a pessoa continua devendo os treinos da semana atual. Retorna a data em que passa a valer.
 */
export const setPlanStatus = async (planId: string, status: PlanStatus): Promise<string> => {
  const { data, error } = await db.rpc("remove_plan", { p_plan_id: planId, p_status: status });
  if (missingSchema(error)) {
    const today = todayISO();
    const legacy = await db.from("plans").update({ status, end_date: today }).eq("id", planId);
    if (legacy.error) throw legacy.error;
    return today;
  }
  if (error) throw error;
  return data as string;
};

export const pausePlan = async (planId: string): Promise<string> => {
  const { data, error } = await db.rpc("pause_plan", { p_plan_id: planId });
  if (error) throw error;
  return data as string;
};

export const resumePlan = async (planId: string) => {
  const { error } = await db.rpc("resume_plan", { p_plan_id: planId });
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
  accompanied?: boolean;
  startTime?: string | null;
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

  // Campos de acompanhamento só vão se o banco já tiver as colunas (migração 0015).
  const extra = { accompanied: !!input.accompanied, start_time: input.startTime || null };

  let workoutId = input.id;
  if (workoutId) {
    let { error } = await db.from("workouts").update({ ...row, ...extra }).eq("id", workoutId);
    if (missingSchema(error)) ({ error } = await db.from("workouts").update(row).eq("id", workoutId));
    if (error) throw error;
    const del = await db.from("workout_exercises").delete().eq("workout_id", workoutId);
    if (del.error) throw del.error;
  } else {
    let { data, error } = await db.from("workouts").insert({ ...row, ...extra }).select("id").single();
    if (missingSchema(error)) ({ data, error } = await db.from("workouts").insert(row).select("id").single());
    if (error || !data) throw error;
    workoutId = data.id;
  }

  if (input.exercises.length > 0) {
    const { error } = await db.from("workout_exercises").insert(
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

/** Excluir treino vale a partir da próxima segunda-feira (retorna a data). */
export const deleteWorkout = async (workoutId: string): Promise<string> => {
  const { data, error } = await db.rpc("remove_workout", { p_workout_id: workoutId });
  if (missingSchema(error)) {
    const legacy = await db.from("workouts").delete().eq("id", workoutId);
    if (legacy.error) throw legacy.error;
    return todayISO();
  }
  if (error) throw error;
  return data as string;
};

// ---------- Execuções ----------

type ExecutionRow = {
  id: string;
  plan_id: string | null;
  workout_id: string | null;
  workout_name: string | null;
  date: string;
  observations: string | null;
  duration_minutes: number | null;
  is_valid: boolean | null;
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
  const { data, error } = await db
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
    durationMinutes: row.duration_minutes ?? undefined,
    isValid: row.is_valid ?? undefined,
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

export interface ExecutionResult {
  id: string;
  isValid: boolean;
  durationMinutes: number;
}

export const recordExecution = async (
  studentId: string,
  execution: {
    planId: string;
    workoutId: string;
    workoutName: string;
    observations?: string;
    exerciseLogs: ExerciseLog[];
    startedAt: string;
    finishedAt: string;
    source?: "online" | "offline";
    /** O treino foi acompanhado pelo professor? (vazio = usa o padrão do treino) */
    accompanied?: boolean;
  }
): Promise<ExecutionResult> => {
  const base = {
    student_id: studentId,
    plan_id: execution.planId,
    workout_id: execution.workoutId,
    workout_name: execution.workoutName,
    observations: execution.observations ?? null,
  };
  let { data, error } = await db
    .from("workout_executions")
    .insert({
      ...base,
      started_at: execution.startedAt,
      finished_at: execution.finishedAt,
      source: execution.source ?? "online",
      ...(execution.accompanied === undefined ? {} : { accompanied: execution.accompanied }),
    })
    .select("id, is_valid, duration_minutes")
    .single();
  // Banco com a migração 0010 mas sem a 0015: tenta de novo sem o campo "acompanhado".
  if (missingSchema(error) && execution.accompanied !== undefined) {
    ({ data, error } = await db
      .from("workout_executions")
      .insert({ ...base, started_at: execution.startedAt, finished_at: execution.finishedAt, source: execution.source ?? "online" })
      .select("id, is_valid, duration_minutes")
      .single());
  }
  if (missingSchema(error)) {
    ({ data, error } = await db
      .from("workout_executions")
      .insert({ ...base, date: execution.finishedAt.slice(0, 10) })
      .select("id")
      .single());
  }
  if (error || !data) throw error;

  for (const log of execution.exerciseLogs) {
    const logRes = await db
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
      const setsRes = await db.from("set_logs").insert(
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
  const saved = data as { id: string; is_valid?: boolean; duration_minutes?: number };
  return { id: saved.id, isValid: !!saved.is_valid, durationMinutes: saved.duration_minutes ?? 0 };
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
  const { data, error } = await db
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
  const { error } = await db.from("student_restrictions").insert({ trainer_id: trainerId, student_id: studentId, description });
  if (error) throw error;
};

export const deleteRestriction = async (id: string) => {
  const { error } = await db.from("student_restrictions").delete().eq("id", id);
  if (error) throw error;
};

/** Copia um plano de profissional para um plano próprio (editável) do atleta. */
export const copyPlanAsOwn = async (studentId: string, plan: Plan): Promise<string> => {
  const today = todayISO();
  const newId = await createPlan(null, studentId, {
    title: `${plan.title} (cópia)`,
    objective: plan.objective,
    description: plan.description,
    startDate: today,
    endDate: null,
    cycleWeeks: plan.cycleWeeks,
    sport: plan.sport,
  });
  const live = plan.workouts.filter((w) => !w.removedAt && (plan.cycleWeeks || (w.workoutDate && w.workoutDate >= today)));
  for (const w of live) {
    await saveWorkout(newId, {
      name: w.name,
      description: w.description,
      weekIndex: w.weekIndex,
      weekday: w.weekday,
      workoutDate: w.workoutDate,
      exercises: w.exercises,
    });
  }
  return newId;
};

// ---------- Treinos planejados da semana (ajuste "só desta vez") ----------

export interface SlotInfo {
  id: string;
  workoutId: string;
  date: string;
  accompanied: boolean;
  startTime: string | null;
  status: "pending" | "done" | "missed";
}

/** Treinos planejados (já materializados) do aluno entre duas datas. Vazio se o banco ainda não tem a migração. */
export const fetchSlots = async (studentId: string, fromISO: string, toISO: string): Promise<SlotInfo[]> => {
  const { data, error } = await db
    .from("planned_slots")
    .select("id, workout_id, planned_date, accompanied, start_time, status")
    .eq("student_id", studentId)
    .gte("planned_date", fromISO)
    .lte("planned_date", toISO);
  if (error) return [];
  return ((data ?? []) as { id: string; workout_id: string | null; planned_date: string; accompanied: boolean | null; start_time: string | null; status: SlotInfo["status"] }[])
    .filter((r) => r.workout_id)
    .map((r) => ({
      id: r.id,
      workoutId: r.workout_id as string,
      date: r.planned_date,
      accompanied: !!r.accompanied,
      startTime: r.start_time ? r.start_time.slice(0, 5) : null,
      status: r.status,
    }));
};

/** O aluno ajusta um treino da semana: acompanhado ou não e/ou horário (vale só para aquele dia). */
export const setSlotOptions = async (slotId: string, accompanied: boolean, startTime: string | null) => {
  const { error } = await db.rpc("set_slot_options", { p_slot_id: slotId, p_accompanied: accompanied, p_start_time: startTime });
  if (error) throw error;
};
