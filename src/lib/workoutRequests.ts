// Solicitações de mudança de treino entre aluno e profissional (nos dois sentidos).
// As tabelas/funções são da migração 0018; o cliente é "solto" porque os tipos gerados ainda não as conhecem.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/requestsStore";

const db = supabase as unknown as SupabaseClient;

export type WorkoutRequestKind = "reschedule" | "cancel";
export type WorkoutRequestStatus = "pending" | "accepted" | "declined" | "countered" | "withdrawn";
export type RequesterRole = "student" | "trainer";

export interface WorkoutRequest {
  id: string;
  kind: WorkoutRequestKind;
  planId: string;
  workoutId: string;
  workoutName: string;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  requestedBy: RequesterRole;
  fromDate: string;
  toDate: string | null;
  toStart: string | null;
  message: string | null;
  status: WorkoutRequestStatus;
  parentId: string | null;
  responseMessage: string | null;
  respondedAt: string | null;
  createdAt: string;
}

type Row = {
  id: string;
  kind: WorkoutRequestKind;
  plan_id: string;
  workout_id: string;
  student_id: string;
  trainer_id: string;
  requested_by: RequesterRole;
  from_date: string;
  to_date: string | null;
  to_start: string | null;
  message: string | null;
  status: WorkoutRequestStatus;
  parent_id: string | null;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
  workouts: { name: string } | null;
  student_profiles: { profiles: { full_name: string } | null } | null;
  trainer_profiles: { profiles: { full_name: string } | null } | null;
};

export const ERRORS: Record<string, string> = {
  SLOT_TAKEN: "Esse horário não está mais disponível. Escolha outro.",
  ALREADY_PENDING: "Já existe uma solicitação pendente para esse treino nesse dia.",
  ALREADY_SCHEDULED: "O treino já está marcado no dia escolhido.",
  NOT_ACCOMPANIED: "Só treinos acompanhados pelo professor podem ser alterados por aqui.",
  OUT_OF_RANGE: "Só dá para alterar treinos dos próximos 14 dias.",
  NOT_FOUND: "Esse treino não está mais programado para o dia escolhido.",
  NOT_PENDING: "Essa solicitação já foi respondida.",
  NOT_ALLOWED: "Você não pode fazer isso.",
  EXPIRED: "Essa solicitação já passou da data.",
  NO_TRAINER: "Esse treino não tem profissional vinculado.",
  MISSING_TARGET: "Escolha o novo dia e horário.",
};

const fail = (error: { message?: string } | null, fallback: string): never => {
  throw new Error(friendlyError(error, ERRORS, fallback));
};

const SELECT =
  "*, workouts(name), student_profiles(profiles(full_name)), trainer_profiles(profiles(full_name))";

const map = (r: Row): WorkoutRequest => ({
  id: r.id,
  kind: r.kind,
  planId: r.plan_id,
  workoutId: r.workout_id,
  workoutName: r.workouts?.name ?? "Treino",
  studentId: r.student_id,
  studentName: r.student_profiles?.profiles?.full_name ?? "Aluno",
  trainerId: r.trainer_id,
  trainerName: r.trainer_profiles?.profiles?.full_name ?? "Profissional",
  requestedBy: r.requested_by,
  fromDate: r.from_date,
  toDate: r.to_date,
  toStart: r.to_start ? r.to_start.slice(0, 5) : null,
  message: r.message,
  status: r.status,
  parentId: r.parent_id,
  responseMessage: r.response_message,
  respondedAt: r.responded_at,
  createdAt: r.created_at,
});

/** Todas as solicitações em que a pessoa é aluno ou profissional (o banco só devolve as dela). */
export const fetchWorkoutRequests = async (): Promise<WorkoutRequest[]> => {
  const { data, error } = await db.from("workout_requests").select(SELECT).order("created_at", { ascending: false });
  if (error) {
    // Banco sem a migração 0018: a página funciona só com as solicitações antigas.
    if (["42P01", "PGRST205", "PGRST200"].includes((error as { code?: string }).code ?? "")) return [];
    throw error;
  }
  return ((data ?? []) as unknown as Row[]).map(map);
};

export interface NewRequestInput {
  workoutId: string;
  fromDate: string;
  kind: WorkoutRequestKind;
  toDate?: string | null;
  toStart?: string | null;
  message?: string;
}

export const createWorkoutRequest = async (input: NewRequestInput): Promise<void> => {
  const { error } = await db.rpc("create_workout_request", {
    p_workout: input.workoutId,
    p_from: input.fromDate,
    p_kind: input.kind,
    p_to: input.toDate ?? null,
    p_start: input.toStart ?? null,
    p_message: input.message ?? null,
  });
  if (error) fail(error, "Não foi possível enviar a solicitação.");
};

export const respondWorkoutRequest = async (
  id: string,
  action: "accept" | "decline" | "counter",
  opts: { toDate?: string; toStart?: string; message?: string } = {}
): Promise<void> => {
  const { error } = await db.rpc("respond_workout_request", {
    p_id: id,
    p_action: action,
    p_to: opts.toDate ?? null,
    p_start: opts.toStart ?? null,
    p_message: opts.message ?? null,
  });
  if (error) fail(error, "Não foi possível responder.");
};

export const withdrawWorkoutRequest = async (id: string): Promise<void> => {
  const { error } = await db.rpc("withdraw_workout_request", { p_id: id });
  if (error) fail(error, "Não foi possível cancelar a solicitação.");
};

export interface AgendaCell {
  date: string;
  start: string;
  end: string;
  free: boolean;
}

/** Agenda do profissional só com livre/ocupado por hora (sem detalhes de quem ocupa). */
export const fetchAgendaAvailability = async (
  trainerId: string,
  fromISO: string,
  toISO: string,
  exclude?: { workoutId: string; date: string; requestId?: string }
): Promise<AgendaCell[]> => {
  const { data, error } = await db.rpc("trainer_agenda_availability", {
    p_trainer: trainerId,
    p_from: fromISO,
    p_to: toISO,
    p_exclude_workout: exclude?.workoutId ?? null,
    p_exclude_date: exclude?.date ?? null,
    p_exclude_request: exclude?.requestId ?? null,
  });
  if (error) fail(error, "Não foi possível carregar a agenda do professor.");
  return ((data ?? []) as { day: string; slot_start: string; slot_end: string; status: string }[]).map((r) => ({
    date: r.day,
    start: r.slot_start.slice(0, 5),
    end: r.slot_end.slice(0, 5),
    free: r.status === "free",
  }));
};

export const REQUEST_KIND_LABEL: Record<WorkoutRequestKind, string> = {
  reschedule: "Mudança de horário/dia",
  cancel: "Cancelamento de treino",
};

export const REQUEST_STATUS_LABEL: Record<WorkoutRequestStatus, string> = {
  pending: "Pendente",
  accepted: "Aceita",
  declined: "Recusada",
  countered: "Nova proposta enviada",
  withdrawn: "Cancelada",
};
