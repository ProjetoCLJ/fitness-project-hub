import { useState } from "react";
import { ChevronRight, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { ScheduleEvent, toLocalISO } from "@/lib/agendaStore";
import { fmtMin, toMin } from "@/lib/dayLayout";
import { trainerChangeWorkout } from "@/lib/workoutRequests";

interface PlanEventDialogProps {
  /** Evento de agenda vindo de um treino acompanhado do plano de um aluno. */
  event: ScheduleEvent | null;
  /** Dia do evento (AAAA-MM-DD). */
  dateISO: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onOpenStudent: (studentId: string) => void;
  onStart: (studentId: string, workoutId: string) => void;
}

const WEEKDAYS = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
  { value: "0", label: "Dom" },
];

/** A data, dentro da mesma semana (segunda a domingo), que cai no dia da semana pedido. */
const dateInWeekOf = (iso: string, weekday: number) => {
  const d = new Date(`${iso}T00:00:00`);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  monday.setDate(monday.getDate() + ((weekday + 6) % 7));
  return toLocalISO(monday);
};

/**
 * Modal de uma aula marcada a partir do plano do aluno: o mesmo formato do modal de horários, preenchido com os dados do
 * treino. Dia e horário podem ser mudados aqui e valem no plano e na agenda do aluno.
 */
export const PlanEventDialog = ({ event, dateISO, onClose, onSaved, onOpenStudent, onStart }: PlanEventDialogProps) => {
  const { toast } = useToast();
  const info = event?.fromPlan;
  const student = event?.studentNames[0] ?? "Aluno";
  const today = toLocalISO(new Date());
  const weekdayOfEvent = new Date(`${dateISO}T00:00:00`).getDay();

  const [scope, setScope] = useState<"single" | "all">("single");
  const [date, setDate] = useState(dateISO);
  const [weekday, setWeekday] = useState(String(weekdayOfEvent));
  const [start, setStart] = useState(event?.startTime ?? "08:00");
  const [busy, setBusy] = useState(false);

  const recurring = !!info?.cycleWeeks;
  const end = fmtMin(Math.min(toMin(start || "00:00") + 60, 1439));

  const save = async () => {
    if (!event || !info) return;
    if (!start) {
      toast({ title: "Informe o horário", variant: "destructive" });
      return;
    }
    const toDate = scope === "all" ? dateInWeekOf(dateISO, Number(weekday)) : date;
    if (scope === "single" && toDate < today) {
      toast({ title: "Dia inválido", description: "Escolha hoje ou um dia futuro.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await trainerChangeWorkout({ workoutId: info.workoutId, fromDate: dateISO, toDate, start, scope });
      toast({
        title: "Treino atualizado",
        description: scope === "all" ? "Vale em todas as semanas, daqui para frente, no plano e na agenda do aluno." : "O plano e a agenda do aluno foram atualizados.",
      });
      await onSaved();
    } catch (error) {
      toast({ title: "Não foi possível salvar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar aula</DialogTitle>
          <DialogDescription>Este horário vem do plano de treino do aluno. As mudanças valem no plano e na agenda do aluno.</DialogDescription>
        </DialogHeader>

        {event && info && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant="hero" size="sm">
                  Aula
                </Button>
                <Button type="button" variant="outline" size="sm" disabled>
                  Expediente
                </Button>
                <Button type="button" variant="outline" size="sm" disabled>
                  Bloqueado
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Aluno</Label>
              <div className="flex gap-2">
                <Input value={student} disabled readOnly />
                <Button type="button" variant="outline" size="icon" aria-label="Abrir perfil do aluno" title="Abrir perfil do aluno" onClick={() => onOpenStudent(info.studentId)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Treino</Label>
              <Input value={info.workoutName} disabled readOnly />
              <p className="text-xs text-muted-foreground">Plano: {info.planTitle}</p>
            </div>

            {recurring && (
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as "single" | "all")} className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer">
                  <RadioGroupItem value="single" id="plan-scope-single" />
                  <span className="text-sm">Só neste dia</span>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer">
                  <RadioGroupItem value="all" id="plan-scope-all" />
                  <span className="text-sm">Todas as semanas, daqui para frente</span>
                </label>
              </RadioGroup>
            )}

            {scope === "single" ? (
              <div className="space-y-2">
                <Label htmlFor="plan-event-date">Data</Label>
                <Input id="plan-event-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Dia da semana</Label>
                <ToggleGroup type="single" value={weekday} onValueChange={(v) => v && setWeekday(v)} className="flex-wrap justify-start">
                  {WEEKDAYS.map((d) => (
                    <ToggleGroupItem key={d.value} value={d.value} className="h-9 w-12">
                      {d.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">Os treinos que já aconteceram continuam registrados como foram.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-event-start">Início</Label>
                <Input id="plan-event-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-event-end">Fim</Label>
                <Input id="plan-event-end" type="time" value={end} disabled readOnly />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-3">O treino acompanhado dura 1 hora: o fim acompanha o início.</p>

            <div className="flex flex-col gap-2">
              <Button variant="hero" className="w-full" onClick={save} disabled={busy}>
                {busy ? "Salvando..." : "Salvar"}
              </Button>
              {dateISO === today && (
                <Button variant="outline" className="w-full" onClick={() => onStart(info.studentId, info.workoutId)} disabled={busy}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar treino com o aluno
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
