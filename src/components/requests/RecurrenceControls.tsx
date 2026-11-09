import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { fetchRecurrenceConflicts } from "@/lib/workoutRequests";
import type { PickedSlot } from "@/components/requests/AgendaPicker";

export type RequestScope = "single" | "all";

const fmtShort = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fmtLong = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });

interface ScopeChoiceProps {
  value: RequestScope;
  onChange: (scope: RequestScope) => void;
  workoutName: string;
  /** Data do treino que está sendo alterado. */
  fromDate: string;
}

/** "Só este treino" ou "Todas as semanas": só aparece para treinos que se repetem (plano em ciclo). */
export const ScopeChoice = ({ value, onChange, workoutName, fromDate }: ScopeChoiceProps) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vale para</p>
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          ["single", "Só este treino", fmtShort(fromDate)],
          ["all", "Todas as semanas", "daqui para frente"],
        ] as const
      ).map(([key, title, sub]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`rounded-lg border p-2.5 text-left transition-smooth ${
            value === key ? "border-primary bg-primary/10" : "hover:border-primary/50"
          }`}
        >
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{sub}</span>
        </button>
      ))}
    </div>
    {value === "all" && (
      <p className="text-xs text-muted-foreground">
        O treino <strong className="text-foreground">{workoutName}</strong> (o de {fmtLong(fromDate)}) passa para o novo dia da semana e horário em todas as
        semanas, daqui para frente. Os treinos que já aconteceram continuam registrados como foram, e os outros treinos do plano não mudam. Escolha o novo dia
        dentro desta mesma semana.
      </p>
    )}
  </div>
);

/** Datas das próximas repetições em que o novo horário está ocupado (null enquanto carrega ou sem escolha). */
export const useRecurrenceConflicts = (workoutId: string | undefined, slot: PickedSlot | null): string[] | null => {
  const [dates, setDates] = useState<string[] | null>(null);
  useEffect(() => {
    setDates(null);
    if (!workoutId || !slot) return;
    let alive = true;
    fetchRecurrenceConflicts(workoutId, slot.date, slot.start)
      .then((d) => alive && setDates(d))
      .catch(() => alive && setDates([]));
    return () => {
      alive = false;
    };
  }, [workoutId, slot?.date, slot?.start]);
  return dates;
};

/** Aviso (não bloqueia o envio): quem recebe decide o que fazer com os conflitos. */
export const ConflictNote = ({ dates, who = "O profissional" }: { dates: string[] | null; who?: string }) => {
  if (!dates || dates.length === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <p>
        Nas próximas semanas esse horário está ocupado em <strong>{dates.map(fmtShort).join(", ")}</strong>. Você pode enviar mesmo assim: {who} decide o que
        fazer.
      </p>
    </div>
  );
};
