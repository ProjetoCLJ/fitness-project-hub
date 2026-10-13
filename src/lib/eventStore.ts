// Eventos criados por professores (corrida em grupo, aula em conjunto etc.).
// Públicos aparecem em "Descobrir"; privados só para convidados (link ou seleção de alunos).

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/requestsStore";

// Tabelas novas ainda não estão no arquivo de tipos gerado.
const db = supabase as unknown as SupabaseClient;

export const STATES: { uf: string; name: string }[] = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" }, { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" }, { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" }, { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" }, { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" }, { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" }, { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" }, { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" }, { uf: "TO", name: "Tocantins" },
];

const cityCache = new Map<string, string[]>();

/** Cidades de um estado (API pública do IBGE). Em caso de falha devolve lista vazia — o usuário usa "Outro". */
export const fetchCities = async (uf: string): Promise<string[]> => {
  if (cityCache.has(uf)) return cityCache.get(uf)!;
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
    if (!res.ok) return [];
    const list = ((await res.json()) as { nome: string }[]).map((c) => c.nome);
    cityCache.set(uf, list);
    return list;
  } catch {
    return [];
  }
};

export interface EventItem {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  location: string;
  state: string;
  city: string;
  visibility: "public" | "private";
  startsAt: string;
  endsAt: string | null;
  maxParticipants: number | null;
  coverPath: string | null;
  coverUrl: string | null;
  status: "active" | "cancelled";
  inviteCode: string;
  inviteActive: boolean;
  createdAt: string;
  participantCount: number;
}

export interface EventInput {
  title: string;
  description: string;
  location: string;
  state: string;
  city: string;
  visibility: "public" | "private";
  startsAt: string;
  endsAt: string | null;
  maxParticipants: number | null;
  cover?: File | null;
  removeCover?: boolean;
}

export interface EventParticipant {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface EventPreview {
  id: string;
  title: string;
  description: string;
  location: string;
  state: string;
  city: string;
  visibility: "public" | "private";
  startsAt: string;
  endsAt: string | null;
  maxParticipants: number | null;
  status: "active" | "cancelled";
  creatorName: string;
  participantCount: number;
  isMember: boolean;
}

type EventRow = {
  id: string;
  creator_id: string;
  creator_name: string;
  title: string;
  description: string | null;
  location: string;
  state: string;
  city: string;
  visibility: "public" | "private";
  starts_at: string;
  ends_at: string | null;
  max_participants: number | null;
  cover_path: string | null;
  status: "active" | "cancelled";
  invite_code: string;
  invite_active: boolean;
  created_at: string;
};

/** O evento termina no horário de fim (ou no início, se não houver fim). */
export const eventEndTime = (e: Pick<EventItem, "startsAt" | "endsAt">) => new Date(e.endsAt ?? e.startsAt).getTime();
export const eventHasEnded = (e: Pick<EventItem, "startsAt" | "endsAt">) => eventEndTime(e) < Date.now();
export const eventIsFull = (e: Pick<EventItem, "maxParticipants" | "participantCount">) =>
  e.maxParticipants !== null && e.participantCount >= e.maxParticipants;

export const eventLink = (code: string) => `${window.location.origin}/evento/${code}`;

const EVENT_ERRORS: Record<string, string> = {
  EVENT_FULL: "Evento lotado.",
  EVENT_CANCELLED: "Este evento foi cancelado.",
  EVENT_ENDED: "Este evento já foi encerrado.",
  NO_ACCESS: "Você não tem acesso a este evento.",
  IS_CREATOR: "Você é o organizador deste evento.",
};

const toItems = async (rows: EventRow[]): Promise<EventItem[]> => {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const paths = rows.map((r) => r.cover_path).filter((p): p is string => !!p);

  const [countsRes, signedRes] = await Promise.all([
    db.rpc("get_event_counts", { p_event_ids: ids }),
    paths.length > 0 ? db.storage.from("event-covers").createSignedUrls(paths, 3600) : Promise.resolve({ data: [] }),
  ]);
  const counts = new Map<string, number>();
  ((countsRes.data ?? []) as { event_id: string; participant_count: number | string }[]).forEach((c) =>
    counts.set(c.event_id, Number(c.participant_count))
  );
  const signed = new Map<string, string>();
  ((signedRes.data ?? []) as { path: string | null; signedUrl: string }[]).forEach((u) => {
    if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  });

  return rows.map((r) => ({
    id: r.id,
    creatorId: r.creator_id,
    creatorName: r.creator_name,
    title: r.title,
    description: r.description ?? "",
    location: r.location,
    state: r.state,
    city: r.city,
    visibility: r.visibility,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    maxParticipants: r.max_participants,
    coverPath: r.cover_path,
    coverUrl: r.cover_path ? signed.get(r.cover_path) ?? null : null,
    status: r.status,
    inviteCode: r.invite_code,
    inviteActive: r.invite_active,
    createdAt: r.created_at,
    participantCount: counts.get(r.id) ?? 0,
  }));
};

/** Eventos públicos ainda não encerrados e não cancelados. */
export const fetchPublicEvents = async (): Promise<EventItem[]> => {
  const { data, error } = await db.from("events").select("*").eq("visibility", "public").eq("status", "active");
  if (error) throw error;
  return (await toItems(data as EventRow[])).filter((e) => !eventHasEnded(e));
};

export const fetchCreatedEvents = async (userId: string): Promise<EventItem[]> => {
  const { data, error } = await db.from("events").select("*").eq("creator_id", userId).order("starts_at", { ascending: false });
  if (error) throw error;
  return toItems(data as EventRow[]);
};

/** Eventos em que a pessoa está inscrita. */
export const fetchJoinedEvents = async (userId: string): Promise<EventItem[]> => {
  const { data, error } = await db.from("event_participants").select("event_id").eq("user_id", userId);
  if (error) throw error;
  const ids = (data as { event_id: string }[]).map((r) => r.event_id);
  if (ids.length === 0) return [];
  const eventsRes = await db.from("events").select("*").in("id", ids);
  if (eventsRes.error) throw eventsRes.error;
  return toItems(eventsRes.data as EventRow[]);
};

export const fetchEvent = async (id: string): Promise<EventItem | null> => {
  const { data, error } = await db.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await toItems([data as EventRow]))[0];
};

export const isJoined = async (eventId: string, userId: string): Promise<boolean> => {
  const { data, error } = await db.from("event_participants").select("event_id").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return !!data;
};

export const fetchParticipants = async (eventId: string): Promise<EventParticipant[]> => {
  const { data, error } = await db.from("event_participants").select("user_id, author_name, joined_at").eq("event_id", eventId).order("joined_at");
  if (error) throw error;
  return (data as { user_id: string; author_name: string; joined_at: string }[]).map((r) => ({
    userId: r.user_id,
    name: r.author_name,
    joinedAt: r.joined_at,
  }));
};

export const getEventPreview = async (code: string): Promise<EventPreview | null> => {
  const { data, error } = await db.rpc("get_event_preview", { p_code: code });
  if (error) throw error;
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    id: d.id as string,
    title: d.title as string,
    description: (d.description as string) ?? "",
    location: (d.location as string) ?? "",
    state: (d.state as string) ?? "",
    city: (d.city as string) ?? "",
    visibility: d.visibility as "public" | "private",
    startsAt: d.starts_at as string,
    endsAt: (d.ends_at as string) ?? null,
    maxParticipants: (d.max_participants as number) ?? null,
    status: d.status as "active" | "cancelled",
    creatorName: (d.creator_name as string) ?? "",
    participantCount: Number(d.participant_count ?? 0),
    isMember: Boolean(d.is_member),
  };
};

export const joinEvent = async (eventId: string, code?: string): Promise<void> => {
  const { error } = await db.rpc("join_event", { p_event_id: eventId, p_code: code ?? null });
  if (error) throw new Error(friendlyError(error, EVENT_ERRORS, "Não foi possível se inscrever."));
};

export const leaveEvent = async (eventId: string, userId: string) => {
  const { error } = await db.from("event_participants").delete().eq("event_id", eventId).eq("user_id", userId);
  if (error) throw error;
};

const uploadCover = async (userId: string, file: File): Promise<string> => {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await db.storage.from("event-covers").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return path;
};

const toRow = (input: EventInput) => ({
  title: input.title.trim(),
  description: input.description.trim() || null,
  location: input.location.trim(),
  state: input.state,
  city: input.city.trim(),
  visibility: input.visibility,
  starts_at: input.startsAt,
  ends_at: input.endsAt,
  max_participants: input.maxParticipants,
});

export const createEvent = async (userId: string, input: EventInput): Promise<string> => {
  const coverPath = input.cover ? await uploadCover(userId, input.cover) : null;
  const { data, error } = await db
    .from("events")
    .insert({ ...toRow(input), creator_id: userId, cover_path: coverPath })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
};

export const updateEvent = async (eventId: string, userId: string, input: EventInput) => {
  const patch: Record<string, unknown> = toRow(input);
  if (input.cover) patch.cover_path = await uploadCover(userId, input.cover);
  else if (input.removeCover) patch.cover_path = null;
  const { error } = await db.from("events").update(patch).eq("id", eventId);
  if (error) throw error;
};

export const cancelEvent = async (eventId: string) => {
  const { error } = await db.from("events").update({ status: "cancelled" }).eq("id", eventId);
  if (error) throw error;
};

export const setEventInviteActive = async (eventId: string, active: boolean) => {
  const { error } = await db.from("events").update({ invite_active: active }).eq("id", eventId);
  if (error) throw error;
};

export const inviteStudentsToEvent = async (eventId: string, studentIds: string[]): Promise<number> => {
  const { data, error } = await db.rpc("invite_students_to_event", { p_event_id: eventId, p_student_ids: studentIds });
  if (error) throw error;
  return Number(data ?? 0);
};

export const inviteStudentsToChallenge = async (challengeId: string, studentIds: string[]): Promise<number> => {
  const { data, error } = await db.rpc("invite_students_to_challenge", { p_challenge_id: challengeId, p_student_ids: studentIds });
  if (error) throw new Error(friendlyError(error, { INVITE_DISABLED: "Ative o link do desafio para convidar alunos." }, "Não foi possível enviar os convites."));
  return Number(data ?? 0);
};

// ---------- Notificações ----------

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export const fetchNotifications = async (limit = 30): Promise<AppNotification[]> => {
  const { data, error } = await db.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data as { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }[]).map(
    (n) => ({ id: n.id, type: n.type, title: n.title, body: n.body ?? "", link: n.link, readAt: n.read_at, createdAt: n.created_at })
  );
};

export const markNotificationRead = async (id: string) => {
  await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
};
