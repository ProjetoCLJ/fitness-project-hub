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
