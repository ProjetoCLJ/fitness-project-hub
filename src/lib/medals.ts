// Catálogo de medalhas e conquistas. O banco guarda só a chave (user_medals.medal_key); nomes, cores e símbolos ficam aqui.

import { SportCode, sportLabel } from "@/lib/sports";
import { LEAGUE_NAMES, type UserMedal } from "@/lib/gamification";

export type MedalGlyph = "foco" | "treinos" | "xp" | "semanas" | "podio" | "esporte" | "multi" | "coroa";
export type MedalCategory = "foco" | "treinos" | "xp" | "semanas" | "ligas" | "esportes";

export interface MedalInfo {
  key: string;
  title: string;
  description: string;
  category: MedalCategory;
  glyph: MedalGlyph;
  /** Cor base; o restante da medalha (aro, sombra, relevo) é derivado dela. */
  color: string;
  /** Número no centro. Sem número, o símbolo fica grande e centralizado. */
  value?: string;
  ribbon?: boolean;
  /** Linha extra sob o título (esporte, liga e mês). */
  sub?: string;
}

const CLASSIC = ["#B87333", "#B8C1CC", "#E5B422"]; // bronze, prata, ouro
const FAMILY = {
  treinos: ["#84CC16", "#22A34A", "#0F7A55"],
  xp: ["#38BDF8", "#2563EB", "#4F46E5"],
  semanas: ["#2DD4BF", "#0D9488", "#0E7490"],
  esporteXp: ["#A78BFA", "#7C3AED", "#5B21B6"],
};
const COLOR = { esporte: "#8B5CF6", multi: "#D946EF", volta: "#F97316", lenda: "#EC4899", meta: "#F59E0B" };

const fmt = (n: number) => n.toLocaleString("pt-BR");
const third = (index: number, total: number) => Math.min(2, Math.floor(index / (total / 3)));

// Séries com marcos (conquistas): aparecem completas, com as pendentes bloqueadas.
export interface MedalSeries {
  id: string;
  title: string;
  category: MedalCategory;
  steps: MedalInfo[];
}

const series = (
  id: string,
  title: string,
  category: MedalCategory,
  glyph: MedalGlyph,
  palette: string[],
  values: number[],
  keyOf: (v: number) => string,
  text: (v: number) => { title: string; description: string }
): MedalSeries => ({
  id,
  title,
  category,
  steps: values.map((v, i) => ({ key: keyOf(v), category, glyph, color: palette[third(i, values.length)], value: fmt(v), ...text(v) })),
});

export const MEDAL_SERIES: MedalSeries[] = [
  series("foco", "Foco", "foco", "foco", CLASSIC, [14, 30, 60, 90, 120, 180, 365, 730], (v) => `foco_${v}`, (v) => ({
    title: `${fmt(v)} dias de Foco`,
    description: `Manteve o Foco por ${fmt(v)} dias seguidos.`,
  })),
  series("treinos", "Treinos concluídos", "treinos", "treinos", FAMILY.treinos, [1, 10, 50, 100, 250, 500, 1000], (v) => `treinos_${v}`, (v) => ({
    title: v === 1 ? "Primeiro treino" : `${fmt(v)} treinos`,
    description: v === 1 ? "Concluiu o primeiro treino válido." : `Concluiu ${fmt(v)} treinos válidos.`,
  })),
  series("xp", "XP total", "xp", "xp", FAMILY.xp, [100, 500, 1000, 2500, 5000, 10000, 25000, 50000], (v) => `xp_${v}`, (v) => ({
    title: `${fmt(v)} XP`,
    description: `Acumulou ${fmt(v)} XP no total.`,
  })),
  series("semanas", "Semanas perfeitas", "semanas", "semanas", FAMILY.semanas, [1, 4, 12, 26], (v) => (v === 1 ? "semana_1" : `semanas_${v}`), (v) => ({
    title: v === 1 ? "Primeira semana perfeita" : `${v} semanas perfeitas seguidas`,
    description: v === 1 ? "Cumpriu todos os treinos de uma semana." : `Cumpriu todos os treinos por ${v} semanas seguidas.`,
  })),
  series("podio", "Pódio em sequência", "ligas", "podio", CLASSIC, [3, 5, 10], (v) => `podio_seq_${v}`, (v) => ({
    title: `${v} pódios seguidos`,
    description: `Ficou no pódio da liga por ${v} meses seguidos.`,
  })),
];

const SPORT_XP_STEPS = [500, 2000, 5000];

export const sportXpSeries = (sport: SportCode): MedalSeries =>
  series(`xp_esporte_${sport}`, `XP em ${sportLabel(sport)}`, "esportes", "esporte", FAMILY.esporteXp, SPORT_XP_STEPS, (v) => `xp_esporte_${sport}_${v}`, (v) => ({
    title: `${fmt(v)} XP em ${sportLabel(sport)}`,
    description: `Acumulou ${fmt(v)} XP em ${sportLabel(sport)}.`,
  }));

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Medalhas avulsas (eventos): só aparecem depois de conquistadas. */
export const describeEventMedal = (m: UserMedal): MedalInfo | null => {
  const key = m.medalKey;

  const pod = key.match(/^podio_(\d{4})_(\d{2})$/);
  if (pod) {
    const position = Number(m.meta.position ?? 0);
    const league = LEAGUE_NAMES[Math.min(Math.max(Number(m.meta.league ?? 1), 1), 10) - 1];
    const month = Number(pod[2]) - 1;
    return {
      key,
      category: "ligas",
      glyph: "podio",
      color: CLASSIC[position === 1 ? 2 : position === 2 ? 1 : 0],
      value: position ? `${position}º` : undefined,
      ribbon: true,
      title: `Pódio na liga ${league}`,
      sub: `${MONTHS_SHORT[month]}/${pod[1].slice(2)}`,
      description: `${position}º lugar no grupo da liga ${league} em ${MONTHS[month]} de ${pod[1]}.`,
    };
  }
  if (key === "campeao_lenda") {
    return { key, category: "ligas", glyph: "coroa", color: COLOR.lenda, ribbon: true, title: "Campeão da liga Lenda", description: "1º lugar na liga Lenda." };
  }
  if (key === "volta_ao_foco") {
    return { key, category: "foco", glyph: "foco", color: COLOR.volta, title: "De volta ao Foco", description: "Conquistou uma meta depois de 14 dias ou mais parado." };
  }
  const goal = key.match(/^meta_foco_(\d+)$/);
  if (goal) {
    return { key, category: "foco", glyph: "foco", color: COLOR.meta, value: goal[1], title: `Meta de ${goal[1]} dias`, description: `Conquistou a meta pessoal de ${goal[1]} dias de Foco.` };
  }
  const first = key.match(/^primeiro_(.+)$/);
  if (first) {
    const name = sportLabel(first[1]);
    return { key, category: "esportes", glyph: "esporte", color: COLOR.esporte, title: "Primeiro treino", sub: name, description: `Concluiu o primeiro treino válido de ${name}.` };
  }
  const multi = key.match(/^multi_(\d+)$/);
  if (multi) {
    return {
      key,
      category: "esportes",
      glyph: "multi",
      color: COLOR.multi,
      value: multi[1],
      title: `Multiesportista: ${multi[1]} esportes`,
      description: `Treinou ${multi[1]} esportes diferentes no mesmo mês.`,
    };
  }
  return null;
};

const SERIES_KEYS = new Set<string>();
MEDAL_SERIES.forEach((s) => s.steps.forEach((st) => SERIES_KEYS.add(st.key)));
export const isSeriesMedal = (key: string) => SERIES_KEYS.has(key) || /^xp_esporte_/.test(key);
