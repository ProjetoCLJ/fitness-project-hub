// Catálogo de medalhas e conquistas. O banco guarda só a chave (user_medals.medal_key); nomes e textos ficam aqui.

import { SportCode, sportLabel } from "@/lib/sports";
import type { UserMedal } from "@/lib/gamification";

export type MedalTier = "bronze" | "prata" | "ouro" | "unica";
export type MedalCategory = "foco" | "treinos" | "xp" | "semanas" | "ligas" | "esportes";

export interface MedalInfo {
  key: string;
  title: string;
  description: string;
  category: MedalCategory;
  tier: MedalTier;
  /** Valor (série) usado no selo, ex.: "30" dias. */
  badge?: string;
}

const tierOf = (index: number, total: number): MedalTier => {
  const third = total / 3;
  return index < third ? "bronze" : index < third * 2 ? "prata" : "ouro";
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

// Séries com marcos (conquistas): aparecem completas, com as pendentes bloqueadas.
export interface MedalSeries {
  id: string;
  title: string;
  category: MedalCategory;
  steps: MedalInfo[];
}

const series = (id: string, title: string, category: MedalCategory, values: number[], keyOf: (v: number) => string, text: (v: number) => { title: string; description: string }): MedalSeries => ({
  id,
  title,
  category,
  steps: values.map((v, i) => ({ key: keyOf(v), category, tier: tierOf(i, values.length), badge: fmt(v), ...text(v) })),
});

export const MEDAL_SERIES: MedalSeries[] = [
  series("foco", "Foco", "foco", [14, 30, 60, 90, 120, 180, 365, 730], (v) => `foco_${v}`, (v) => ({
    title: `${fmt(v)} dias de Foco`,
    description: `Manteve o Foco por ${fmt(v)} dias seguidos.`,
  })),
  series("treinos", "Treinos concluídos", "treinos", [1, 10, 50, 100, 250, 500, 1000], (v) => `treinos_${v}`, (v) => ({
    title: v === 1 ? "Primeiro treino" : `${fmt(v)} treinos`,
    description: v === 1 ? "Concluiu o primeiro treino válido." : `Concluiu ${fmt(v)} treinos válidos.`,
  })),
  series("xp", "XP total", "xp", [100, 500, 1000, 2500, 5000, 10000, 25000, 50000], (v) => `xp_${v}`, (v) => ({
    title: `${fmt(v)} XP`,
    description: `Acumulou ${fmt(v)} XP no total.`,
  })),
  series("semanas", "Semanas perfeitas", "semanas", [1, 4, 12, 26], (v) => (v === 1 ? "semana_1" : `semanas_${v}`), (v) => ({
    title: v === 1 ? "Primeira semana perfeita" : `${v} semanas perfeitas seguidas`,
    description: v === 1 ? "Cumpriu todos os treinos de uma semana." : `Cumpriu todos os treinos por ${v} semanas seguidas.`,
  })),
  series("podio", "Pódio em sequência", "ligas", [3, 5, 10], (v) => `podio_seq_${v}`, (v) => ({
    title: `${v} pódios seguidos`,
    description: `Ficou no pódio da liga por ${v} meses seguidos.`,
  })),
];

const SPORT_XP_STEPS = [500, 2000, 5000];

export const sportXpSeries = (sport: SportCode): MedalSeries => ({
  id: `xp_esporte_${sport}`,
  title: `XP em ${sportLabel(sport)}`,
  category: "esportes",
  steps: SPORT_XP_STEPS.map((v, i) => ({
    key: `xp_esporte_${sport}_${v}`,
    category: "esportes" as const,
    tier: tierOf(i, SPORT_XP_STEPS.length),
    badge: fmt(v),
    title: `${fmt(v)} XP em ${sportLabel(sport)}`,
    description: `Acumulou ${fmt(v)} XP em ${sportLabel(sport)}.`,
  })),
});

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Medalhas avulsas (eventos): só aparecem depois de conquistadas. */
export const describeEventMedal = (m: UserMedal): MedalInfo | null => {
  const key = m.medalKey;
  const pod = key.match(/^podio_(\d{4})_(\d{2})$/);
  if (pod) {
    const position = Number(m.meta.position ?? 0);
    return {
      key,
      category: "ligas",
      tier: position === 1 ? "ouro" : position === 2 ? "prata" : "bronze",
      badge: position ? `${position}º` : undefined,
      title: `Pódio de ${MONTHS[Number(pod[2]) - 1]}`,
      description: `${position}º lugar no grupo da liga em ${MONTHS[Number(pod[2]) - 1]} de ${pod[1]}.`,
    };
  }
  if (key === "campeao_lenda") return { key, category: "ligas", tier: "unica", title: "Campeão da Lenda", description: "1º lugar na liga Lenda." };
  if (key === "volta_ao_foco") return { key, category: "foco", tier: "unica", title: "De volta ao Foco", description: "Conquistou uma meta depois de 14 dias ou mais parado." };
  const goal = key.match(/^meta_foco_(\d+)$/);
  if (goal) return { key, category: "foco", tier: "prata", badge: goal[1], title: `Meta de ${goal[1]} dias`, description: `Conquistou a meta pessoal de ${goal[1]} dias de Foco.` };
  const first = key.match(/^primeiro_(.+)$/);
  if (first) return { key, category: "esportes", tier: "unica", title: `Primeiro treino de ${sportLabel(first[1])}`, description: `Concluiu o primeiro treino válido de ${sportLabel(first[1])}.` };
  if (key === "multi_3") return { key, category: "esportes", tier: "prata", title: "Multiesportista", description: "Treinou 3 esportes diferentes no mesmo mês." };
  if (key === "multi_5") return { key, category: "esportes", tier: "ouro", title: "Multiesportista de elite", description: "Treinou 5 esportes diferentes no mesmo mês." };
  return null;
};

const SERIES_KEYS = new Set<string>();
MEDAL_SERIES.forEach((s) => s.steps.forEach((st) => SERIES_KEYS.add(st.key)));
export const isSeriesMedal = (key: string) => SERIES_KEYS.has(key) || /^xp_esporte_/.test(key);

export const TIER_CLASS: Record<MedalTier, string> = {
  bronze: "from-amber-700 to-amber-500 text-white",
  prata: "from-slate-500 to-slate-300 text-white",
  ouro: "from-yellow-500 to-amber-300 text-amber-950",
  unica: "from-primary to-primary/70 text-primary-foreground",
};
