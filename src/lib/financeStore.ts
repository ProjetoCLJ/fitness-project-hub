// Ofertas (pacotes de aulas) e pagamentos lançados pelo professor.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Colunas/tabelas novas ainda não estão no arquivo de tipos gerado.
const db = supabase as unknown as SupabaseClient;

export type PaymentMethod = "pix" | "dinheiro" | "cartao" | "boleto";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
];

export const methodLabel = (m: PaymentMethod | null) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? "";

export const formatBRL = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------- Ofertas ----------

export interface Offer {
  id: string;
  name: string;
  classesCount: number;
  totalPrice: number;
  isActive: boolean;
}

type OfferRow = { id: string; name: string; classes_count: number; total_price: number | string; is_active: boolean };

const toOffer = (r: OfferRow): Offer => ({
  id: r.id,
  name: r.name,
  classesCount: r.classes_count,
  totalPrice: Number(r.total_price),
  isActive: r.is_active,
});

export const fetchOffers = async (trainerId: string): Promise<Offer[]> => {
  const { data, error } = await db.from("offers").select("*").eq("trainer_id", trainerId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OfferRow[]).map(toOffer);
};

export const createOffer = async (trainerId: string, input: { name: string; classesCount: number; totalPrice: number }): Promise<Offer> => {
  const { data, error } = await db
    .from("offers")
    .insert({ trainer_id: trainerId, name: input.name.trim(), classes_count: input.classesCount, total_price: input.totalPrice })
    .select("*")
    .single();
  if (error) throw error;
  return toOffer(data as OfferRow);
};

export const setOfferActive = async (id: string, active: boolean) => {
  const { error } = await db.from("offers").update({ is_active: active }).eq("id", id);
  if (error) throw error;
};

export const deleteOffer = async (id: string) => {
  const { error } = await db.from("offers").delete().eq("id", id);
  if (error) throw error;
};

// ---------- Pagamentos ----------

export interface Payment {
  id: string;
  trainerId: string;
  studentId: string | null;
  payerName: string;
  trainerName?: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod | null;
  offerId: string | null;
  offerName: string;
  notes: string;
}

export interface PaymentInput {
  studentId: string | null;
  payerName: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod | null;
  offerId: string | null;
  offerName: string;
  notes: string;
}

type PaymentRow = {
  id: string;
  trainer_id: string;
  student_id: string | null;
  payer_name: string | null;
  amount: number | string;
  payment_date: string;
  method: PaymentMethod | null;
  offer_id: string | null;
  offer_name: string | null;
  notes: string | null;
  student_profiles?: { profiles?: { full_name?: string } | null } | null;
  trainer_profiles?: { profiles?: { full_name?: string } | null } | null;
};

const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  trainerId: r.trainer_id,
  studentId: r.student_id,
  payerName: r.student_profiles?.profiles?.full_name ?? r.payer_name ?? "",
  trainerName: r.trainer_profiles?.profiles?.full_name,
  amount: Number(r.amount),
  paymentDate: r.payment_date,
  method: r.method,
  offerId: r.offer_id,
  offerName: r.offer_name ?? "",
  notes: r.notes ?? "",
});

const PAYMENT_SELECT = "*, student_profiles(profiles(full_name)), trainer_profiles(profiles(full_name))";

/** Pagamentos do professor (todos ou de um aluno), do mais recente para o mais antigo. */
export const fetchTrainerPayments = async (trainerId: string, studentId?: string): Promise<Payment[]> => {
  let query = db.from("payments").select(PAYMENT_SELECT).eq("trainer_id", trainerId);
  if (studentId) query = query.eq("student_id", studentId);
  const { data, error } = await query.order("payment_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as PaymentRow[]).map(toPayment);
};

/** Pagamentos que o aluno fez (o banco só devolve os dele). */
export const fetchStudentPayments = async (studentId: string): Promise<Payment[]> => {
  const { data, error } = await db
    .from("payments")
    .select(PAYMENT_SELECT)
    .eq("student_id", studentId)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return (data as PaymentRow[]).map(toPayment);
};

const toRow = (input: PaymentInput) => ({
  student_id: input.studentId,
  payer_name: input.studentId ? null : input.payerName.trim(),
  amount: input.amount,
  payment_date: input.paymentDate,
  method: input.method,
  offer_id: input.offerId,
  offer_name: input.offerName.trim() || null,
  notes: input.notes.trim() || null,
});

export const createPayment = async (trainerId: string, input: PaymentInput) => {
  const { error } = await db.from("payments").insert({ ...toRow(input), trainer_id: trainerId });
  if (error) throw error;
};

export const updatePayment = async (id: string, input: PaymentInput) => {
  const { error } = await db.from("payments").update(toRow(input)).eq("id", id);
  if (error) throw error;
};

export const deletePayment = async (id: string) => {
  const { error } = await db.from("payments").delete().eq("id", id);
  if (error) throw error;
};

/** Soma dos pagamentos do mês corrente (o "Realizado"). */
export const realizedThisMonth = (payments: Payment[], now = new Date()) => {
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return payments.filter((p) => p.paymentDate.startsWith(prefix)).reduce((sum, p) => sum + p.amount, 0);
};
