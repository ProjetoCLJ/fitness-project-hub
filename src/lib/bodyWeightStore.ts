import { supabase } from "@/integrations/supabase/client";

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export const fetchWeightEntries = async (studentId: string): Promise<WeightEntry[]> => {
  const { data, error } = await supabase
    .from("body_weight_entries")
    .select("id, date, weight")
    .eq("student_id", studentId)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, date: `${row.date}T12:00:00`, weight: Number(row.weight) }));
};

export const fetchWeightGoal = async (studentId: string): Promise<number | undefined> => {
  const { data, error } = await supabase.from("body_weight_goals").select("goal").eq("student_id", studentId).maybeSingle();
  if (error) throw error;
  return data ? Number(data.goal) : undefined;
};

/** Uma pesagem por dia: registrar de novo no mesmo dia atualiza o valor. */
export const addWeightEntry = async (studentId: string, weight: number): Promise<void> => {
  const { error } = await supabase
    .from("body_weight_entries")
    .upsert({ student_id: studentId, weight, date: new Date().toISOString().slice(0, 10) }, { onConflict: "student_id,date" });
  if (error) throw error;
};

export const setWeightGoal = async (studentId: string, goal: number): Promise<void> => {
  const { error } = await supabase.from("body_weight_goals").upsert({ student_id: studentId, goal }, { onConflict: "student_id" });
  if (error) throw error;
};
