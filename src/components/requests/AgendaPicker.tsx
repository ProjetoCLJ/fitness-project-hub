import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toLocalISO } from "@/lib/agendaStore";
import { AgendaCell, fetchAgendaAvailability } from "@/lib/workoutRequests";
import { WEEKDAY_SHORT } from "@/lib/planStore";
import { useToast } from "@/hooks/use-toast";

export interface PickedSlot {
  date: string;
  start: string;
}

interface AgendaPickerProps {
  trainerId: string;
  value: PickedSlot | null;
  onChange: (slot: PickedSlot | null) => void;
  /** O treino que está sendo remarcado não conta como ocupando o horário dele. */
  exclude?: { workoutId: string; date: string; requestId?: string };
  /** Quantos dias à frente mostrar (o servidor aceita até 14 para pedidos). */
  days?: number;
}

const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return { week: WEEKDAY_SHORT[d.getDay()], num: String(d.getDate()).padStart(2, "0"), month: String(d.getMonth() + 1).padStart(2, "0") };
};

/**
 * Agenda do profissional só com "livre" e "ocupado" (sem mostrar quem ocupa). A pessoa navega pelos dias,
 * escolhe um horário livre e o devolve em onChange.
 */
export const AgendaPicker = ({ trainerId, value, onChange, exclude, days = 14 }: AgendaPickerProps) => {
  const { toast } = useToast();
  const [cells, setCells] = useState<AgendaCell[] | null>(null);
  const todayISO = toLocalISO(new Date());
  const [day, setDay] = useState(value?.date ?? todayISO);

  const dayList = useMemo(() => {
    return Array.from({ length: days + 1 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return toLocalISO(d);
    });
  }, [days]);

  useEffect(() => {
    let alive = true;
    setCells(null);
    fetchAgendaAvailability(trainerId, dayList[0], dayList[dayList.length - 1], exclude)
      .then((rows) => alive && setCells(rows))
      .catch((e: Error) => {
        if (!alive) return;
        setCells([]);
        toast({ title: "Não foi possível carregar a agenda", description: e.message, variant: "destructive" });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerId, dayList, exclude?.workoutId, exclude?.date, exclude?.requestId]);

  const freeByDay = useMemo(() => {
    const map = new Map<string, number>();
    (cells ?? []).forEach((c) => c.free && map.set(c.date, (map.get(c.date) ?? 0) + 1));
    return map;
  }, [cells]);

  const dayCells = (cells ?? []).filter((c) => c.date === day);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {dayList.map((iso) => {
          const f = fmtDay(iso);
          const free = freeByDay.get(iso) ?? 0;
          const selected = iso === day;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setDay(iso)}
              className={`shrink-0 w-14 rounded-lg border px-1 py-2 text-center transition-smooth ${
                selected ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50"
              }`}
              aria-pressed={selected}
            >
              <span className="block text-[11px] opacity-80">{f.week}</span>
              <span className="block text-base font-semibold leading-tight">{f.num}</span>
              <span className={`mt-1 mx-auto block h-1.5 w-1.5 rounded-full ${free > 0 ? (selected ? "bg-primary-foreground" : "bg-green-500") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      {cells === null ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando a agenda...
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {dayCells.map((c) => {
            const selected = value?.date === c.date && value.start === c.start;
            return (
              <button
                key={c.start}
                type="button"
                disabled={!c.free}
                aria-pressed={selected}
                onClick={() => onChange(selected ? null : { date: c.date, start: c.start })}
                className={`rounded-md border py-2 text-sm transition-smooth ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : c.free
                      ? "border-green-500/50 bg-green-500/10 hover:bg-green-500/20"
                      : "border-border bg-muted/40 text-muted-foreground/60 line-through cursor-not-allowed"
                }`}
              >
                {c.start}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-500/50" />Disponível</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />Indisponível</span>
      </div>
    </div>
  );
};
