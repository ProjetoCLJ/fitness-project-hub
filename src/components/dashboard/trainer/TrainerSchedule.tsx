import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Calendar as CalendarIcon, Clock, Lock, MapPin, Settings2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AvailabilityRuleInput,
  ScheduleSlot,
  addAvailabilityRule,
  cancelBooking,
  getScheduleConflicts,
  getSlotsForDate,
  toggleBlockedSlot,
} from "@/lib/agendaStore";

interface TrainerScheduleProps {
  trainerId?: string;
  /** Chamado após qualquer alteração que afete reservas (cancelamento, bloqueio, novo expediente). */
  onBookingsChange?: () => void;
}

const WEEKDAYS = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const statusStyles: Record<ScheduleSlot["status"], string> = {
  available: "border-border hover:shadow-soft cursor-pointer",
  booked: "border-destructive/30 bg-destructive/10 cursor-pointer",
  blocked: "border-destructive/30 bg-destructive/10 cursor-pointer",
  outside: "border-border/50 bg-muted/30 opacity-50 cursor-default",
  past: "border-border/50 bg-muted/30 opacity-50 cursor-default",
};

const TrainerSchedule = ({ trainerId = "trainer-1", onBookingsChange }: TrainerScheduleProps) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailSlot, setDetailSlot] = useState<ScheduleSlot | null>(null);

  const dateISO = format(selectedDate, "yyyy-MM-dd");
  const slots = useMemo(() => getSlotsForDate(dateISO, trainerId), [dateISO, trainerId, refreshKey]);
  const conflicts = useMemo(() => getScheduleConflicts(trainerId), [trainerId, refreshKey]);

  const currentYear = new Date().getFullYear();

  const refresh = () => setRefreshKey((k) => k + 1);

  const goToConflict = (date: string) => {
    setSelectedDate(new Date(`${date}T00:00:00`));
    toast({ title: "Inconsistência selecionada", description: "Resolva reagendando, cancelando ou ajustando o expediente deste dia." });
  };

  const handleSlotClick = (slot: ScheduleSlot) => {
    if (slot.status === "outside" || slot.status === "past") return;
    setDetailSlot(slot);
  };

  const handleToggleBlock = () => {
    if (!detailSlot) return;
    const result = toggleBlockedSlot(dateISO, detailSlot.start, detailSlot.end, trainerId);
    if (result.ok) {
      toast(
        detailSlot.status === "blocked"
          ? { title: "Horário desbloqueado" }
          : { title: "Horário bloqueado", description: "Esse horário não ficará disponível para agendamento." }
      );
      setDetailSlot(null);
      refresh();
    }
  };

  const handleCancelBooking = () => {
    if (!detailSlot?.booking) return;
    cancelBooking(detailSlot.booking.id);
    toast({ title: "Aula cancelada", description: "O horário voltou a ficar disponível." });
    setDetailSlot(null);
    refresh();
    onBookingsChange?.();
  };

  return (
    <div className="space-y-4">
      {conflicts.length > 0 && (
        <Card className="p-4 border-destructive/40 bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">
                {conflicts.length === 1
                  ? "1 aula agendada ficou fora do seu expediente"
                  : `${conflicts.length} aulas agendadas ficaram fora do seu expediente`}
              </p>
              <div className="flex flex-wrap gap-2">
                {conflicts.map((c) => (
                  <Badge
                    key={c.bookingId}
                    variant="outline"
                    className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => goToConflict(c.date)}
                  >
                    {format(new Date(`${c.date}T00:00:00`), "dd/MM", { locale: ptBR })} · {c.startTime} · {c.clientName}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Selecione a Data
        </h2>

        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={ptBR}
            captionLayout="dropdown-buttons"
            fromYear={currentYear - 1}
            toYear={currentYear + 3}
            className="rounded-md border"
          />
        </div>

        <Separator className="my-5" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Horários de {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
          </h3>
          <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Definir horários
          </Button>
        </div>

        <div className="space-y-2">
          {slots.map((slot) => (
            <div
              key={slot.start}
              onClick={() => handleSlotClick(slot)}
              className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg transition-smooth ${statusStyles[slot.status]}`}
            >
              <div className="flex items-center gap-3">
                {slot.status === "blocked" ? (
                  <Lock className="h-4 w-4 text-destructive" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-sm sm:text-base">
                  {slot.start} - {slot.end}
                </span>
              </div>

              {slot.status === "booked" && slot.booking && (
                <span className="text-sm font-medium text-destructive">{slot.booking.clientName}</span>
              )}
              {slot.status === "blocked" && <span className="text-sm text-destructive">Bloqueado</span>}
              {slot.status === "outside" && <span className="text-xs text-muted-foreground">Fora do expediente</span>}
              {slot.status === "past" && <span className="text-xs text-muted-foreground">Encerrado</span>}
            </div>
          ))}
        </div>
      </Card>

      <ScheduleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        trainerId={trainerId}
        defaultDate={dateISO}
        onSaved={() => {
          refresh();
          setWizardOpen(false);
        }}
      />

      <Dialog open={!!detailSlot} onOpenChange={(open) => !open && setDetailSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detailSlot?.status === "booked" && "Detalhes da aula"}
              {detailSlot?.status === "blocked" && "Horário bloqueado"}
              {detailSlot?.status === "available" && "Horário disponível"}
            </DialogTitle>
            <DialogDescription>
              {detailSlot && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} · {detailSlot?.start} - {detailSlot?.end}
            </DialogDescription>
          </DialogHeader>

          {detailSlot?.status === "booked" && detailSlot.booking && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{detailSlot.booking.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{detailSlot.booking.location || "Local não informado"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast({ title: "Em breve", description: "Solicitação de troca de horário ainda não está disponível." })}
                >
                  Solicitar troca de horário
                </Button>
                <Button variant="destructive" className="w-full" onClick={handleCancelBooking}>
                  Cancelar aula
                </Button>
              </div>
            </div>
          )}

          {detailSlot?.status === "blocked" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este horário está bloqueado manualmente e não aparece como disponível para agendamento.
              </p>
              <Button className="w-full" onClick={handleToggleBlock}>
                Desbloquear horário
              </Button>
            </div>
          )}

          {detailSlot?.status === "available" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este horário está livre para os alunos agendarem. Você pode bloqueá-lo se não quiser atender nesse período.
              </p>
              <Button variant="destructive" className="w-full" onClick={handleToggleBlock}>
                <Lock className="h-4 w-4 mr-2" />
                Bloquear horário
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Assistente de configuração de horários ----------

interface ScheduleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerId: string;
  defaultDate: string;
  onSaved: () => void;
}

const ScheduleWizard = ({ open, onOpenChange, trainerId, defaultDate, onSaved }: ScheduleWizardProps) => {
  const { toast } = useToast();
  const [recurrence, setRecurrence] = useState<"once" | "weekly">("once");
  const [onceDate, setOnceDate] = useState(defaultDate);
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [startMode, setStartMode] = useState<"today" | "date">("today");
  const [startDateInput, setStartDateInput] = useState(todayISO());
  const [endMode, setEndMode] = useState<"never" | "date">("never");
  const [endDateInput, setEndDateInput] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");

  const reset = () => {
    setRecurrence("once");
    setOnceDate(defaultDate);
    setWeekdays([]);
    setStartMode("today");
    setStartDateInput(todayISO());
    setEndMode("never");
    setEndDateInput("");
    setStartTime("08:00");
    setEndTime("18:00");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSave = () => {
    if (startTime >= endTime) {
      toast({ title: "Horário inválido", description: "O início deve ser antes do fim.", variant: "destructive" });
      return;
    }

    let input: AvailabilityRuleInput;

    if (recurrence === "once") {
      input = {
        recurrence: "once",
        date: onceDate,
        startDate: onceDate,
        endDate: onceDate,
        startTime,
        endTime,
      };
    } else {
      if (weekdays.length === 0) {
        toast({ title: "Selecione ao menos um dia", variant: "destructive" });
        return;
      }
      if (endMode === "date" && !endDateInput) {
        toast({ title: "Escolha a data final", variant: "destructive" });
        return;
      }
      input = {
        recurrence: "weekly",
        weekdays: weekdays.map(Number),
        startDate: startMode === "today" ? todayISO() : startDateInput,
        endDate: endMode === "never" ? null : endDateInput,
        startTime,
        endTime,
      };
    }

    addAvailabilityRule(input, trainerId);

    const conflicts = getScheduleConflicts(trainerId);
    toast({
      title: "Horários atualizados",
      description:
        conflicts.length > 0
          ? "Atenção: essa alteração gerou inconsistências com aulas já agendadas. Veja o alerta no topo da agenda."
          : "As novas janelas de expediente já estão disponíveis para agendamento.",
      variant: conflicts.length > 0 ? "destructive" : "default",
    });

    onSaved();
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Definir horários de atendimento</DialogTitle>
          <DialogDescription>Configure um dia específico ou uma recorrência, como no Google Agenda.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <RadioGroup value={recurrence} onValueChange={(v) => setRecurrence(v as "once" | "weekly")} className="grid grid-cols-1 gap-2">
            <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer">
              <RadioGroupItem value="once" id="rec-once" />
              <span className="text-sm">Não se repete (só neste dia)</span>
            </label>
            <label className="flex items-center gap-2 p-3 border rounded-md cursor-pointer">
              <RadioGroupItem value="weekly" id="rec-weekly" />
              <span className="text-sm">Repetir</span>
            </label>
          </RadioGroup>

          {recurrence === "once" && (
            <div className="space-y-2">
              <Label htmlFor="once-date">Data</Label>
              <Input id="once-date" type="date" value={onceDate} onChange={(e) => setOnceDate(e.target.value)} />
            </div>
          )}

          {recurrence === "weekly" && (
            <>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <ToggleGroup type="multiple" value={weekdays} onValueChange={setWeekdays} className="flex-wrap justify-start">
                  {WEEKDAYS.map((d) => (
                    <ToggleGroupItem key={d.value} value={d.value} className="h-9 w-12">
                      {d.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => setWeekdays(weekdays.length === 7 ? [] : WEEKDAYS.map((d) => d.value))}
                >
                  {weekdays.length === 7 ? "Limpar seleção" : "Selecionar todos os dias"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Início da recorrência</Label>
                <RadioGroup value={startMode} onValueChange={(v) => setStartMode(v as "today" | "date")} className="grid grid-cols-1 gap-2">
                  <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer">
                    <RadioGroupItem value="today" id="start-today" />
                    <span className="text-sm">Começar hoje</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer">
                    <RadioGroupItem value="date" id="start-date" />
                    <span className="text-sm">Em uma data específica</span>
                  </label>
                </RadioGroup>
                {startMode === "date" && (
                  <Input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Fim da recorrência</Label>
                <RadioGroup value={endMode} onValueChange={(v) => setEndMode(v as "never" | "date")} className="grid grid-cols-1 gap-2">
                  <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer">
                    <RadioGroupItem value="never" id="end-never" />
                    <span className="text-sm">Nunca</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer">
                    <RadioGroupItem value="date" id="end-date" />
                    <span className="text-sm">Em uma data</span>
                  </label>
                </RadioGroup>
                {endMode === "date" && <Input type="date" value={endDateInput} onChange={(e) => setEndDateInput(e.target.value)} />}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wizard-start-time">Início</Label>
              <Input id="wizard-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-end-time">Fim</Label>
              <Input id="wizard-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <Button variant="hero" className="w-full" onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrainerSchedule;
