// XP, Foco, ligas e medalhas. Toda a regra mora no banco (gm_overview, league_overview etc.);
// aqui só lemos o resultado e chamamos as RPCs. Tabelas/funções novas ainda não estão nos tipos gerados.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export const LEAGUE_NAMES = ["Estreante", "Amador", "Praticante", "Competidor", "Atleta", "Veterano", "Mestre", "Campeão", "Elite", "Lenda"];
export const leagueName = (league: number) => LEAGUE_NAMES[Math.min(Math.max(league, 1), 10) - 1];

export interface FocoGoal {
  id: string;
  days: number;
  xp: number;
  menu: number;
}

export interface FocoOption {
  days: number;
  xp: number;
}

export type GoalStatus = "first" | "active" | "conquered" | "broken";

export interface FocoState {
  active: boolean;
  days: number;
  started_on: string | null;
  last_workout_on: string | null;
  faults: number;
  idle_days: number;
  perfect_streak: number;
  offered_menu: number;
  goal: FocoGoal | null;
  options: FocoOption[];
  goal_status: GoalStatus;
}

export interface GmOverview {
  xp_total: number;
  xp_month: number;
  xp_by_sport: { sport: string; xp: number }[];
  workouts_total: number;
  unseen_medals: number;
  foco: FocoState;
  week: { start: string; planned: number; done: number; late: number };
}

export type Zone = "up" | "stay" | "down";

export interface LeagueMember {
  position: number;
  xp: number;
  is_me: boolean;
  name: string;
  avatar: string | null;
  zone: Zone;
}

export interface LeagueResult {
  month: string;
  league: number;
  position: number | null;
  outcome: "promoted" | "stayed" | "relegated" | "inactive";
  new_league: number;
  xp: number;
}

export interface LeagueOverview {
  joined: boolean;
  in_group?: boolean;
  league: number;
  month: string;
  days_left: number;
  group_size?: number;
  is_open?: boolean;
  up_slots?: number;
  down_slots?: number;
  my_position?: number;
  my_xp?: number;
  xp_to_promotion?: number | null;
  xp_to_safety?: number | null;
  members?: LeagueMember[];
  last_result?: LeagueResult | null;
}

export interface SportRankingItem {
  position: number;
  xp: number;
  is_me: boolean;
  name: string;
  avatar: string | null;
}

export interface SportRanking {
  items: SportRankingItem[];
  me: { position: number; xp: number } | null;
  public: boolean;
}

export interface UserMedal {
  medalKey: string;
  achievedOn: string;
  meta: Record<string, unknown>;
  seen: boolean;
}

export const fetchGmOverview = async (): Promise<GmOverview | null> => {
  const { data, error } = await db.rpc("gm_overview");
  if (error) throw error;
  const o = data as Partial<GmOverview> | null;
  return o && o.foco ? (o as GmOverview) : null;
};

export const syncGamification = async () => {
  const { error } = await db.rpc("gm_sync_me");
  if (error) throw error;
};

export const chooseFocoGoal = async (days: number) => {
  const { error } = await db.rpc("choose_foco_goal", { p_days: days });
  if (error) throw error;
};

export const fetchLeagueOverview = async (): Promise<LeagueOverview> => {
  const { data, error } = await db.rpc("league_overview");
  if (error) throw error;
  return data as LeagueOverview;
};

export const fetchSportRanking = async (sport: string, period: "month" | "all"): Promise<SportRanking> => {
  const { data, error } = await db.rpc("sport_ranking", { p_sport: sport, p_period: period });
  if (error) throw error;
  return data as SportRanking;
};

export const setRankingPublic = async (value: boolean) => {
  const { error } = await db.rpc("set_ranking_public", { p_public: value });
  if (error) throw error;
};

export const fetchRankingPublic = async (userId: string): Promise<boolean> => {
  const { data } = await db.from("gm_settings").select("ranking_public").eq("user_id", userId).maybeSingle();
  return !!data?.ranking_public;
};

export const fetchMedals = async (userId: string): Promise<UserMedal[]> => {
  const { data, error } = await db
    .from("user_medals")
    .select("medal_key, achieved_on, meta, seen_at")
    .eq("user_id", userId)
    .order("achieved_on", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as { medal_key: string; achieved_on: string; meta: Record<string, unknown>; seen_at: string | null }[]).map((m) => ({
    medalKey: m.medal_key,
    achievedOn: m.achieved_on,
    meta: m.meta ?? {},
    seen: !!m.seen_at,
  }));
};

export const markMedalsSeen = async () => {
  const { error } = await db.rpc("mark_medals_seen");
  if (error) throw error;
};

/** Texto do menu de metas conforme a situação (nunca soa como castigo). */
export const goalMenuTitle = (foco: FocoState, todayISO: string): string => {
  const daysAway = foco.last_workout_on
    ? Math.round((new Date(`${todayISO}T00:00:00`).getTime() - new Date(`${foco.last_workout_on}T00:00:00`).getTime()) / 86400000)
    : 0;
  if (foco.goal_status === "conquered") return "Meta conquistada! Qual é a próxima?";
  if (foco.goal_status === "broken" && daysAway >= 14) return "Que bom ter você de volta! Escolha sua meta";
  if (foco.goal_status === "broken") return "Bora de novo! Escolha sua próxima meta";
  if (daysAway >= 14) return "Que bom ter você de volta! Escolha sua meta";
  return "Escolha a meta do seu Foco";
};

export interface StudentAdherence {
  student_id: string;
  name: string;
  tracking: boolean;
  foco_days: number;
  has_plan: boolean;
  week_planned: number;
  week_done: number;
  week_late: number;
}

/** Painel de adesão do profissional: Foco e treinos da semana dos alunos vinculados (planos criados por ele). */
export const fetchTrainerAdherence = async (): Promise<StudentAdherence[]> => {
  const { data, error } = await db.rpc("trainer_adherence");
  if (error) throw error;
  return (data ?? []) as StudentAdherence[];
};

export interface ConqueredGoal {
  id: string;
  days: number;
  xp: number;
  endedOn: string;
}

/** Meta de Foco mais recentemente conquistada (para comemorar uma vez). */
export const fetchLastConqueredGoal = async (userId: string): Promise<ConqueredGoal | null> => {
  const { data } = await db
    .from("foco_goals")
    .select("id, days, xp, ended_on")
    .eq("user_id", userId)
    .eq("status", "conquered")
    .order("ended_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, days: data.days, xp: data.xp, endedOn: data.ended_on } : null;
};
