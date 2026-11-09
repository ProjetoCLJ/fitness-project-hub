// Mudanças pontuais num plano: dias em que um treino foi movido ou cancelado (solicitação aceita).
// O plano continua o mesmo; só aquele dia muda.

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Plan, Workout, workoutsOnDate } from "@/lib/planStore";

const db = supabase as unknown as SupabaseClient;

export interface PlanMove {
  planId: string;
  workoutId: string;
  from: string | null;
  to: string;
  startTime: string | null;
}

export interface PlanChanges {
  /** "treinoId|AAAA-MM-DD": dias em que o treino NÃO acontece (movido ou cancelado). */
  skips: Set<string>;
  moves: PlanMove[];
}

export const NO_CHANGES: PlanChanges = { skips: new Set(), moves: [] };

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Mudanças dos planos informados numa janela de datas. Sem a migração 0018, devolve "sem mudanças". */
export const fetchPlanChanges = async (planIds: string[], fromISO: string, toISO: string): Promise<PlanChanges> => {
  if (planIds.length === 0) return NO_CHANGES;
  const [slots, exceptions] = await Promise.all([
    db
      .from("planned_slots")
      .select("plan_id, workout_id, planned_date, start_time, moved_from")
      .in("plan_id", planIds)
      .not("moved_from", "is", null)
      .gte("planned_date", fromISO)
      .lte("planned_date", toISO),
    db
      .from("slot_exceptions")
      .select("workout_id, date, workouts!inner(plan_id)")
      .in("workouts.plan_id", planIds)
      .gte("date", fromISO)
      .lte("date", toISO),
  ]);
  if (slots.error || exceptions.error) return NO_CHANGES;
  return {
    skips: new Set(((exceptions.data ?? []) as { workout_id: string; date: string }[]).map((e) => `${e.workout_id}|${e.date}`)),
    moves: ((slots.data ?? []) as { plan_id: string; workout_id: string | null; planned_date: string; start_time: string | null; moved_from: string | null }[])
      .filter((s) => s.workout_id)
      .map((s) => ({
        planId: s.plan_id,
        workoutId: s.workout_id as string,
        from: s.moved_from,
        to: s.planned_date,
        startTime: s.start_time ? s.start_time.slice(0, 5) : null,
      })),
  };
};

/** Treinos do plano em um dia, já com os dias movidos/cancelados aplicados. */
export const occurrencesOn = (plan: Plan, dateISO: string, changes?: PlanChanges): Workout[] => {
  const base = workoutsOnDate(plan, dateISO);
  if (!changes) return base;
  const kept = base.filter((w) => !changes.skips.has(`${w.id}|${dateISO}`));
  const moved = changes.moves
    .filter((m) => m.planId === plan.id && m.to === dateISO)
    .map((m) => plan.workouts.find((w) => w.id === m.workoutId))
    .filter((w): w is Workout => !!w && !kept.some((k) => k.id === w.id));
  return [...kept, ...moved];
};

/** Carrega as mudanças dos planos (janela larga em volta de hoje) para as telas que montam semanas. */
export const usePlanChanges = (plans: Plan[]): PlanChanges => {
  const key = plans.map((p) => p.id).sort().join(",");
  const [changes, setChanges] = useState<PlanChanges>(NO_CHANGES);
  useEffect(() => {
    if (!key) {
      setChanges(NO_CHANGES);
      return;
    }
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let alive = true;
    fetchPlanChanges(key.split(","), addDays(iso, -120), addDays(iso, 180))
      .then((c) => alive && setChanges(c))
      .catch(() => alive && setChanges(NO_CHANGES));
    return () => {
      alive = false;
    };
  }, [key]);
  return useMemo(() => changes, [changes]);
};
