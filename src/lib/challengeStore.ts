// Desafios entre amigos: criação, convite por link, ranking, atividades (com foto), reações e comentários.
// As tabelas de desafios são identificadas pelo id do usuário de autenticação (auth.users),
// então funcionam para qualquer tipo de conta.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toLocalISO } from "@/lib/agendaStore";

// Tabelas novas ainda não estão no arquivo de tipos gerado.
const db = supabase as unknown as SupabaseClient;

export const REACTION_EMOJIS = ["👍", "💪", "🔥", "👏", "❤️"];
const PENDING_CODE_KEY = "pending-challenge-code";

export interface Challenge {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  rules: string;
  startDate: string;
  endDate: string | null;
  status: "active" | "ended";
  inviteCode: string;
  inviteActive: boolean;
  participantCount?: number;
}

export interface ChallengeInput {
  title: string;
  description: string;
  rules: string;
  startDate: string;
  endDate: string | null;
}

export interface RankingRow {
  userId: string;
  name: string;
  points: number;
  lastActivity: string | null;
}

export interface ChallengePost {
  id: string;
  challengeId: string;
  userId: string;
  authorName: string;
  title: string;
  description: string;
  activityAt: string;
  photoUrl: string | null;
  source: "manual" | "platform";
  reactions: Record<string, { count: number; mine: boolean }>;
  commentCount: number;
}

export interface ChallengeComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ChallengePreview {
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  creatorName: string;
  participantCount: number;
  isMember: boolean;
}

type ChallengeRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  rules: string | null;
  start_date: string;
  end_date: string | null;
  status: "active" | "ended";
  invite_code: string;
  invite_active: boolean;
  challenge_participants?: { count: number }[];
};

const toChallenge = (r: ChallengeRow): Challenge => ({
  id: r.id,
  creatorId: r.creator_id,
  title: r.title,
  description: r.description ?? "",
  rules: r.rules ?? "",
  startDate: r.start_date,
  endDate: r.end_date,
  status: r.status,
  inviteCode: r.invite_code,
  inviteActive: r.invite_active,
  participantCount: r.challenge_participants?.[0]?.count,
});

export const inviteLink = (code: string) => `${window.location.origin}/desafio/${code}`;

// Código de convite guardado enquanto a pessoa faz login/cadastro.
export const savePendingInvite = (code: string) => {
  try {
    localStorage.setItem(PENDING_CODE_KEY, code);
  } catch {
    /* sem armazenamento */
  }
};
export const takePendingInvitePath = (): string | null => {
  try {
    const code = localStorage.getItem(PENDING_CODE_KEY);
    if (!code) return null;
    localStorage.removeItem(PENDING_CODE_KEY);
    return `/desafio/${code}`;
  } catch {
    return null;
  }
};

/** Progresso em dias do desafio. */
export const challengeProgress = (c: Pick<Challenge, "startDate" | "endDate">, todayISO = toLocalISO(new Date())) => {
  const day = (iso: string) => new Date(`${iso}T00:00:00`).getTime() / 86400000;
  const started = day(todayISO) >= day(c.startDate);
  const elapsed = started ? Math.round(day(todayISO) - day(c.startDate)) + 1 : 0;
  if (!c.endDate) return { elapsed, total: null as number | null, remaining: null as number | null, pct: 0, started, daysToStart: started ? 0 : Math.round(day(c.startDate) - day(todayISO)) };
  const total = Math.round(day(c.endDate) - day(c.startDate)) + 1;
  const clamped = Math.min(elapsed, total);
  return {
    elapsed: clamped,
    total,
    remaining: Math.max(0, total - clamped),
    pct: Math.round((clamped / total) * 100),
    started,
    daysToStart: started ? 0 : Math.round(day(c.startDate) - day(todayISO)),
  };
};

// ---------- Desafios ----------

export const fetchMyChallenges = async (): Promise<Challenge[]> => {
  const { data, error } = await db
    .from("challenges")
    .select("*, challenge_participants(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ChallengeRow[]).map(toChallenge);
};

export const fetchChallenge = async (id: string): Promise<Challenge | null> => {
  const { data, error } = await db.from("challenges").select("*, challenge_participants(count)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toChallenge(data as ChallengeRow) : null;
};

export const createChallenge = async (userId: string, input: ChallengeInput): Promise<string> => {
  const { data, error } = await db
    .from("challenges")
    .insert({
      creator_id: userId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      rules: input.rules.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
};

export const updateChallenge = async (id: string, input: ChallengeInput) => {
  const { error } = await db
    .from("challenges")
    .update({
      title: input.title.trim(),
      description: input.description.trim() || null,
      rules: input.rules.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .eq("id", id);
  if (error) throw error;
};

export const setChallengeStatus = async (id: string, status: "active" | "ended") => {
  const { error } = await db.from("challenges").update({ status }).eq("id", id);
  if (error) throw error;
};

export const setInviteActive = async (id: string, active: boolean) => {
  const { error } = await db.from("challenges").update({ invite_active: active }).eq("id", id);
  if (error) throw error;
};

export const getChallengePreview = async (code: string): Promise<ChallengePreview | null> => {
  const { data, error } = await db.rpc("get_challenge_preview", { p_code: code });
  if (error) throw error;
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    title: d.title as string,
    description: (d.description as string) ?? "",
    startDate: d.start_date as string,
    endDate: (d.end_date as string) ?? null,
    creatorName: (d.creator_name as string) ?? "",
    participantCount: Number(d.participant_count ?? 0),
    isMember: Boolean(d.is_member),
  };
};

/** Entra no desafio pelo código e devolve o id do desafio. */
export const joinChallenge = async (code: string): Promise<string> => {
  const { data, error } = await db.rpc("join_challenge", { p_code: code });
  if (error) throw error;
  return data as string;
};

export const leaveChallenge = async (challengeId: string, userId: string) => {
  const { error } = await db.from("challenge_participants").delete().eq("challenge_id", challengeId).eq("user_id", userId);
  if (error) throw error;
};

export const removeParticipant = leaveChallenge;

export const fetchRanking = async (challengeId: string): Promise<RankingRow[]> => {
  const { data, error } = await db.rpc("get_challenge_ranking", { p_challenge_id: challengeId });
  if (error) throw error;
  return ((data ?? []) as { user_id: string; author_name: string; points: number | string; last_activity: string | null }[]).map((r) => ({
    userId: r.user_id,
    name: r.author_name,
    points: Number(r.points),
    lastActivity: r.last_activity,
  }));
};

// ---------- Atividades ----------

type PostRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  author_name: string;
  title: string;
  description: string | null;
  activity_at: string;
  photo_url: string | null;
  source: "manual" | "platform";
};

export const fetchPosts = async (challengeId: string, userId: string): Promise<ChallengePost[]> => {
  const { data, error } = await db
    .from("challenge_posts")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("activity_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as PostRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const paths = rows.map((r) => r.photo_url).filter((p): p is string => !!p && !p.startsWith("http"));
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await db.storage.from("challenge-photos").createSignedUrls(paths, 3600);
    (urls ?? []).forEach((u) => {
      if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    });
  }

  const [reactionsRes, commentsRes] = await Promise.all([
    db.from("challenge_reactions").select("post_id, user_id, emoji").in("post_id", ids),
    db.from("challenge_comments").select("post_id").in("post_id", ids),
  ]);
  if (reactionsRes.error) throw reactionsRes.error;
  if (commentsRes.error) throw commentsRes.error;

  const reactions = new Map<string, ChallengePost["reactions"]>();
  (reactionsRes.data as { post_id: string; user_id: string; emoji: string }[]).forEach((r) => {
    const map = reactions.get(r.post_id) ?? {};
    const entry = map[r.emoji] ?? { count: 0, mine: false };
    entry.count += 1;
    if (r.user_id === userId) entry.mine = true;
    map[r.emoji] = entry;
    reactions.set(r.post_id, map);
  });
  const commentCounts = new Map<string, number>();
  (commentsRes.data as { post_id: string }[]).forEach((c) => commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1));

  return rows.map((r) => ({
    id: r.id,
    challengeId: r.challenge_id,
    userId: r.user_id,
    authorName: r.author_name,
    title: r.title,
    description: r.description ?? "",
    activityAt: r.activity_at,
    photoUrl: r.photo_url && !r.photo_url.startsWith("http") ? signed.get(r.photo_url) ?? null : r.photo_url,
    source: r.source,
    reactions: reactions.get(r.id) ?? {},
    commentCount: commentCounts.get(r.id) ?? 0,
  }));
};

export interface PostInput {
  title: string;
  description: string;
  activityAt: string;
  photo?: File | null;
}

/** O bucket é privado: guardamos o caminho do arquivo e geramos links temporários ao exibir. */
const uploadPhoto = async (userId: string, file: File): Promise<string> => {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await db.storage.from("challenge-photos").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  return path;
};

export const createPost = async (challengeId: string, userId: string, input: PostInput) => {
  const photoUrl = input.photo ? await uploadPhoto(userId, input.photo) : null;
  const { error } = await db.from("challenge_posts").insert({
    challenge_id: challengeId,
    user_id: userId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    activity_at: input.activityAt,
    photo_url: photoUrl,
    source: "manual",
  });
  if (error) throw error;
};

export const updatePost = async (postId: string, userId: string, input: PostInput & { removePhoto?: boolean }) => {
  const patch: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim() || null,
    activity_at: input.activityAt,
  };
  if (input.photo) patch.photo_url = await uploadPhoto(userId, input.photo);
  else if (input.removePhoto) patch.photo_url = null;
  const { error } = await db.from("challenge_posts").update(patch).eq("id", postId);
  if (error) throw error;
};

export const deletePost = async (postId: string) => {
  const { error } = await db.from("challenge_posts").delete().eq("id", postId);
  if (error) throw error;
};

export const toggleReaction = async (postId: string, userId: string, emoji: string, mine: boolean) => {
  const { error } = mine
    ? await db.from("challenge_reactions").delete().eq("post_id", postId).eq("user_id", userId).eq("emoji", emoji)
    : await db.from("challenge_reactions").insert({ post_id: postId, user_id: userId, emoji });
  if (error) throw error;
};

export const fetchComments = async (postId: string): Promise<ChallengeComment[]> => {
  const { data, error } = await db.from("challenge_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data as { id: string; post_id: string; user_id: string; author_name: string; content: string; created_at: string }[]).map((c) => ({
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    authorName: c.author_name,
    content: c.content,
    createdAt: c.created_at,
  }));
};

export const addComment = async (postId: string, userId: string, content: string) => {
  const { error } = await db.from("challenge_comments").insert({ post_id: postId, user_id: userId, content: content.trim() });
  if (error) throw error;
};

export const deleteComment = async (commentId: string) => {
  const { error } = await db.from("challenge_comments").delete().eq("id", commentId);
  if (error) throw error;
};
