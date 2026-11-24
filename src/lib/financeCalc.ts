import { LinkedStudent, ScheduleEvent, getSlotsForDate, toLocalISO } from "@/lib/agendaStore";
import { supabase } from "@/integrations/supabase/client";

export const fetchBasePrice = async (trainerId: string): Promise<number> => {
  const { data } = await supabase.from("trainer_profiles").select("base_price").eq("id", trainerId).maybeSingle();
  return Number(data?.base_price ?? 0);
};

export interface MonthRevenue {
  aulaSlots: number;
  availableSlots: number;
  /** Aulas já agendadas no mês × valor da aula (preço do aluno, se houver, senão o padrão do profissional). */
  previsto: number;
  /** Horários vagos (dentro do expediente) que ainda restam no mês × valor padrão da aula. */
  possivel: number;
}

export const computeMonthRevenue = (
  events: ScheduleEvent[],
  students: LinkedStudent[],
  basePrice: number,
  reference: Date = new Date()
): MonthRevenue => {
  const priceByStudent = new Map(students.map((s) => [s.studentId, s.customPrice ?? basePrice]));
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();

  let aulaSlots = 0;
  let availableSlots = 0;
  let previsto = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = toLocalISO(new Date(reference.getFullYear(), reference.getMonth(), day));
    for (const slot of getSlotsForDate(events, dateISO)) {
      if (slot.status === "aula" && slot.event) {
        aulaSlots++;
        previsto += slot.event.studentIds.reduce((sum, id) => sum + (priceByStudent.get(id) ?? basePrice), 0);
      } else if (slot.status === "available" && !slot.isPast) {
        availableSlots++;
      }
    }
  }

  return { aulaSlots, availableSlots, previsto, possivel: availableSlots * basePrice };
};

export interface LedgerRow {
  studentId: string;
  studentName: string;
  /** Treinos que o profissional acompanhou no mês. */
  aulas: number;
  minutes: number;
  /** Valor das aulas dadas: preço da aula (por hora) × tempo real acompanhado. */
  devido: number;
  /** Pagamentos lançados para o aluno no mês. */
  recebido: number;
  /** recebido − devido: negativo = ainda a receber; positivo = crédito do aluno. */
  saldo: number;
}

export interface LedgerInput {
  executions: { studentId: string; studentName: string; date: string; minutes: number }[];
  payments: { studentId: string | null; amount: number; paymentDate: string }[];
  students: LinkedStudent[];
  basePrice: number;
  reference?: Date;
}

/** Conta do mês por aluno: aulas conduzidas pelo profissional × pagamentos lançados. */
export const computeLedger = ({ executions, payments, students, basePrice, reference = new Date() }: LedgerInput): LedgerRow[] => {
  const prefix = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
  const price = new Map(students.map((s) => [s.studentId, s.customPrice ?? basePrice]));
  const rows = new Map<string, LedgerRow>();
  const row = (id: string, name: string) => {
    let r = rows.get(id);
    if (!r) rows.set(id, (r = { studentId: id, studentName: name, aulas: 0, minutes: 0, devido: 0, recebido: 0, saldo: 0 }));
    return r;
  };
  for (const x of executions) {
    if (!x.date.startsWith(prefix)) continue;
    const r = row(x.studentId, x.studentName);
    r.aulas++;
    r.minutes += x.minutes;
    r.devido += ((price.get(x.studentId) ?? basePrice) * x.minutes) / 60;
  }
  for (const p of payments) {
    if (!p.studentId || !p.paymentDate.startsWith(prefix)) continue;
    const name = students.find((s) => s.studentId === p.studentId)?.name ?? "Aluno";
    row(p.studentId, name).recebido += p.amount;
  }
  const out = [...rows.values()].filter((r) => r.aulas > 0);
  out.forEach((r) => {
    r.devido = Math.round(r.devido * 100) / 100;
    r.saldo = Math.round((r.recebido - r.devido) * 100) / 100;
  });
  return out.sort((a, b) => a.saldo - b.saldo || a.studentName.localeCompare(b.studentName));
};
