// Store local (localStorage) de disponibilidade e agendamentos.
// Simula o cruzamento de agenda cliente <-> profissional até termos
// um backend real: regras de disponibilidade (pontuais e recorrentes),
// horários bloqueados manualmente, e propostas de aula com aceite/
// recusa/sugestão.

export type RecurrenceType = "once" | "weekly";

export interface AvailabilityRule {
  id: string;
  trainerId: string;
  recurrence: RecurrenceType;
  /** yyyy-mm-dd — usado quando recurrence === "once". */
  date?: string;
  /** 0 = domingo .. 6 = sábado — usado quando recurrence === "weekly". */
  weekdays?: number[];
  /** yyyy-mm-dd — a partir de quando a regra recorrente passa a valer. */
  startDate: string;
  /** yyyy-mm-dd ou null (nunca termina) — usado quando recurrence === "weekly". */
  endDate: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface BlockedSlot {
  id: string;
  trainerId: string;
  date: string; // yyyy-mm-dd
  startTime: string;
  endTime: string;
  reason?: string;
}

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
  bookingId: string;
  date: string;
  startTime: string;
  endTime: string;
  clientName: string;
}

interface AgendaData {
  availabilityRules: AvailabilityRule[];
  blockedSlots: BlockedSlot[];
  bookings: Booking[];
}

const STORAGE_KEY = "fit_agenda";
const DEFAULT_TRAINER_ID = "trainer-1";

/** Janela do dia considerada na timeline (fora dela os horários não aparecem). */
export const DAY_TIMELINE_START = "06:00";
export const DAY_TIMELINE_END = "22:00";

const seedRules = (trainerId: string): AvailabilityRule[] => {
  const createdAt = new Date().toISOString();
  const base = { trainerId, recurrence: "weekly" as const, startDate: "2020-01-01", endDate: null, createdAt };
  return [
    { id: "seed-1", ...base, weekdays: [1, 2, 3, 4], startTime: "08:00", endTime: "12:00" },
    { id: "seed-2", ...base, weekdays: [1, 2, 3, 4], startTime: "14:00", endTime: "19:00" },
    { id: "seed-3", ...base, weekdays: [5], startTime: "08:00", endTime: "12:00" },
  ];
};

const defaultData = (): AgendaData => ({
  availabilityRules: seedRules(DEFAULT_TRAINER_ID),
  blockedSlots: [],
  bookings: [],
});

const getData = (): AgendaData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData();
  try {
    const parsed = JSON.parse(raw) as Partial<AgendaData>;
    return {
      availabilityRules: parsed.availabilityRules ?? seedRules(DEFAULT_TRAINER_ID),
      blockedSlots: parsed.blockedSlots ?? [],
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

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);

const contains = (windowStart: string, windowEnd: string, start: string, end: string) =>
  toMinutes(windowStart) <= toMinutes(start) && toMinutes(end) <= toMinutes(windowEnd);

/** Janelas de expediente (definidas pelas regras) que valem para uma data específica. */
export const getWindowsForDate = (
  dateISO: string,
  trainerId: string = DEFAULT_TRAINER_ID
): { start: string; end: string; ruleId: string }[] => {
  const data = getData();
  const dayOfWeek = new Date(`${dateISO}T00:00:00`).getDay();

  return data.availabilityRules
    .filter((rule) => rule.trainerId === trainerId)
    .filter((rule) => {
      if (rule.recurrence === "once") return rule.date === dateISO;
      const afterStart = dateISO >= rule.startDate;
      const beforeEnd = rule.endDate === null || dateISO <= rule.endDate;
      return afterStart && beforeEnd && (rule.weekdays ?? []).includes(dayOfWeek);
    })
    .map((rule) => ({ start: rule.startTime, end: rule.endTime, ruleId: rule.id }));
};

/** Gera slots de 1h dentro das janelas de disponibilidade de um dia, removendo bloqueios e reservas confirmadas. */
export const getAvailableSlots = (
  dateISO: string,
  durationMinutes = 60,
  trainerId: string = DEFAULT_TRAINER_ID
): { start: string; end: string }[] => {
  const data = getData();
  const windows = getWindowsForDate(dateISO, trainerId);

  const takenRanges = [
    ...data.blockedSlots.filter((b) => b.date === dateISO && b.trainerId === trainerId).map((b) => ({ start: b.startTime, end: b.endTime })),
    ...data.bookings
      .filter((b) => b.date === dateISO && b.trainerId === trainerId && b.status === "confirmed")
      .map((b) => ({ start: b.startTime, end: b.endTime })),
  ];

  const slots: { start: string; end: string }[] = [];
  for (const window of windows) {
    let cursor = toMinutes(window.start);
    const windowEnd = toMinutes(window.end);
    while (cursor + durationMinutes <= windowEnd) {
      const start = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
      const endMinutes = cursor + durationMinutes;
      const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      const isTaken = takenRanges.some((r) => overlaps(start, end, r.start, r.end));
      if (!isTaken) slots.push({ start, end });
      cursor += durationMinutes;
    }
  }
  return slots;
};

export type ScheduleSlotStatus = "available" | "booked" | "blocked" | "outside" | "past";

export interface ScheduleSlot {
  start: string;
  end: string;
  status: ScheduleSlotStatus;
  booking?: Booking;
  blockedId?: string;
}

/**
 * Timeline completa do dia (06:00–22:00), com o status de cada horário:
 * disponível, agendado, bloqueado, fora do expediente definido ou já passado.
 */
export const getSlotsForDate = (
  dateISO: string,
  trainerId: string = DEFAULT_TRAINER_ID,
  durationMinutes = 60
): ScheduleSlot[] => {
  const data = getData();
  const windows = getWindowsForDate(dateISO, trainerId);
  const blocked = data.blockedSlots.filter((b) => b.date === dateISO && b.trainerId === trainerId);
  const bookings = data.bookings.filter((b) => b.date === dateISO && b.trainerId === trainerId && b.status === "confirmed");

  const now = new Date();
  const isToday = dateISO === now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: ScheduleSlot[] = [];
  let cursor = toMinutes(DAY_TIMELINE_START);
  const end = toMinutes(DAY_TIMELINE_END);

  while (cursor + durationMinutes <= end) {
    const start = `${String(Math.floor(cursor / 60)).padStart(2, "0")}:${String(cursor % 60).padStart(2, "0")}`;
    const slotEndMinutes = cursor + durationMinutes;
    const slotEnd = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, "0")}:${String(slotEndMinutes % 60).padStart(2, "0")}`;

    const booking = bookings.find((b) => overlaps(start, slotEnd, b.startTime, b.endTime));
    const blockedSlot = blocked.find((b) => overlaps(start, slotEnd, b.startTime, b.endTime));
    const insideWindow = windows.some((w) => contains(w.start, w.end, start, slotEnd));

    let status: ScheduleSlotStatus;
    if (booking) status = "booked";
    else if (blockedSlot) status = "blocked";
    else if (!insideWindow) status = "outside";
    else if (isToday && slotEndMinutes <= nowMinutes) status = "past";
    else status = "available";

    slots.push({ start, end: slotEnd, status, booking, blockedId: blockedSlot?.id });
    cursor += durationMinutes;
  }

  return slots;
};

// ---------- Regras de disponibilidade ----------

export const getAvailabilityRules = (trainerId: string = DEFAULT_TRAINER_ID): AvailabilityRule[] =>
  getData().availabilityRules.filter((r) => r.trainerId === trainerId);

export type AvailabilityRuleInput = Omit<AvailabilityRule, "id" | "trainerId" | "createdAt">;

export const addAvailabilityRule = (
  input: AvailabilityRuleInput,
  trainerId: string = DEFAULT_TRAINER_ID
): AvailabilityRule => {
  const data = getData();
  const rule: AvailabilityRule = {
    ...input,
    id: crypto.randomUUID(),
    trainerId,
    createdAt: new Date().toISOString(),
  };
  data.availabilityRules = [...data.availabilityRules, rule];
  persist(data);
  return rule;
};

export const deleteAvailabilityRule = (ruleId: string): void => {
  const data = getData();
  data.availabilityRules = data.availabilityRules.filter((r) => r.id !== ruleId);
  persist(data);
};

/**
 * Compara os agendamentos confirmados com o expediente atual e retorna
 * quais deles ficaram "fora" das janelas de disponibilidade — ou seja,
 * uma inconsistência gerada por alguma alteração no expediente que
 * precisa ser resolvida manualmente pelo profissional.
 */
export const getScheduleConflicts = (trainerId: string = DEFAULT_TRAINER_ID): AvailabilityConflict[] => {
  const data = getData();
  const confirmed = data.bookings.filter((b) => b.trainerId === trainerId && b.status === "confirmed");

  const conflicts: AvailabilityConflict[] = [];
  for (const booking of confirmed) {
    const windows = getWindowsForDate(booking.date, trainerId);
    const covered = windows.some((w) => contains(w.start, w.end, booking.startTime, booking.endTime));
    if (!covered) {
      conflicts.push({
        bookingId: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        clientName: booking.clientName,
      });
    }
  }
  return conflicts.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
};

// ---------- Bloqueios manuais ----------

/** Bloqueia ou desbloqueia um horário pontual. Recusa se já houver aluno agendado. */
export const toggleBlockedSlot = (
  dateISO: string,
  startTime: string,
  endTime: string,
  trainerId: string = DEFAULT_TRAINER_ID
): { ok: boolean; reason?: "booked" } => {
  const data = getData();
  const hasBooking = data.bookings.some(
    (b) => b.trainerId === trainerId && b.date === dateISO && b.status === "confirmed" && overlaps(startTime, endTime, b.startTime, b.endTime)
  );
  if (hasBooking) return { ok: false, reason: "booked" };

  const existing = data.blockedSlots.find(
    (b) => b.trainerId === trainerId && b.date === dateISO && overlaps(startTime, endTime, b.startTime, b.endTime)
  );

  if (existing) {
    data.blockedSlots = data.blockedSlots.filter((b) => b.id !== existing.id);
  } else {
    data.blockedSlots = [
      ...data.blockedSlots,
      { id: crypto.randomUUID(), trainerId, date: dateISO, startTime, endTime },
    ];
  }
  persist(data);
  return { ok: true };
};

// ---------- Propostas / agendamentos ----------

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

/** Cancela uma aula confirmada — o horário volta a aparecer como disponível. */
export const cancelBooking = (bookingId: string): void => {
  const data = getData();
  data.bookings = data.bookings.filter((b) => b.id !== bookingId);
  persist(data);
};

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Soma os horários livres entre hoje e `days` dias à frente (inclusive).
 * Considera apenas disponibilidade já marcada pelo profissional, menos
 * bloqueios e aulas confirmadas — nunca assume 100% de ocupação.
 */
export const getAvailableSlotsCount = (days: number, durationMinutes = 60): number => {
  let total = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    total += getAvailableSlots(toISODate(date), durationMinutes).length;
  }
  return total;
};

export const getBookingsForTrainer = (trainerId: string): Booking[] =>
  getData().bookings.filter((b) => b.trainerId === trainerId);

export const getBookingsForClient = (clientId: string): Booking[] =>
  getData().bookings.filter((b) => b.clientId === clientId);
