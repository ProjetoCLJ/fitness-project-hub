// Agenda do profissional no Supabase. Tudo é um "evento" (aula, expediente ou
// bloqueio), pontual ou recorrente, com edição "só esta ocorrência / esta e as
// próximas / todas". A lógica de montar a timeline do dia é pura (recebe a
// lista de eventos já carregada); só as funções fetch*/create*/update*/delete*
// falam com o banco.

import { supabase } from "@/integrations/supabase/client";

export type EventType = "aula" | "expediente" | "bloqueado";
export type RecurrenceType = "once" | "weekly";
export type EditScope = "this" | "following" | "all";

export interface ScheduleEvent {
  id: string;
  trainerId: string;
  type: EventType;
  /** Só usado no tipo "bloqueado" — complemento opcional do título. */
  title?: string;
  studentIds: string[];
  studentNames: string[];
  recurrence: RecurrenceType;
  date?: string;
  weekdays?: number[];
  startDate: string;
  endDate: string | null;
  excludedDates: string[];
  startTime: string;
  endTime: string;
  bookingId?: string;
}

export interface ScheduleEventInput {
  type: EventType;
  title?: string;
  studentIds: string[];
  recurrence: RecurrenceType;
  date?: string;
  weekdays?: number[];
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
}

export type BookingStatus = "pending" | "confirmed" | "rejected" | "suggested";

export interface Booking {
  id: string;
  trainerId: string;
  studentId: string;
  clientName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  suggestion?: { date: string; startTime: string; endTime: string };
}

export interface LinkedStudent {
  studentId: string;
  name: string;
  email: string;
  customPrice: number | null;
}

export interface AvailabilityConflict {
  eventId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
}

export const DAY_TIMELINE_START = "06:00";
export const DAY_TIMELINE_END = "22:00";

const hhmm = (time: string) => time.slice(0, 5);

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);

const addDaysISO = (dateISO: string, days: number) => {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
};

export const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const eventTitle = (event: Pick<ScheduleEvent, "type" | "title" | "studentNames">): string => {
  if (event.type === "aula") {
    const names = event.studentNames.filter(Boolean);
    if (names.length === 0) return "Aula";
    if (names.length === 1) return `Aula - ${names[0]}`;
    if (names.length === 2) return `Aula - ${names[0]}, ${names[1]}`;
    return `Aula - ${names[0]} +${names.length - 1}`;
  }
  if (event.type === "expediente") return "Expediente";
  return event.title ? `Bloqueado - ${event.title}` : "Bloqueado";
};

// ---------- Leitura ----------

type EventRow = {
  id: string;
  trainer_id: string;
  type: string;
  title: string | null;
  recurrence: RecurrenceType;
  date: string | null;
  weekdays: number[] | null;
  start_date: string;
  end_date: string | null;
  excluded_dates: string[] | null;
  start_time: string;
  end_time: string;
  booking_id: string | null;
  schedule_event_students?: { student_id: string; student_profiles: { profiles: { full_name: string } | null } | null }[] | null;
};

const mapEvent = (row: EventRow): ScheduleEvent => {
  const students = row.schedule_event_students ?? [];
  return {
    id: row.id,
    trainerId: row.trainer_id,
    type: row.type as EventType,
    title: row.title ?? undefined,
    studentIds: students.map((s) => s.student_id),
    studentNames: students.map((s) => s.student_profiles?.profiles?.full_name ?? "Aluno"),
    recurrence: row.recurrence,
    date: row.date ?? undefined,
    weekdays: row.weekdays ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    excludedDates: row.excluded_dates ?? [],
    startTime: hhmm(row.start_time),
    endTime: hhmm(row.end_time),
    bookingId: row.booking_id ?? undefined,
  };
};

const EVENT_SELECT = "*, schedule_event_students(student_id, student_profiles(profiles(full_name)))";
const KNOWN_TYPES: string[] = ["aula", "expediente", "bloqueado"];

export const fetchTrainerEvents = async (trainerId: string): Promise<ScheduleEvent[]> => {
  const { data, error } = await supabase.from("schedule_events").select(EVENT_SELECT).eq("trainer_id", trainerId);
  if (error) throw error;
  return ((data ?? []) as unknown as EventRow[]).filter((r) => KNOWN_TYPES.includes(r.type)).map(mapEvent);
};

/** Aulas em que o aluno está inscrito (para a home do aluno). */
export const fetchStudentEvents = async (studentId: string): Promise<(ScheduleEvent & { trainerName: string })[]> => {
  const { data, error } = await supabase
    .from("schedule_events")
    .select("*, schedule_event_students!inner(student_id), trainer_profiles(profiles(full_name))")
    .eq("type", "aula")
    .eq("schedule_event_students.student_id", studentId);
  if (error) throw error;
  return ((data ?? []) as unknown as (EventRow & { trainer_profiles: { profiles: { full_name: string } | null } | null })[]).map((row) => ({
    ...mapEvent(row),
    studentIds: [studentId],
    trainerName: row.trainer_profiles?.profiles?.full_name ?? "Profissional",
  }));
};

export const fetchLinkedStudents = async (trainerId: string): Promise<LinkedStudent[]> => {
  const { data, error } = await supabase
    .from("trainer_clients")
    .select("student_id, custom_price, student_profiles(profiles(full_name, email))")
    .eq("trainer_id", trainerId)
    .eq("status", "active");
  if (error) throw error;
  return ((data ?? []) as unknown as {
    student_id: string;
    custom_price: number | null;
    student_profiles: { profiles: { full_name: string; email: string } | null } | null;
  }[]).map((row) => ({
    studentId: row.student_id,
    name: row.student_profiles?.profiles?.full_name ?? "Aluno",
    email: row.student_profiles?.profiles?.email ?? "",
    customPrice: row.custom_price != null ? Number(row.custom_price) : null,
  }));
};

// ---------- Lógica pura de agenda ----------

export const getEventsForDate = (events: ScheduleEvent[], dateISO: string): ScheduleEvent[] => {
  const dayOfWeek = new Date(`${dateISO}T00:00:00`).getDay();
  return events.filter((event) => {
    if (event.excludedDates.includes(dateISO)) return false;
    if (event.recurrence === "once") return event.date === dateISO;
    const afterStart = dateISO >= event.startDate;
    const beforeEnd = event.endDate === null || dateISO <= event.endDate;
    return afterStart && beforeEnd && (event.weekdays ?? []).includes(dayOfWeek);
  });
};

const PRIORITY: Record<EventType, number> = { aula: 3, bloqueado: 2, expediente: 1 };

const pickEvent = (events: ScheduleEvent[], start: string, end: string): ScheduleEvent | undefined => {
  const matches = events.filter((e) => overlaps(start, end, e.startTime, e.endTime));
  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type])[0];
};

/** "available" = dentro do expediente e livre; "fora_expediente" = sem nenhum expediente cobrindo o horário. */
export type SlotStatus = "available" | "aula" | "bloqueado" | "fora_expediente";

export interface ScheduleSlot {
  start: string;
  end: string;
  status: SlotStatus;
  event?: ScheduleEvent;
  isPast: boolean;
}

export const getSlotsForDate = (events: ScheduleEvent[], dateISO: string, durationMinutes = 60): ScheduleSlot[] => {
  const dayEvents = getEventsForDate(events, dateISO);

  const now = new Date();
  const today = toLocalISO(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: ScheduleSlot[] = [];
  let cursor = toMinutes(DAY_TIMELINE_START);
  const end = toMinutes(DAY_TIMELINE_END);

  while (cursor + durationMinutes <= end) {
    const start = minutesToTime(cursor);
    const slotEndMinutes = cursor + durationMinutes;
    const slotEnd = minutesToTime(slotEndMinutes);

    const event = pickEvent(dayEvents, start, slotEnd);
    const isPast = dateISO < today || (dateISO === today && slotEndMinutes <= nowMinutes);

    let status: SlotStatus;
    if (!event) status = "fora_expediente";
    else if (event.type === "expediente") status = "available";
    else status = event.type;

    slots.push({ start, end: slotEnd, status, event, isPast });
    cursor += durationMinutes;
  }

  return slots;
};

/** Horários livres (dentro do expediente, sem aula nem bloqueio) — usado pelo aluno para solicitar aula. */
export const getAvailableSlots = (events: ScheduleEvent[], dateISO: string, durationMinutes = 60): { start: string; end: string }[] =>
  getSlotsForDate(events, dateISO, durationMinutes)
    .filter((s) => s.status === "available" && !s.isPast)
    .map((s) => ({ start: s.start, end: s.end }));

export const countAvailableSlots = (events: ScheduleEvent[], days: number): number => {
  let total = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    total += getAvailableSlots(events, toLocalISO(date)).length;
  }
  return total;
};

/** Próximas ocorrências de aulas (expande recorrência) a partir de hoje. */
export const upcomingOccurrences = (events: ScheduleEvent[], days = 60) => {
  const result: { event: ScheduleEvent; date: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const iso = toLocalISO(date);
    getEventsForDate(events, iso)
      .filter((e) => e.type === "aula")
      .forEach((e) => {
        if (i === 0 && toMinutes(e.endTime) <= nowMinutes) return;
        result.push({ event: e, date: iso });
      });
  }
  return result.sort((a, b) => (a.date + a.event.startTime).localeCompare(b.date + b.event.startTime));
};

/** Aulas pontuais que ficaram cobertas por um bloqueio no mesmo horário. */
export const getScheduleConflicts = (events: ScheduleEvent[]): AvailabilityConflict[] => {
  const conflicts: AvailabilityConflict[] = [];
  for (const aula of events.filter((e) => e.type === "aula" && e.recurrence === "once" && e.date)) {
    const date = aula.date as string;
    const blocking = getEventsForDate(events, date).find(
      (e) => e.id !== aula.id && e.type === "bloqueado" && overlaps(aula.startTime, aula.endTime, e.startTime, e.endTime)
    );
    if (blocking) {
      conflicts.push({ eventId: aula.id, date, startTime: aula.startTime, endTime: aula.endTime, title: eventTitle(aula) });
    }
  }
  return conflicts.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
};

// ---------- Escrita de eventos ----------

const toRow = (trainerId: string, input: ScheduleEventInput, bookingId?: string) => ({
  trainer_id: trainerId,
  type: input.type,
  title: input.type === "bloqueado" ? input.title ?? null : null,
  recurrence: input.recurrence,
  date: input.recurrence === "once" ? input.date ?? input.startDate : null,
  weekdays: input.recurrence === "weekly" ? input.weekdays ?? [] : null,
  start_date: input.startDate,
  end_date: input.endDate,
  start_time: input.startTime,
  end_time: input.endTime,
  booking_id: bookingId ?? null,
});

const setStudents = async (eventId: string, type: EventType, studentIds: string[]) => {
  const del = await supabase.from("schedule_event_students").delete().eq("event_id", eventId);
  if (del.error) throw del.error;
  if (type !== "aula" || studentIds.length === 0) return;
  const ins = await supabase.from("schedule_event_students").insert(studentIds.map((student_id) => ({ event_id: eventId, student_id })));
  if (ins.error) throw ins.error;
};

export const createScheduleEvent = async (trainerId: string, input: ScheduleEventInput, bookingId?: string): Promise<string> => {
  const { data, error } = await supabase.from("schedule_events").insert(toRow(trainerId, input, bookingId)).select("id").single();
  if (error) throw error;
  await setStudents(data.id, input.type, input.studentIds);
  return data.id;
};

/** Atualiza um evento respeitando o escopo (esta ocorrência / esta e as próximas / série inteira). */
export const updateScheduleEvent = async (
  original: ScheduleEvent,
  occurrenceDate: string,
  scope: EditScope,
  patch: ScheduleEventInput
): Promise<void> => {
  const updateWhole = async () => {
    const { error } = await supabase.from("schedule_events").update(toRow(original.trainerId, patch, original.bookingId)).eq("id", original.id);
    if (error) throw error;
    await setStudents(original.id, patch.type, patch.studentIds);
  };

  if (original.recurrence === "once" || scope === "all") return updateWhole();

  if (scope === "this") {
    const { error } = await supabase
      .from("schedule_events")
      .update({ excluded_dates: [...original.excludedDates, occurrenceDate] })
      .eq("id", original.id);
    if (error) throw error;
    await createScheduleEvent(original.trainerId, {
      ...patch,
      recurrence: "once",
      date: occurrenceDate,
      startDate: occurrenceDate,
      endDate: occurrenceDate,
    });
    return;
  }

  // scope === "following"
  if (occurrenceDate <= original.startDate) return updateWhole();

  const { error } = await supabase.from("schedule_events").update({ end_date: addDaysISO(occurrenceDate, -1) }).eq("id", original.id);
  if (error) throw error;
  await createScheduleEvent(original.trainerId, { ...patch, recurrence: "weekly", startDate: occurrenceDate });
};

/** Cancela/exclui um evento respeitando o escopo. */
export const deleteScheduleEvent = async (original: ScheduleEvent, occurrenceDate: string, scope: EditScope): Promise<void> => {
  if (original.recurrence === "once" || scope === "all") {
    if (original.bookingId) {
      await supabase.from("bookings").update({ status: "rejected" }).eq("id", original.bookingId);
    }
    const { error } = await supabase.from("schedule_events").delete().eq("id", original.id);
    if (error) throw error;
    return;
  }

  if (scope === "this") {
    const { error } = await supabase
      .from("schedule_events")
      .update({ excluded_dates: [...original.excludedDates, occurrenceDate] })
      .eq("id", original.id);
    if (error) throw error;
    return;
  }

  if (occurrenceDate <= original.startDate) {
    const { error } = await supabase.from("schedule_events").delete().eq("id", original.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("schedule_events").update({ end_date: addDaysISO(occurrenceDate, -1) }).eq("id", original.id);
    if (error) throw error;
  }
};

// ---------- Agendamentos (solicitação do aluno) ----------

type BookingRow = {
  id: string;
  trainer_id: string;
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus | null;
  suggested_date: string | null;
  suggested_start_time: string | null;
  suggested_end_time: string | null;
  student_profiles?: { profiles: { full_name: string } | null } | null;
  trainer_profiles?: { profiles: { full_name: string } | null } | null;
};

const mapBooking = (row: BookingRow): Booking => ({
  id: row.id,
  trainerId: row.trainer_id,
  studentId: row.student_id,
  clientName: row.student_profiles?.profiles?.full_name ?? "Aluno",
  trainerName: row.trainer_profiles?.profiles?.full_name ?? "Profissional",
  date: row.date,
  startTime: hhmm(row.start_time),
  endTime: hhmm(row.end_time),
  status: row.status ?? "pending",
  suggestion:
    row.suggested_date && row.suggested_start_time && row.suggested_end_time
      ? { date: row.suggested_date, startTime: hhmm(row.suggested_start_time), endTime: hhmm(row.suggested_end_time) }
      : undefined,
});

export const fetchBookingsForTrainer = async (trainerId: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, student_profiles(profiles(full_name))")
    .eq("trainer_id", trainerId)
    .order("date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as BookingRow[]).map(mapBooking);
};

export const fetchBookingsForStudent = async (studentId: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, trainer_profiles(profiles(full_name))")
    .eq("student_id", studentId)
    .order("date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as BookingRow[]).map(mapBooking);
};

export const createProposal = async (trainerId: string, studentId: string, date: string, startTime: string, endTime: string) => {
  const { error } = await supabase
    .from("bookings")
    .insert({ trainer_id: trainerId, student_id: studentId, date, start_time: startTime, end_time: endTime, status: "pending" });
  if (error) throw error;
};

export const respondProposal = async (
  bookingId: string,
  action: "accept" | "reject" | "suggest",
  suggestion?: { date: string; startTime: string; endTime: string }
): Promise<void> => {
  if (action === "accept") {
    const { error } = await supabase.rpc("confirm_booking", { p_booking_id: bookingId });
    if (error) throw error;
    return;
  }
  const patch =
    action === "reject"
      ? { status: "rejected" as const }
      : {
          status: "suggested" as const,
          suggested_date: suggestion?.date,
          suggested_start_time: suggestion?.startTime,
          suggested_end_time: suggestion?.endTime,
        };
  const { error } = await supabase.from("bookings").update(patch).eq("id", bookingId);
  if (error) throw error;
};

export const acceptSuggestion = async (bookingId: string): Promise<void> => {
  const { error } = await supabase.rpc("confirm_booking", { p_booking_id: bookingId });
  if (error) throw error;
};

export const declineSuggestion = async (bookingId: string): Promise<void> => {
  const { error } = await supabase.from("bookings").update({ status: "rejected" }).eq("id", bookingId);
  if (error) throw error;
};
