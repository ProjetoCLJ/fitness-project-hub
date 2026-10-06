import { useCallback, useEffect, useMemo, useState } from "react";
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
  LinkedStudent,
  ScheduleEvent,
  ScheduleEventInput,
  ScheduleSlot,
  createScheduleEvent,
  deleteScheduleEvent,
  eventTitle,
  fetchLinkedStudents,
  fetchTrainerEvents,
  getScheduleConflicts,
  getSlotsForDate,
  toLocalISO,
  updateScheduleEvent,
} from "@/lib/agendaStore";
import { requestReschedule } from "@/lib/requestsStore";

interface TrainerScheduleProps {
  trainerId: string;
  /** Chamado após qualquer alteração que possa afetar agendamentos. */
  onBookingsChange?: () => void;
  /** Incremente esse número (fora do componente) para forçar a releitura dos eventos. */
  refreshSignal?: number;
}

const statusStyles: Record<ScheduleSlot["status"], string> = {
  available: "border-border bg-background hover:shadow-soft",
  aula: "border-primary/40 bg-primary/15 text-primary",
  bloqueado: "border-destructive/60 bg-destructive/30 text-destructive font-medium",
  fora_expediente: "border-destructive/25 bg-destructive/5 text-destructive/70",
};

interface SlotContext {
  date: string;
  start: string;
  end: string;
  /** Aula ou bloqueio existente (modo edição) ou expediente aberto para edição. */
  event?: ScheduleEvent;
  /** Expediente que cobre o horário clicado (permite abrir a edição dele). */
  expedienteEvent?: ScheduleEvent;
  defaultType?: EventType;
}

const TrainerSchedule = ({ trainerId, onBookingsChange, refreshSignal = 0 }: TrainerScheduleProps) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState<SlotContext | null>(null);

  const dateISO = format(selectedDate, "yyyy-MM-dd");
  const slots = useMemo(() => getSlotsForDate(events, dateISO), [events, dateISO]);
  const conflicts = useMemo(() => getScheduleConflicts(events), [events]);
  const currentYear = new Date().getFullYear();

  const reload = useCallback(async () => {
    try {
      const [loadedEvents, loadedStudents] = await Promise.all([fetchTrainerEvents(trainerId), fetchLinkedStudents(trainerId)]);
      setEvents(loadedEvents);
      setStudents(loadedStudents);
    } catch {
      toast({ title: "Não foi possível carregar a agenda", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [trainerId, toast]);

  useEffect(() => {
    reload();
  }, [reload, refreshSignal]);

  const goToConflict = (date: string) => {
    setSelectedDate(new Date(`${date}T00:00:00`));
    toast({ title: "Inconsistência selecionada", description: "Resolva desbloqueando o horário ou reagendando a aula." });
  };

  const openSlot = (slot: ScheduleSlot) => {
    if (slot.event?.type === "expediente") {
      setContext({ date: dateISO, start: slot.start, end: slot.end, expedienteEvent: slot.event, defaultType: "aula" });
    } else {
      setContext({ date: dateISO, start: slot.start, end: slot.end, event: slot.event, defaultType: "expediente" });
    }
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
            onClick={() => setContext({ date: dateISO, start: "08:00", end: "18:00", defaultType: "expediente" })}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Definir horários
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando agenda...</p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.start}
                onClick={() => openSlot(slot)}
                className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg transition-smooth cursor-pointer ${statusStyles[slot.status]} ${slot.isPast ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-sm sm:text-base">
                    {slot.start} - {slot.end}
                  </span>
                </div>
                {slot.event && slot.event.type !== "expediente" && (
                  <span className="text-sm truncate max-w-[55%] text-right">{eventTitle(slot.event)}</span>
                )}
                {slot.status === "fora_expediente" && <span className="text-xs">Fora de expediente</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {context && (
        <EventDialog
          key={`${context.date}-${context.start}-${context.event?.id ?? "new"}`}
          context={context}
          trainerId={trainerId}
          students={students}
          onEditExpediente={(expediente) => setContext({ ...context, event: expediente, expedienteEvent: undefined })}
          onClose={() => setContext(null)}
          onSaved={async () => {
            setContext(null);
            await reload();
            onBookingsChange?.();
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
  expediente: "Expediente",
  bloqueado: "Bloqueado",
};

interface EventDialogProps {
  context: SlotContext;
  trainerId: string;
  students: LinkedStudent[];
  onEditExpediente: (event: ScheduleEvent) => void;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const EventDialog = ({ context, trainerId, students, onEditExpediente, onClose, onSaved }: EventDialogProps) => {
  const { toast } = useToast();
  const event = context.event;
  const isEditing = !!event;
  const isSeries = event?.recurrence === "weekly";
  const today = toLocalISO(new Date());

  const [type, setType] = useState<EventType>(event?.type ?? context.defaultType ?? "expediente");
  const [title, setTitle] = useState(event?.title ?? "");
  const [studentIds, setStudentIds] = useState<string[]>(event?.studentIds.length ? event.studentIds : [""]);
  const [recurrence, setRecurrence] = useState<"once" | "weekly">(event?.recurrence ?? "once");
  const [onceDate, setOnceDate] = useState(event?.date ?? context.date);
  const [weekdays, setWeekdays] = useState<string[]>(event?.weekdays?.map(String) ?? []);
  const [startMode, setStartMode] = useState<"today" | "date">(event?.startDate && event.startDate !== today ? "date" : "today");
  const [startDateInput, setStartDateInput] = useState(event?.startDate ?? today);
  const [endMode, setEndMode] = useState<"never" | "date">(event?.endDate ? "date" : "never");
  const [endDateInput, setEndDateInput] = useState(event?.endDate ?? "");
  const [startTime, setStartTime] = useState(event?.startTime ?? context.start);
  const [endTime, setEndTime] = useState(event?.endTime ?? context.end);
  const [pendingScopeAction, setPendingScopeAction] = useState<"save" | "delete" | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const setStudentAt = (index: number, value: string) => setStudentIds((prev) => prev.map((s, i) => (i === index ? value : s)));
  const removeStudentRow = (index: number) => setStudentIds((prev) => prev.filter((_, i) => i !== index));
  const addStudentRow = () => setStudentIds((prev) => [...prev, ""]);

  const buildPatch = (): ScheduleEventInput | null => {
    if (startTime >= endTime) {
      toast({ title: "Horário inválido", description: "O início deve ser antes do fim.", variant: "destructive" });
      return null;
    }

    const chosenStudents = Array.from(new Set(studentIds.filter(Boolean)));
    if (type === "aula" && chosenStudents.length === 0) {
      toast({ title: "Selecione ao menos um aluno", variant: "destructive" });
      return null;
    }

    const base = {
      type,
      title: type === "bloqueado" ? title.trim() || undefined : undefined,
      studentIds: type === "aula" ? chosenStudents : [],
      startTime,
      endTime,
    };

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
      startDate: startMode === "today" ? today : startDateInput,
      endDate: endMode === "never" ? null : endDateInput,
    };
  };

  const run = async (action: () => Promise<void>, successTitle: string, successDescription?: string) => {
    setIsBusy(true);
    try {
      await action();
      toast({ title: successTitle, description: successDescription });
      await onSaved();
    } catch (error) {
      toast({
        title: "Não foi possível concluir",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const applySave = (scope: EditScope) => {
    const patch = buildPatch();
    if (!patch) return;
    run(
      async () => {
        if (event) await updateScheduleEvent(event, context.date, scope, patch);
        else await createScheduleEvent(trainerId, patch);
      },
      isEditing ? "Evento atualizado" : "Evento criado",
      `${TYPE_LABEL[type]} salvo com sucesso.`
    );
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
    run(() => deleteScheduleEvent(event, context.date, scope), "Evento cancelado", "O horário foi liberado.");
  };

  const handleDeleteClick = () => {
    if (!event) return;
    if (isSeries) {
      setPendingScopeAction("delete");
      return;
    }
    applyDelete("all");
  };

  const typeLocked = isEditing;

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? `Editar ${TYPE_LABEL[type].toLowerCase()}` : "Definir horário"}</DialogTitle>
            <DialogDescription>
              {isEditing && isSeries
                ? "Este horário faz parte de um evento recorrente."
                : "Configure um dia específico ou uma recorrência, como no Google Agenda."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {!isEditing && context.expedienteEvent && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => onEditExpediente(context.expedienteEvent as ScheduleEvent)}
              >
                Este horário está dentro de um expediente — editar o expediente
              </Button>
            )}

            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={type === t ? "hero" : "outline"}
                    size="sm"
                    disabled={typeLocked && type !== t}
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
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Você ainda não tem alunos vinculados. Convide um aluno na aba Clientes para poder agendar aulas.
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {studentIds.map((studentId, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            value={studentId}
                            onChange={(e) => setStudentAt(index, e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="">Selecione um aluno</option>
                            {students.map((s) => (
                              <option key={s.studentId} value={s.studentId}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          {studentIds.length > 1 && (
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
                  </>
                )}
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
                <Label htmlFor="event-start-time">{type === "expediente" ? "Início do expediente" : "Início"}</Label>
                <Input id="event-start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end-time">{type === "expediente" ? "Fim do expediente" : "Fim"}</Label>
                <Input id="event-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="hero" className="w-full" onClick={handleSaveClick} disabled={isBusy}>
                Salvar
              </Button>
              {isEditing && event?.type === "aula" && (
                <Button variant="outline" className="w-full" onClick={() => setRescheduleOpen(true)} disabled={isBusy}>
                  Solicitar troca de horário
                </Button>
              )}
              {isEditing && (
                <Button variant="destructive" className="w-full" onClick={handleDeleteClick} disabled={isBusy}>
                  Cancelar evento
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {event && (
        <RescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          eventId={event.id}
          occurrenceDate={context.date}
          defaultStart={event.startTime}
          defaultEnd={event.endTime}
          onSent={() => {
            setRescheduleOpen(false);
            toast({ title: "Pedido enviado", description: "O aluno vai ver o pedido na aba Solicitações." });
          }}
        />
      )}

      <Dialog open={!!pendingScopeAction} onOpenChange={(open) => !open && setPendingScopeAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Este é um evento recorrente</DialogTitle>
            <DialogDescription>O que você deseja {pendingScopeAction === "delete" ? "cancelar" : "alterar"}?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {(
              [
                ["this", "Somente este evento"],
                ["following", "Este e os próximos eventos"],
                ["all", "Todos os eventos"],
              ] as [EditScope, string][]
            ).map(([scope, label]) => (
              <Button
                key={scope}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  if (pendingScopeAction === "delete") applyDelete(scope);
                  else applySave(scope);
                  setPendingScopeAction(null);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ---------- Pedido de troca de horário (aula já marcada) ----------

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  occurrenceDate: string;
  defaultStart: string;
  defaultEnd: string;
  onSent: () => void;
}

export const RescheduleDialog = ({ open, onOpenChange, eventId, occurrenceDate, defaultStart, defaultEnd, onSent }: RescheduleDialogProps) => {
  const { toast } = useToast();
  const [date, setDate] = useState(occurrenceDate);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [isBusy, setIsBusy] = useState(false);

  const send = async () => {
    if (!date || start >= end) {
      toast({ title: "Horário inválido", description: "Confira a data e o início/fim.", variant: "destructive" });
      return;
    }
    setIsBusy(true);
    try {
      await requestReschedule(eventId, occurrenceDate, date, start, end);
      onSent();
    } catch (error) {
      toast({ title: "Não foi possível enviar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar troca de horário</DialogTitle>
          <DialogDescription>Sugira um novo dia e horário. A outra pessoa precisa aceitar para a aula mudar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resched-date">Novo dia</Label>
            <Input id="resched-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resched-start">Início</Label>
              <Input id="resched-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resched-end">Fim</Label>
              <Input id="resched-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <Button variant="hero" className="w-full" onClick={send} disabled={isBusy}>
            Enviar pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TrainerSchedule;
