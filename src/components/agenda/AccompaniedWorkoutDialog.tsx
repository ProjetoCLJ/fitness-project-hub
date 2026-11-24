import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Dumbbell, Play, User } from "lucide-react";
import { ScheduleEvent, toLocalISO } from "@/lib/agendaStore";

interface AccompaniedWorkoutDialogProps {
  /** Evento de agenda vindo de um treino acompanhado do plano de um aluno. */
  event: ScheduleEvent | null;
  /** Dia do evento (AAAA-MM-DD). */
  dateISO: string;
  onClose: () => void;
  onOpenStudent: (studentId: string) => void;
  onStart: (studentId: string, workoutId: string) => void;
}

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

/** Informações de um treino acompanhado (aluno, treino, plano e horário), aberto ao tocar no bloco na agenda. */
export const AccompaniedWorkoutDialog = ({ event, dateISO, onClose, onOpenStudent, onStart }: AccompaniedWorkoutDialogProps) => {
  const info = event?.fromPlan;
  const student = event?.studentNames[0] ?? "Aluno";
  const isToday = dateISO === toLocalISO(new Date());

  const rows = info
    ? [
        { icon: User, label: "Aluno", value: student },
        { icon: Dumbbell, label: "Treino", value: info.workoutName },
        { icon: CalendarDays, label: "Plano", value: info.planTitle },
        { icon: Clock, label: "Horário", value: `${event?.startTime} – ${event?.endTime}` },
      ]
    : [];

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Treino acompanhado
            <Badge variant="secondary">Plano do aluno</Badge>
          </DialogTitle>
          <DialogDescription className="first-letter:uppercase">{fmtDay(dateISO)}</DialogDescription>
        </DialogHeader>

        {info && (
          <div className="space-y-4">
            <div className="rounded-lg border divide-y">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground w-16 shrink-0">{label}</span>
                  <span className="text-sm font-medium min-w-0 truncate">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Este horário vem do plano de treino do aluno. Para mudar o dia ou o horário, edite o treino no plano ou use Solicitações.
            </p>
            <div className="flex flex-col gap-2">
              {isToday && (
                <Button variant="hero" className="w-full" onClick={() => onStart(info.studentId, info.workoutId)}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar treino com o aluno
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => onOpenStudent(info.studentId)}>
                Abrir perfil do aluno
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
