// Store local (localStorage) de agenda do profissional.
// Modelo unificado, inspirado no Google Agenda: tudo é um "evento"
// (aula, bloqueio ou fora de expediente), pontual ou recorrente, com
// suporte a editar/cancelar só uma ocorrência, "esta e as próximas"
// ou a série inteira. Simula o cruzamento cliente <-> profissional
// até termos um backend real.

export type EventType = "aula" | "bloqueado" | "fora_expediente";
export type RecurrenceType = "once" | "weekly";
export type EditScope = "this" | "following" | "all";

export interface ScheduleEvent {
  id: string;
  trainerId: string;
  type: EventType;
  /** Só usado (e editável) no tipo "bloqueado" — complemento opcional do título. */
  title?: string;
  /** Só usado no tipo "aula". */
  studentNames?: string[];
  recurrence: RecurrenceType;
  /** yyyy-mm-dd — usado quando recurrence === "once". */
  date?: string;
  /** 0 = domingo .. 6 = sábado — usado quando recurrence === "weekly". */
  weekdays?: number[];
  /** yyyy-mm-dd — a partir de quando a série vale (recurrence === "weekly"). */
  startDate: string;
  /** yyyy-mm-dd ou null (nunca termina) — usado quando recurrence === "weekly". */
  endDate: string | null;
  /** Datas em que essa série não vale (cancelamento de uma ocorrência específica). */
  excludedDates?: string[];
  startTime: string;
  endTime: string;
  /** Referencia a Booking de origem (fluxo de solicitação do aluno), para manter os dois em sincronia. */
  bookingId?: string;
  createdAt: string;
}

export type ScheduleEventInput = Omit<ScheduleEvent, "id" | "trainerId" | "createdAt">;

export type BookingStatus = "pending" | "confirmed" | "rejected" | "suggested";

export interface Booking {
  id: string;
  trainerId: string;
  clientId: string;
  clientName: string;
  date: string; // yyyy-mm-dd
  startTime: string;
  endTime: string;
  status: BookingStatus;
  location?: string;
  suggestion?: { date: string; startTime: string; endTime: string };
  createdAt: string;
}

export interface AvailabilityConflict {
  eventId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
}

interface AgendaData {
  events: ScheduleEvent[];
  bookings: Booking[];
}

const STORAGE_KEY = "fit_agenda";
const DEFAULT_TRAINER_ID = "trainer-1";

/** Janela do dia considerada na timeline. */
export const DAY_TIMELINE_START = "06:00";
export const DAY_TIMELINE_END = "22:00";

const defaultData = (): AgendaData => ({
  events: [],
  bookings: [],
});

const getData = (): AgendaData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData();
  try {
    const parsed = JSON.parse(raw) as Partial<AgendaData>;
    return {
      events: parsed.events ?? [],
      bookings: parsed.bookings ?? [],
    };
  } catch {
    return defaultData();
  }
};

const persist = (data: AgendaData) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

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
  return d.toISOString().slice(0, 10);
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export const eventTitle = (event: Pick<ScheduleEvent, "type" | "title" | "studentNames">): string => {
  if (event.type === "aula") {
    const names = event.studentNames ?? [];
    if (names.length === 0) return "Aula";
    if (names.length === 1) return `Aula - ${names[0]}`;
    if (names.length === 2) return `Aula - ${names[0]}, ${names[1]}`;
    return `Aula - ${names[0]} +${names.length - 1}`;
  }
  if (event.type === "fora_expediente") return "Fora de expediente";
  return event.title ? `Bloqueado - ${event.title}` : "Bloqueado";
};

/** Eventos (já resolvida a recorrência) que valem para uma data específica. */
export const getEventsForDate = (dateISO: string, trainerId: string = DEFAULT_TRAINER_ID): ScheduleEvent[] => {
  const data = getData();
  const dayOfWeek = new Date(`${dateISO}T00:00:00`).getDay();

  return data.events
    .filter((event) => event.trainerId === trainerId)
    .filter((event) => {
      if (event.excludedDates?.includes(dateISO)) return false;
      if (event.recurrence === "once") return event.date === dateISO;
      const afterStart = dateISO >= event.startDate;
      const beforeEnd = event.endDate === null || dateISO <= event.endDate;
      return afterStart && beforeEnd && (event.weekdays ?? []).includes(dayOfWeek);
    });
};

const PRIORITY: Record<EventType, number> = { aula: 3, bloqueado: 2, fora_expediente: 1 };

const pickEvent = (events: ScheduleEvent[], start: string, end: string): ScheduleEvent | undefined => {
  const matches = events.filter((e) => overlaps(start, end, e.startTime, e.endTime));
  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => PRIORITY[b.type] - PRIORITY[a.type])[0];
};

export type ScheduleSlotStatus = "available" | EventType;

export interface ScheduleSlot {
  start: string;
  end: string;
  status: ScheduleSlotStatus;
  event?: ScheduleEvent;
  isPast: boolean;
}

/** Timeline completa do dia (06:00–22:00) com o evento (se houver) cobrindo cada horário. */
export const getSlotsForDate = (
  dateISO: string,
  trainerId: string = DEFAULT_TRAINER_ID,
  durationMinutes = 60
): ScheduleSlot[] => {
  const events = getEventsForDate(dateISO, trainerId);

  const now = new Date();
  const today = todayISO();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: ScheduleSlot[] = [];
  let cursor = toMinutes(DAY_TIMELINE_START);
  const end = toMinutes(DAY_TIMELINE_END);

  while (cursor + durationMinutes <= end) {
    const start = minutesToTime(cursor);
    const slotEndMinutes = cursor + durationMinutes;
    const slotEnd = minutesToTime(slotEndMinutes);

    const event = pickEvent(events, start, slotEnd);
    const isPast = dateISO < today || (dateISO === today && slotEndMinutes <= nowMinutes);

    slots.push({ start, end: slotEnd, status: event?.type ?? "available", event, isPast });
    cursor += durationMinutes;
  }

  return slots;
};

/** Slots livres (sem nenhum evento) — usado no fluxo do aluno para solicitar horário. */
export const getAvailableSlots = (
  dateISO: string,
  durationMinutes = 60,
  trainerId: string = DEFAULT_TRAINER_ID
): { start: string; end: string }[] =>
  getSlotsForDate(dateISO, trainerId, durationMinutes)
    .filter((s) => s.status === "available" && !s.isPast)
    .map((s) => ({ start: s.start, end: s.end }));

export const getAvailableSlotsCount = (days: number, durationMinutes = 60, trainerId: string = DEFAULT_TRAINER_ID): number => {
  let total = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    total += getAvailableSlots(date.toISOString().slice(0, 10), durationMinutes, trainerId).length;
  }
  return total;
};

// ---------- CRUD de eventos ----------

export const getScheduleEvents = (trainerId: string = DEFAULT_TRAINER_ID): ScheduleEvent[] =>
  getData().events.filter((e) => e.trainerId === trainerId);

export const createScheduleEvent = (
  input: ScheduleEventInput,
  trainerId: string = DEFAULT_TRAINER_ID
): ScheduleEvent => {
  const data = getData();
  const event: ScheduleEvent = { ...input, id: crypto.randomUUID(), trainerId, createdAt: new Date().toISOString() };
  data.events = [...data.events, event];
  persist(data);
  return event;
};

/** Atualiza um evento respeitando o escopo (esta ocorrência / esta e as próximas / série inteira). */
export const updateScheduleEvent = (
  eventId: string,
  occurrenceDate: string,
  scope: EditScope,
  patch: ScheduleEventInput
): void => {
  const data = getData();
  const original = data.events.find((e) => e.id === eventId);
  if (!original) return;

  if (original.recurrence === "once" || scope === "all") {
    data.events = data.events.map((e) => (e.id === eventId ? { ...e, ...patch, id: e.id, trainerId: e.trainerId, createdAt: e.createdAt } : e));
    persist(data);
    return;
  }

  if (scope === "this") {
    data.events = data.events.map((e) =>
      e.id === eventId ? { ...e, excludedDates: [...(e.excludedDates ?? []), occurrenceDate] } : e
    );
    data.events.push({
      ...patch,
      recurrence: "once",
      date: occurrenceDate,
      startDate: occurrenceDate,
      endDate: occurrenceDate,
      id: crypto.randomUUID(),
      trainerId: original.trainerId,
      createdAt: new Date().toISOString(),
    });
    persist(data);
    return;
  }

  // scope === "following"
  if (occurrenceDate <= original.startDate) {
    // Não há "antes" — a série inteira vira a nova configuração.
    data.events = data.events.map((e) =>
      e.id === eventId ? { ...e, ...patch, id: e.id, trainerId: e.trainerId, createdAt: e.createdAt } : e
    );
    persist(data);
    return;
  }

  data.events = data.events.map((e) => (e.id === eventId ? { ...e, endDate: addDaysISO(occurrenceDate, -1) } : e));
  data.events.push({
    ...patch,
    recurrence: "weekly",
    startDate: occurrenceDate,
    id: crypto.randomUUID(),
    trainerId: original.trainerId,
    createdAt: new Date().toISOString(),
  });
  persist(data);
};

/** Cancela/exclui um evento respeitando o escopo. */
export const deleteScheduleEvent = (eventId: string, occurrenceDate: string, scope: EditScope): void => {
  const data = getData();
  const original = data.events.find((e) => e.id === eventId);
  if (!original) return;

  // Se o evento tinha uma reserva de aluno vinculada, cancela também para manter em sincronia.
  if (original.bookingId) {
    data.bookings = data.bookings.filter((b) => b.id !== original.bookingId);
  }

  if (original.recurrence === "once" || scope === "all") {
    data.events = data.events.filter((e) => e.id !== eventId);
    persist(data);
    return;
  }

  if (scope === "this") {
    data.events = data.events.map((e) =>
      e.id === eventId ? { ...e, excludedDates: [...(e.excludedDates ?? []), occurrenceDate] } : e
    );
    persist(data);
    return;
  }

  // scope === "following"
  if (occurrenceDate <= original.startDate) {
    data.events = data.events.filter((e) => e.id !== eventId);
  } else {
    data.events = data.events.map((e) => (e.id === eventId ? { ...e, endDate: addDaysISO(occurrenceDate, -1) } : e));
  }
  persist(data);
};

/**
 * Aulas pontuais (concretas) que ficaram "cobertas" por um bloqueio no mesmo
 * horário — inconsistência a resolver manualmente pelo profissional.
 */
export const getScheduleConflicts = (trainerId: string = DEFAULT_TRAINER_ID): AvailabilityConflict[] => {
  const data = getData();
  const aulaOnceEvents = data.events.filter((e) => e.trainerId === trainerId && e.type === "aula" && e.recurrence === "once" && e.date);

  const conflicts: AvailabilityConflict[] = [];
  for (const aula of aulaOnceEvents) {
    const dayEvents = getEventsForDate(aula.date as string, trainerId).filter((e) => e.id !== aula.id);
    const blocking = dayEvents.find((e) => e.type === "bloqueado" && overlaps(aula.startTime, aula.endTime, e.startTime, e.endTime));
    if (blocking) {
      conflicts.push({
        eventId: aula.id,
        date: aula.date as string,
        startTime: aula.startTime,
        endTime: aula.endTime,
        title: eventTitle(aula),
      });
    }
  }
  return conflicts.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
};

// ---------- Propostas / agendamentos do fluxo do aluno ----------

export const createProposal = (
  trainerId: string,
  clientId: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string
): Booking => {
  const data = getData();
  const booking: Booking = {
    id: crypto.randomUUID(),
    trainerId,
    clientId,
    clientName,
    date,
    startTime,
    endTime,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  data.bookings = [booking, ...data.bookings];
  persist(data);
  return booking;
};

export const respondProposal = (
  bookingId: string,
  action: "accept" | "reject" | "suggest",
  suggestion?: { date: string; startTime: string; endTime: string }
): Booking[] => {
  const data = getData();
  data.bookings = data.bookings.map((b) => {
    if (b.id !== bookingId) return b;
    if (action === "accept") return { ...b, status: "confirmed" as const };
    if (action === "reject") return { ...b, status: "rejected" as const };
    return { ...b, status: "suggested" as const, suggestion };
  });
  persist(data);

  if (action === "accept") {
    const booking = data.bookings.find((b) => b.id === bookingId);
    if (booking) {
      data.events = [
        ...data.events,
        {
          id: crypto.randomUUID(),
          trainerId: booking.trainerId,
          type: "aula",
          studentNames: [booking.clientName],
          recurrence: "once",
          date: booking.date,
          startDate: booking.date,
          endDate: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          bookingId: booking.id,
          createdAt: new Date().toISOString(),
        },
      ];
      persist(data);
    }
  }

  return data.bookings;
};

export const acceptSuggestion = (bookingId: string): Booking[] => {
  const data = getData();
  data.bookings = data.bookings.map((b) => {
    if (b.id !== bookingId || !b.suggestion) return b;
    return {
      ...b,
      date: b.suggestion.date,
      startTime: b.suggestion.startTime,
      endTime: b.suggestion.endTime,
      status: "confirmed" as const,
      suggestion: undefined,
    };
  });
  persist(data);
  return data.bookings;
};

/** Cancela uma aula confirmada (fora do fluxo de eventos) — o horário volta a ficar disponível. */
export const cancelBooking = (bookingId: string): void => {
  const data = getData();
  data.bookings = data.bookings.filter((b) => b.id !== bookingId);
  data.events = data.events.filter((e) => e.bookingId !== bookingId);
  persist(data);
};

export const getBookingsForTrainer = (trainerId: string): Booking[] =>
  getData().bookings.filter((b) => b.trainerId === trainerId);

export const getBookingsForClient = (clientId: string): Booking[] =>
  getData().bookings.filter((b) => b.clientId === clientId);

/** Nomes de alunos já conhecidos (com base no histórico de solicitações) — placeholder até termos vínculo real aluno/profissional. */
export const getKnownStudentNames = (trainerId: string = DEFAULT_TRAINER_ID): string[] => {
  const data = getData();
  const names = new Set<string>();
  data.bookings.filter((b) => b.trainerId === trainerId).forEach((b) => names.add(b.clientName));
  data.events
    .filter((e) => e.trainerId === trainerId && e.type === "aula")
    .forEach((e) => e.studentNames?.forEach((n) => names.add(n)));
  return Array.from(names).sort();
};
