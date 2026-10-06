// Solicitações entre profissional e aluno: convites, pedidos de agendamento e
// pedidos de troca de horário. Tudo que exige resposta de quem recebe.

import { supabase } from "@/integrations/supabase/client";
import { acceptSuggestion, declineSuggestion, fetchBookingsForStudent, fetchBookingsForTrainer, respondProposal } from "@/lib/agendaStore";

export type RequestKind = "invite" | "booking" | "suggestion" | "reschedule";

export interface RequestItem {
  kind: RequestKind;
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const hhmm = (time: string) => time.slice(0, 5);
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export const INVITE_ERRORS: Record<string, string> = {
  EMAIL_IS_TRAINER: "Esse e-mail pertence a uma conta de profissional.",
  ALREADY_LINKED: "Esse aluno já está na sua carteira.",
  ALREADY_INVITED: "Já existe um convite pendente para esse e-mail.",
  INVALID_EMAIL: "Digite um e-mail válido.",
  NOT_TRAINER: "Apenas profissionais podem convidar alunos.",
};

/** Traduz o erro das funções do banco (a mensagem vem com o código, ex.: "ALREADY_LINKED"). */
export const friendlyError = (error: { message?: string } | null | undefined, map: Record<string, string>, fallback: string) => {
  const code = Object.keys(map).find((c) => error?.message?.includes(c));
  return code ? map[code] : fallback;
};

export const inviteStudent = async (email: string): Promise<{ registered: boolean }> => {
  const { data, error } = await supabase.rpc("invite_student", { p_email: email });
  if (error) throw new Error(friendlyError(error, INVITE_ERRORS, "Não foi possível enviar o convite."));
  return { registered: Boolean((data as { registered?: boolean } | null)?.registered) };
};

export interface SentInvite {
  id: string;
  email: string;
  registered: boolean;
  createdAt: string;
}

export const fetchPendingInvitesSent = async (trainerId: string): Promise<SentInvite[]> => {
  const { data, error } = await supabase
    .from("student_invites")
    .select("id, email, student_id, created_at")
    .eq("trainer_id", trainerId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    registered: row.student_id != null,
    createdAt: row.created_at ?? "",
  }));
};

export const requestReschedule = async (eventId: string, occurrenceDate: string, date: string, start: string, end: string) => {
  const { error } = await supabase.rpc("request_reschedule", {
    p_event_id: eventId,
    p_occurrence_date: occurrenceDate,
    p_date: date,
    p_start: start,
    p_end: end,
  });
  if (error) {
    throw new Error(
      friendlyError(
        error,
        {
          ALREADY_PENDING: "Já existe um pedido de troca pendente para essa aula.",
          NO_STUDENTS: "Essa aula não tem alunos vinculados.",
          NOT_A_CLASS: "Só é possível pedir troca de horário de aulas.",
          NOT_ALLOWED: "Você não participa dessa aula.",
        },
        "Não foi possível enviar o pedido."
      )
    );
  }
};

type RescheduleRow = {
  id: string;
  requested_by: "trainer" | "student";
  occurrence_date: string;
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  created_at: string | null;
  schedule_events: { start_time: string; end_time: string } | null;
  trainer_profiles: { profiles: { full_name: string } | null } | null;
  student_profiles: { profiles: { full_name: string } | null } | null;
};

const rescheduleSelect =
  "id, requested_by, occurrence_date, proposed_date, proposed_start_time, proposed_end_time, created_at, schedule_events(start_time, end_time), trainer_profiles(profiles(full_name)), student_profiles(profiles(full_name))";

const rescheduleItem = (row: RescheduleRow): RequestItem => {
  const who =
    row.requested_by === "trainer"
      ? row.trainer_profiles?.profiles?.full_name ?? "O profissional"
      : row.student_profiles?.profiles?.full_name ?? "O aluno";
  const current = row.schedule_events
    ? `${fmtDate(row.occurrence_date)}, ${hhmm(row.schedule_events.start_time)}`
    : fmtDate(row.occurrence_date);
  return {
    kind: "reschedule",
    id: row.id,
    title: "Pedido de troca de horário",
    description: `${who} quer mudar a aula de ${current} para ${fmtDate(row.proposed_date)}, ${hhmm(row.proposed_start_time)}–${hhmm(row.proposed_end_time)}.`,
    createdAt: row.created_at ?? "",
  };
};

/** Tudo que o profissional precisa aceitar ou recusar. */
export const fetchRequestsForTrainer = async (trainerId: string): Promise<RequestItem[]> => {
  const [bookings, reschedules] = await Promise.all([
    fetchBookingsForTrainer(trainerId),
    supabase
      .from("reschedule_requests")
      .select(rescheduleSelect)
      .eq("trainer_id", trainerId)
      .eq("requested_by", "student")
      .eq("status", "pending"),
  ]);
  if (reschedules.error) throw reschedules.error;

  const items: RequestItem[] = bookings
    .filter((b) => b.status === "pending")
    .map((b) => ({
      kind: "booking" as const,
      id: b.id,
      title: "Pedido de aula",
      description: `${b.clientName} quer agendar uma aula em ${fmtDate(b.date)}, ${b.startTime}–${b.endTime}.`,
      createdAt: b.date,
    }));

  ((reschedules.data ?? []) as unknown as RescheduleRow[]).forEach((row) => items.push(rescheduleItem(row)));
  return items;
};

/** Tudo que o aluno precisa aceitar ou recusar. */
export const fetchRequestsForStudent = async (studentId: string): Promise<RequestItem[]> => {
  const [invites, reschedules, bookings] = await Promise.all([
    supabase
      .from("student_invites")
      .select("id, created_at, trainer_profiles(profiles(full_name))")
      .eq("student_id", studentId)
      .eq("status", "pending"),
    supabase
      .from("reschedule_requests")
      .select(rescheduleSelect)
      .eq("student_id", studentId)
      .eq("requested_by", "trainer")
      .eq("status", "pending"),
    fetchBookingsForStudent(studentId),
  ]);
  if (invites.error) throw invites.error;
  if (reschedules.error) throw reschedules.error;

  const items: RequestItem[] = [];
  ((invites.data ?? []) as unknown as { id: string; created_at: string | null; trainer_profiles: { profiles: { full_name: string } | null } | null }[]).forEach(
    (row) =>
      items.push({
        kind: "invite",
        id: row.id,
        title: "Convite de profissional",
        description: `${row.trainer_profiles?.profiles?.full_name ?? "Um profissional"} convidou você para ser aluno(a).`,
        createdAt: row.created_at ?? "",
      })
  );
  ((reschedules.data ?? []) as unknown as RescheduleRow[]).forEach((row) => items.push(rescheduleItem(row)));
  bookings
    .filter((b) => b.status === "suggested" && b.suggestion)
    .forEach((b) =>
      items.push({
        kind: "suggestion",
        id: b.id,
        title: "Novo horário sugerido",
        description: `${b.trainerName} sugeriu ${fmtDate(b.suggestion!.date)}, ${b.suggestion!.startTime}–${b.suggestion!.endTime} para a sua aula.`,
        createdAt: b.date,
      })
    );
  return items;
};

export const respondToRequest = async (item: RequestItem, accept: boolean): Promise<void> => {
  if (item.kind === "invite") {
    const { error } = await supabase.rpc("respond_student_invite", { p_invite_id: item.id, p_accept: accept });
    if (error) throw error;
  } else if (item.kind === "reschedule") {
    const { error } = await supabase.rpc("respond_reschedule", { p_request_id: item.id, p_accept: accept });
    if (error) throw error;
  } else if (item.kind === "booking") {
    await respondProposal(item.id, accept ? "accept" : "reject");
  } else if (accept) {
    await acceptSuggestion(item.id);
  } else {
    await declineSuggestion(item.id);
  }
};

export const countPendingRequests = async (role: "trainer" | "student", roleProfileId: string): Promise<number> => {
  const items = role === "trainer" ? await fetchRequestsForTrainer(roleProfileId) : await fetchRequestsForStudent(roleProfileId);
  return items.length;
};
