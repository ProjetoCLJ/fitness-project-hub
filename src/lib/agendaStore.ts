// Store local (localStorage) de disponibilidade e agendamentos.
// Simula o cruzamento de agenda cliente <-> profissional até termos
// um backend real: disponibilidade do profissional, horários
// bloqueados, e propostas de aula com aceite/recusa/sugestão.

export interface WeeklyAvailability {
  [dayOfWeek: number]: { start: string; end: string }[]; // 0 = domingo
}

export interface BlockedSlot {
  id: string;
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
  suggestion?: { date: string; startTime: string; endTime: string };
  createdAt: string;
}

interface AgendaData {
  availability: WeeklyAvailability;
  blockedSlots: BlockedSlot[];
  bookings: Booking[];
}

const STORAGE_KEY = "fit_agenda";

const defaultAvailability: WeeklyAvailability = {
  1: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "19:00" }], // segunda
  2: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "19:00" }], // terça
  3: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "19:00" }], // quarta
  4: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "19:00" }], // quinta
  5: [{ start: "08:00", end: "12:00" }], // sexta
};

const defaultData = (): AgendaData => ({
  availability: defaultAvailability,
  blockedSlots: [],
  bookings: [],
});

const getData = (): AgendaData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData();
  try {
    return JSON.parse(raw) as AgendaData;
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

/** Gera slots de 1h dentro das janelas de disponibilidade de um dia, removendo bloqueios e reservas confirmadas. */
export const getAvailableSlots = (dateISO: string, durationMinutes = 60): { start: string; end: string }[] => {
  const data = getData();
  const dayOfWeek = new Date(`${dateISO}T00:00:00`).getDay();
  const windows = data.availability[dayOfWeek] || [];

  const takenRanges = [
    ...data.blockedSlots.filter((b) => b.date === dateISO).map((b) => ({ start: b.startTime, end: b.endTime })),
    ...data.bookings
      .filter((b) => b.date === dateISO && b.status === "confirmed")
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
