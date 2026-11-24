import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ScheduleEvent, toLocalISO } from "@/lib/agendaStore";

// Treinos que o profissional conduziu com o aluno (iniciados por ele, mesmo fora da rotina combinada).
// Cada um guarda o horário real de início e fim: aparecem sozinhos na agenda e entram nas contas do financeiro.

const db = supabase as unknown as SupabaseClient;

export interface LedExecution {
  id: string;
  studentId: string;
  studentName: string;
  workoutId: string | null;
  workoutName: string;
  /** Dia (AAAA-MM-DD) em que o treino terminou. */
  date: string;
  /** Início e fim no horário do aparelho (HH:MM). */
  start: string;
  end: string;
  minutes: number;
}

type Row = {
  id: string;
  student_id: string;
  workout_id: string | null;
  workout_name: string | null;
  date: string;
  started_at: string | null;
  finished_at: string | null;
  duration_minutes: number | null;
  student_profiles?: { profiles?: { full_name?: string } | null } | null;
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const toLedExecution = (r: Row): LedExecution | null => {
  if (!r.started_at || !r.finished_at) return null;
  const start = new Date(r.started_at);
  const end = new Date(r.finished_at);
  if (!(end > start)) return null;
  const minutes = r.duration_minutes ?? Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_profiles?.profiles?.full_name ?? "Aluno",
    workoutId: r.workout_id,
    workoutName: r.workout_name ?? "Treino",
    date: toLocalISO(end),
    start: hhmm(start),
    // Treino que atravessou a meia-noite termina às 23:59 no dia em que acabou.
    end: toLocalISO(start) === toLocalISO(end) ? hhmm(end) : "23:59",
    minutes,
  };
};

/** Treinos conduzidos pelo profissional entre duas datas (o banco só devolve os dos alunos dele). */
export const fetchLedExecutions = async (fromISO: string, toISO: string): Promise<LedExecution[]> => {
  const { data, error } = await db
    .from("workout_executions")
    .select("id, student_id, workout_id, workout_name, date, started_at, finished_at, duration_minutes, student_profiles(profiles(full_name))")
    .eq("recorded_by_trainer", true)
    .gte("date", fromISO)
    .lte("date", toISO)
    .order("started_at", { ascending: true });
  if (error) return [];
  return ((data ?? []) as unknown as Row[]).map(toLedExecution).filter((x): x is LedExecution => !!x);
};

/** Um treino conduzido vira um bloco na agenda, no horário em que realmente aconteceu. */
export const ledExecutionEvent = (trainerId: string, x: LedExecution): ScheduleEvent => ({
  id: `exec:${x.id}`,
  trainerId,
  type: "aula",
  studentIds: [x.studentId],
  studentNames: [x.studentName],
  recurrence: "once",
  date: x.date,
  startDate: x.date,
  endDate: x.date,
  excludedDates: [],
  startTime: x.start,
  endTime: x.end,
  publicVisible: false,
  fromExecution: { executionId: x.id, studentId: x.studentId, workoutId: x.workoutId, workoutName: x.workoutName, minutes: x.minutes },
});

const addDaysISO = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};

/** Treinos conduzidos nos últimos dias (e hoje), como eventos da agenda. */
export const fetchLedEvents = async (trainerId: string, daysBack = 60): Promise<ScheduleEvent[]> => {
  const today = toLocalISO(new Date());
  const list = await fetchLedExecutions(addDaysISO(today, -daysBack), today);
  return list.map((x) => ledExecutionEvent(trainerId, x));
};

/** Tira da lista os treinos planejados que já foram conduzidos (mesmo treino, mesmo dia): fica só o que aconteceu. */
export const withoutDoneDuplicates = (planned: ScheduleEvent[], led: ScheduleEvent[]): ScheduleEvent[] => {
  const done = new Set(led.filter((e) => e.fromExecution?.workoutId).map((e) => `${e.fromExecution!.workoutId}|${e.date}`));
  return planned.filter((e) => !(e.fromPlan && done.has(`${e.fromPlan.workoutId}|${e.date}`)));
};
