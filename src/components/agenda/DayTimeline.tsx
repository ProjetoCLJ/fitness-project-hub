import { useEffect, useMemo, useRef } from "react";
import { ScheduleEvent, toLocalISO } from "@/lib/agendaStore";
import { DayBand, DayBlock, HOUR_PX, TIMELINE_END, TIMELINE_START, fmtMin, layoutDay, minToPx } from "@/lib/dayLayout";

interface DayTimelineProps {
  dateISO: string;
  events: ScheduleEvent[];
  /** Toque num bloco (aula, treino de aluno ou bloqueio). */
  onBlockClick: (event: ScheduleEvent) => void;
  /** Toque num espaço livre dentro do expediente: minuto tocado (arredondado a cada 15 min) e a faixa de expediente. */
  onFreeClick: (minute: number, band: DayBand) => void;
  /** Toque numa faixa fora do expediente. */
  onOffClick: (band: DayBand) => void;
}

const KIND_STYLE: Record<DayBlock["kind"], string> = {
  aula: "bg-primary text-primary-foreground",
  treino: "bg-emerald-700 text-white",
  bloqueado: "bg-destructive text-destructive-foreground",
};

const HOURS = Array.from({ length: (TIMELINE_END - TIMELINE_START) / 60 + 1 }, (_, i) => TIMELINE_START / 60 + i);
/** Hora em que a tela abre rolada quando o dia não tem nada marcado. */
const DEFAULT_ANCHOR = 7 * 60;
const GUTTER = 44;

/**
 * Dia no estilo de uma agenda de calendário: escala de horas à esquerda com linhas horizontais; os blocos ficam sobre as
 * linhas, com altura proporcional à duração (dá para ter horários quebrados). Blocos no mesmo horário ficam lado a lado;
 * blocos que se encostam ficam em sequência.
 */
export const DayTimeline = ({ dateISO, events, onBlockClick, onFreeClick, onOffClick }: DayTimelineProps) => {
  const { blocks, bands } = useMemo(() => layoutDay(events, dateISO), [events, dateISO]);
  const scroller = useRef<HTMLDivElement>(null);

  // O dia tem 24 h: abre rolado no primeiro compromisso (ou no expediente; sem nada, às 07:00).
  const anchor = useMemo(() => {
    const starts = [...blocks.map((b) => b.start), ...bands.filter((b) => b.kind === "expediente").map((b) => b.start)];
    return starts.length > 0 ? Math.min(...starts) : DEFAULT_ANCHOR;
  }, [blocks, bands]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, minToPx(anchor) - 24);
  }, [dateISO, anchor]);

  const now = new Date();
  const todayISO = toLocalISO(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = dateISO === todayISO;
  const isPastDay = dateISO < todayISO;
  const total = ((TIMELINE_END - TIMELINE_START) / 60) * HOUR_PX;

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = TIMELINE_START + ((e.clientY - rect.top) / HOUR_PX) * 60;
    const minute = Math.floor(raw / 15) * 15;
    const band = bands.find((b) => minute >= b.start && minute < b.end);
    if (!band) return;
    if (band.kind === "expediente") onFreeClick(minute, band);
    else onOffClick(band);
  };

  return (
    <div ref={scroller} className="max-h-[70vh] overflow-y-auto overscroll-contain pt-3 pb-3 select-none">
      <div className="relative" style={{ height: total }}>
        {/* Escala de horas */}
        {HOURS.map((h) => (
          <div key={h} className="absolute inset-x-0 flex items-start pointer-events-none" style={{ top: (h - TIMELINE_START / 60) * HOUR_PX }}>
            <span className="text-[10px] leading-none text-muted-foreground text-right pr-2 -translate-y-1/2" style={{ width: GUTTER }}>
              {h === TIMELINE_END / 60 ? "23:59" : `${String(h).padStart(2, "0")}:00`}
            </span>
            <div className="flex-1 border-t border-border" />
          </div>
        ))}
        {HOURS.slice(0, -1).map((h) => (
          <div key={`half-${h}`} className="absolute right-0 border-t border-dashed border-border/40 pointer-events-none" style={{ top: (h - TIMELINE_START / 60) * HOUR_PX + HOUR_PX / 2, left: GUTTER }} />
        ))}

        {/* Faixa de blocos */}
        <div className="absolute inset-y-0 right-0 cursor-pointer" style={{ left: GUTTER }} onClick={handleLaneClick}>
          {bands.map((band) => {
            const height = minToPx(band.end) - minToPx(band.start);
            return (
              <div
                key={`${band.kind}-${band.start}`}
                className={`absolute inset-x-0 overflow-hidden ${
                  band.kind === "expediente"
                    ? "bg-primary/10 border-l-2 border-primary/40"
                    : "bg-muted/70 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,hsl(var(--border)/0.55)_6px,hsl(var(--border)/0.55)_7px)]"
                }`}
                style={{ top: minToPx(band.start), height }}
              >
                {height >= 22 && (
                  <span className={`absolute left-2 top-1 text-[10px] leading-none ${band.kind === "expediente" ? "text-primary/80" : "text-muted-foreground"}`}>
                    {band.kind === "expediente" ? "Expediente" : "Fora do expediente"} · {fmtMin(band.start)} – {fmtMin(band.end)}
                  </span>
                )}
              </div>
            );
          })}

          {blocks.map((b) => {
            const height = Math.max(20, minToPx(b.end) - minToPx(b.start));
            const roomy = height >= 44;
            const past = isPastDay || (isToday && b.end <= nowMin);
            return (
              <button
                key={b.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBlockClick(b.event);
                }}
                className={`absolute rounded-md px-1.5 py-1 text-left overflow-hidden shadow-sm ring-1 ring-background/60 transition-opacity hover:opacity-90 ${KIND_STYLE[b.kind]} ${past ? "opacity-60" : ""}`}
                style={{
                  top: minToPx(b.start),
                  height,
                  left: `calc(${(b.col * 100) / b.cols}% + 2px)`,
                  width: `calc(${100 / b.cols}% - 4px)`,
                }}
              >
                <span className="flex h-full items-start gap-2">
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold leading-tight">
                    {`${b.startLabel} – ${b.endLabel}`}
                  </span>
                  <span className="min-w-0 flex-1 text-right">
                    <span className="block text-xs leading-tight truncate">{b.title}</span>
                    {b.subtitle && roomy && <span className="block text-[10px] leading-tight opacity-85 truncate">{b.subtitle}</span>}
                  </span>
                </span>
              </button>
            );
          })}

          {/* Agora */}
          {isToday && nowMin >= TIMELINE_START && nowMin <= TIMELINE_END && (
            <div className="absolute inset-x-0 pointer-events-none z-10" style={{ top: minToPx(nowMin) }}>
              <div className="relative border-t-2 border-red-500">
                <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
