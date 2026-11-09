import { LinkedStudent, ScheduleEvent, toLocalISO } from "@/lib/agendaStore";
import { Plan, SlotInfo, fetchPlansForTrainer, fetchSlotsForPlans } from "@/lib/planStore";
import { PlanChanges, fetchPlanChanges, occurrencesOn } from "@/lib/planChanges";

/** Duração padrão de um treino acompanhado na agenda. */
export const ACCOMPANIED_MINUTES = 60;

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};

type PlanSlot = SlotInfo & { planId: string; studentId: string };

/**
 * Transforma os treinos acompanhados dos planos em eventos da agenda (um por dia, "somente leitura").
 * Respeita o que o aluno ajustou para um dia específico (planned_slots) e ignora treinos sem horário.
 */
export const buildAccompaniedEvents = (
  trainerId: string,
  plans: Plan[],
  slots: PlanSlot[],
  studentNames: Map<string, string>,
  fromISO: string,
  days: number,
  changes?: PlanChanges
): ScheduleEvent[] => {
  const slotByKey = new Map(slots.map((s) => [`${s.planId}|${s.workoutId}|${s.date}`, s]));
  const events: ScheduleEvent[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(fromISO, i);
    for (const plan of plans) {
      for (const workout of occurrencesOn(plan, date, changes)) {
        const slot = slotByKey.get(`${plan.id}|${workout.id}|${date}`);
        const accompanied = slot ? slot.accompanied : workout.accompanied;
        const start = slot ? slot.startTime ?? workout.startTime : workout.startTime;
        if (!accompanied || !start) continue;
        const end = fromMin(Math.min(23 * 60 + 59, toMin(start) + ACCOMPANIED_MINUTES));
        events.push({
          id: `plan:${plan.id}:${workout.id}:${date}`,
          trainerId,
          type: "aula",
          studentIds: [plan.studentId],
          studentNames: [studentNames.get(plan.studentId) ?? "Aluno"],
          recurrence: "once",
          date,
          startDate: date,
          endDate: date,
          excludedDates: [],
          startTime: start,
          endTime: end,
          publicVisible: false,
          fromPlan: { studentId: plan.studentId, planId: plan.id, workoutName: workout.name },
        });
      }
    }
  }
  return events;
};

/** Treinos acompanhados dos alunos do profissional nos próximos dias, como eventos da agenda. */
export const fetchAccompaniedEvents = async (trainerId: string, students: LinkedStudent[], days = 45): Promise<ScheduleEvent[]> => {
  const plans = await fetchPlansForTrainer(trainerId);
  if (plans.length === 0) return [];
  const today = toLocalISO(new Date());
  const to = addDaysISO(today, days);
  const planIds = plans.map((p) => p.id);
  const [slots, changes] = await Promise.all([fetchSlotsForPlans(planIds, today, to), fetchPlanChanges(planIds, today, to)]);
  return buildAccompaniedEvents(trainerId, plans, slots, new Map(students.map((s) => [s.studentId, s.name])), today, days, changes);
};
