import { ScheduleEvent, eventTitle, getEventsForDate } from "@/lib/agendaStore";

// Layout do dia no estilo de uma agenda de calendário: escala de horas na lateral, blocos com altura proporcional à duração,
// blocos no mesmo horário lado a lado e blocos que se encostam (um termina quando o outro começa) em sequência.

export const TIMELINE_START = 6 * 60;
export const TIMELINE_END = 22 * 60;
/** Altura de uma hora na escala, em pixels. */
export const HOUR_PX = 64;

export const toMin = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
};

export const fmtMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const minToPx = (min: number) => ((min - TIMELINE_START) / 60) * HOUR_PX;

const clamp = (min: number) => Math.min(TIMELINE_END, Math.max(TIMELINE_START, min));

export type BlockKind = "aula" | "treino" | "bloqueado";

export interface DayBlock {
  id: string;
  kind: BlockKind;
  /** Início e fim em minutos desde 00:00 (já limitados à escala do dia). */
  start: number;
  end: number;
  /** Horário original do evento (pode passar da escala). */
  startLabel: string;
  endLabel: string;
  /** Nome do aluno (aula e treino) ou o motivo do bloqueio. */
  title: string;
  /** Segunda linha opcional (nome do treino). */
  subtitle?: string;
  event: ScheduleEvent;
  col: number;
  cols: number;
}

export interface DayBand {
  /** "expediente": horário de atendimento; "fora": o que sobra fora do expediente. */
  kind: "expediente" | "fora";
  start: number;
  end: number;
  events: ScheduleEvent[];
}

/** Distribui itens em colunas: sobrepostos ficam lado a lado; quem só se encosta continua na mesma coluna (em sequência). */
export const assignColumns = <T extends { start: number; end: number }>(items: T[]): (T & { col: number; cols: number })[] => {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: (T & { col: number; cols: number })[] = [];
  let cluster: { item: T; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const cols = Math.max(1, colEnds.length);
    cluster.forEach((c) => out.push({ ...c.item, col: c.col, cols }));
    cluster = [];
    colEnds = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(item.end);
    } else {
      colEnds[col] = item.end;
    }
    cluster.push({ item, col });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return out;
};

const blockTitle = (event: ScheduleEvent): { title: string; subtitle?: string } => {
  if (event.type === "bloqueado") return { title: event.title ? `Bloqueado - ${event.title}` : "Bloqueado" };
  const names = event.studentNames.filter(Boolean);
  const who = names.length === 0 ? "Aula" : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
  if (event.fromPlan) return { title: who, subtitle: event.fromPlan.workoutName };
  return { title: who };
};

/** Faixas do dia: os expedientes (unidos) e o que fica fora deles dentro da escala. */
export const dayBands = (dayEvents: ScheduleEvent[]): DayBand[] => {
  const exp = dayEvents
    .filter((e) => e.type === "expediente")
    .map((e) => ({ start: clamp(toMin(e.startTime)), end: clamp(toMin(e.endTime)), event: e }))
    .filter((x) => x.end > x.start)
    .sort((a, b) => a.start - b.start);

  const merged: DayBand[] = [];
  for (const x of exp) {
    const last = merged[merged.length - 1];
    if (last && x.start <= last.end) {
      last.end = Math.max(last.end, x.end);
      last.events.push(x.event);
    } else {
      merged.push({ kind: "expediente", start: x.start, end: x.end, events: [x.event] });
    }
  }

  const bands: DayBand[] = [];
  let cursor = TIMELINE_START;
  for (const m of merged) {
    if (m.start > cursor) bands.push({ kind: "fora", start: cursor, end: m.start, events: [] });
    bands.push(m);
    cursor = m.end;
  }
  if (cursor < TIMELINE_END) bands.push({ kind: "fora", start: cursor, end: TIMELINE_END, events: [] });
  return bands;
};

export const layoutDay = (events: ScheduleEvent[], dateISO: string): { blocks: DayBlock[]; bands: DayBand[] } => {
  const dayEvents = getEventsForDate(events, dateISO);

  const raw = dayEvents
    .filter((e) => e.type !== "expediente")
    .map((event) => {
      const startRaw = toMin(event.startTime);
      const endRaw = toMin(event.endTime);
      const { title, subtitle } = blockTitle(event);
      return {
        id: `${event.id}`,
        kind: (event.type === "bloqueado" ? "bloqueado" : event.fromPlan ? "treino" : "aula") as BlockKind,
        start: clamp(startRaw),
        end: clamp(endRaw),
        startLabel: event.startTime,
        endLabel: event.endTime,
        title,
        subtitle,
        event,
      };
    })
    .filter((b) => b.end > b.start);

  return { blocks: assignColumns(raw), bands: dayBands(dayEvents) };
};

export { eventTitle };
