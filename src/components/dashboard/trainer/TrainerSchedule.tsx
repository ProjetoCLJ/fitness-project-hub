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
import { AlertTriangle, Calendar as CalendarIcon, Clock, Plus, Settings2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  EditScope,
  EventType,
  ScheduleEvent,
  ScheduleEventInput,
  ScheduleSlot,
  createScheduleEvent,
  deleteScheduleEvent,
  eventTitle,
  getKnownStudentNames,
  getScheduleConflicts,
  getSlotsForDate,
  updateScheduleEvent,
} from "@/lib/agendaStore";

interface TrainerScheduleProps {
  trainerId?: string;
  /** Chamado após qualquer alteração que afete reservas (cancelamento de aula vinda de solicitação de aluno). */
  onBookingsChange?: () => void;
  /** Incremente esse número (fora do componente) para forçar a releitura dos eventos — ex.: após aceitar uma solicitação de aluno. */
  refreshSignal?: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const statusStyles: Record<ScheduleSlot["status"], string> = {
  available: "border-border bg-background hover:shadow-soft",
  aula: "border-primary/40 bg-primary/10 text-primary",
  bloqueado: "border-destructive/60 bg-destructive/25 text-destructive font-medium",
  fora_expediente: "border-destructive/25 bg-destructive/5 text-destructive/70",
};

interface SlotContext {
  date: string;
  start: string;
  end: string;
  event?: ScheduleEvent;
}

const TrainerSchedule = ({ trainerId = "trainer-1", onBookingsChange, refreshSignal = 0 }: TrainerScheduleProps) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [context, setContext] = useState<SlotContext | null>(null);

  const dateISO = format(selectedDate, "yyyy-MM-dd");
  const slots = useMemo(() => getSlotsForDate(dateISO, trainerId), [dateISO, trainerId, refreshKey, refreshSignal]);
  const conflicts = useMemo(() => getScheduleConflicts(trainerId), [trainerId, refreshKey, refreshSignal]);

  const currentYear = new Date().getFullYear();

  const refresh = () => setRefreshKey((k) => k + 1);

  const goToConflict = (date: string) => {
    setSelectedDate(new Date(`${date}T00:00:00`));
    toast({ title: "Inconsistência selecionada", description: "Resolva desbloqueando o horário ou reagendando a aula." });
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
                  ? "1 aula agendada está coberta por um bloqueio"
                  : `${conflicts.length} aulas agendadas estão cobertas por um bloqueio`}
              </p>
              <div className="flex flex-wrap gap-2">
                {conflicts.map((c) => (
                  <Badge
                    key={c.eventId}
                    variant="outline"
                    className="cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => goToConflict(c.date)}
                  >
                    {format(new Date(`${c.date}T00:00:00`), "dd/MM", { locale: ptBR })} · {c.startTime} · {c.title}
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => setContext({ date: dateISO, start: "08:00", end: "09:00" })}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Definir horários
          </Button>
        </div>

        <div className="space-y-2">
          {slots.map((slot) => (
            <div
              key={slot.start}
              onClick={() => setContext({ date: dateISO, start: slot.start, end: slot.end, event: slot.event })}
              className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg transition-smooth cursor-pointer ${statusStyles[slot.status]} ${slot.isPast ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="font-medium text-sm sm:text-base">
                  {slot.start} - {slot.end}
                </span>
              </div>
              {slot.event && <span className="text-sm truncate max-w-[55%] text-right">{eventTitle(slot.event)}</span>}
            </div>
          ))}
        </div>
      </Card>

      {context && (
        <EventDialog
          context={context}
          trainerId={trainerId}
          onClose={() => setContext(null)}
          onSaved={() => {
            refresh();
            onBookingsChange?.();
            setContext(null);
          }}
        />
      )}
    </div>
  );
};

// ---------- Modal unificado de evento (criar / editar / cancelar) ----------

const WEEKDAYS = [
  { value: "0", label: "Dom" },
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
];

const TYPE_LABEL: Record<EventType, string> = {
  aula: "Aula",
  fora_expediente: "Fora de expediente",
  bloqueado: "Bloqueado",
};

interface EventDialogProps {
  context: SlotContext;
  trainerId: string;
  onClose: () => void;
  onSaved: () => void;
}

const EventDialog = ({ context, trainerId, onClose, onSaved }: EventDialogProps) => {
  const { toast } = useToast();
  const event = context.event;
  const isEditing = !!event;
  const isSeries = event?.recurrence === "weekly";
  const knownStudents = useMemo(() => getKnownStudentNames(trainerId), [trainerId]);

  const [type, setType] = useState<EventType>(event?.type ?? "aula");
  const [title, setTitle] = useState(event?.title ?? "");
  const [studentNames, setStudentNames] = useState<string[]>(event?.studentNames?.length ? event.studentNames : [""]);
  const [recurrence, setRecurrence] = useState<"once" | "weekly">(event?.recurrence ?? "once");
  const [onceDate, setOnceDate] = useState(event?.date ?? context.date);
  const [weekdays, setWeekdays] = useState<string[]>(event?.weekdays?.map(String) ?? []);
  const [startMode, setStartMode] = useState<"today" | "date">(
    event?.startDate && event.startDate !== todayISO() ? "date" : "today"
  );
  const [startDateInput, setStartDateInput] = useState(event?.startDate ?? todayISO());
  const [endMode, setEndMode] = useState<"never" | "date">(event?.endDate ? "date" : "never");
  const [endDateInput, setEndDateInput] = useState(event?.endDate ?? "");
  const [startTime, setStartTime] = useState(event?.startTime ?? context.start);
  const [endTime, setEndTime] = useState(event?.endTime ?? context.end);
  const [pendingScopeAction, setPendingScopeAction] = useState<"save" | "delete" | null>(null);

  const updateStudentName = (index: number, value: string) => {
    setStudentNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };
  const removeStudentRow = (index: number) => setStudentNames((prev) => prev.filter((_, i) => i !== index));
  const addStudentRow = () => setStudentNames((prev) => [...prev, ""]);

  const buildPatch = (): ScheduleEventInput | null => {
    if (startTime >= endTime) {
      toast({ title: "Horário inválido", description: "O início deve ser antes do fim.", variant: "destructive" });
      return null;
    }

    const base = {
      type,
      title: type === "bloqueado" ? title.trim() || undefined : undefined,
      studentNames: type === "aula" ? studentNames.map((n) => n.trim()).filter(Boolean) : undefined,
      startTime,
      endTime,
      bookingId: event?.bookingId,
    };

    if (type === "aula" && (base.studentNames?.length ?? 0) === 0) {
      toast({ title: "Adicione ao menos um aluno", variant: "destructive" });
      return null;
    }

    if (recurrence === "once") {
      return { ...base, recurrence: "once", date: onceDate, startDate: onceDate, endDate: onceDate };
    }

    if (weekdays.length === 0) {
      toast({ title: "Selecione ao menos um dia", variant: "destructive" });
      return null;
    }
    if (endMode === "date" && !endDateInput) {
      toast({ title: "Escolha a data final", variant: "destructive" });
      return null;
    }

    return {
      ...base,
      recurrence: "weekly",
      weekdays: weekdays.map(Number),
      startDate: startMode === "today" ? todayISO() : startDateInput,
      endDate: endMode === "never" ? null : endDateInput,
    };
  };

  const applySave = (scope: EditScope) => {
    const patch = buildPatch();
    if (!patch) return;

    if (isEditing) {
      updateScheduleEvent(event.id, context.date, scope, patch);
    } else {
      createScheduleEvent(patch, trainerId);
    }

    const conflictNotice =
      type === "bloqueado"
        ? " Verifique o alerta no topo da agenda caso alguma aula já agendada tenha ficado coberta."
        : "";
    toast({ title: isEditing ? "Evento atualizado" : "Evento criado", description: `${TYPE_LABEL[type]} salvo com sucesso.${conflictNotice}` });
    onSaved();
  };

  const handleSaveClick = () => {
    if (!buildPatch()) return;
    if (isSeries) {
      setPendingScopeAction("save");
      return;
    }
    applySave("all");
  };

  const applyDelete = (scope: EditScope) => {
    if (!event) return;
    deleteScheduleEvent(event.id, context.date, scope);
    toast({ title: "Evento cancelado", description: "O horário voltou a ficar disponível." });
    onSaved();
  };

  const handleDeleteClick = () => {
    if (!event) return;
    if (isSeries) {
      setPendingScopeAction("delete");
      return;
    }
    applyDelete("all");
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar horário" : "Definir horário"}</DialogTitle>
            <DialogDescription>
              {isEditing && isSeries
                ? "Este horário faz parte de um evento recorrente."
                : "Configure um dia específico ou uma recorrência, como no Google Agenda."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={type === t ? "hero" : "outline"}
                    size="sm"
                    onClick={() => setType(t)}
                  >
                    {TYPE_LABEL[t]}
                  </Button>
                ))}
              </div>
            </div>

            {type === "aula" && (
              <div className="space-y-2">
                <Label>Alunos</Label>
                <datalist id="known-students">
                  {knownStudents.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <div className="space-y-2">
                  {studentNames.map((name, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        list="known-students"
                        value={name}
                        placeholder="Nome do aluno"
                        onChange={(e) => updateStudentName(index, e.target.value)}
                      />
                      {studentNames.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeStudentRow(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={addStudentRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar aluno
                </Button>
              </div>
            )}

            {type === "bloqueado" && (
              <div className="space-y-2">
                <Label htmlFor="block-title">Título (opcional)</Label>
                <Input
                  id="block-title"
                  value={title}
                  placeholder="Ex.: Compromisso pessoal"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            )}

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
                  {isEditing ? (
                    <Input type="date" value={startDateInput} onChange={(e) => setStartDateInput(e.target.value)} />
                  ) : (
                    <>
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
                    </>
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
                <Label htmlFor="event-start-time">Início</Label>
                <Input id="event-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end-time">Fim</Label>
                <Input id="event-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="hero" className="w-full" onClick={handleSaveClick}>
                Salvar
              </Button>
              {isEditing && (
                <Button variant="destructive" className="w-full" onClick={handleDeleteClick}>
                  Cancelar evento
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingScopeAction} onOpenChange={(open) => !open && setPendingScopeAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Este é um evento recorrente</DialogTitle>
            <DialogDescription>O que você deseja {pendingScopeAction === "delete" ? "cancelar" : "alterar"}?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (pendingScopeAction === "delete") applyDelete("this");
                else applySave("this");
                setPendingScopeAction(null);
              }}
            >
              Somente este evento
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (pendingScopeAction === "delete") applyDelete("following");
                else applySave("following");
                setPendingScopeAction(null);
              }}
            >
              Este e os próximos eventos
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                if (pendingScopeAction === "delete") applyDelete("all");
                else applySave("all");
                setPendingScopeAction(null);
              }}
            >
              Todos os eventos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainerSchedule;
