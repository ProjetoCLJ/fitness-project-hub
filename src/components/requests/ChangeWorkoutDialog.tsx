import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarClock, Loader2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toLocalISO } from "@/lib/agendaStore";
import { Plan, Workout, WEEKDAY_SHORT, fetchSlotsForPlans } from "@/lib/planStore";
import { fetchPlanChanges, occurrencesOn } from "@/lib/planChanges";
import { WorkoutRequestKind, createWorkoutRequest, fetchWorkoutRequests } from "@/lib/workoutRequests";
import { AgendaPicker, PickedSlot } from "@/components/requests/AgendaPicker";

interface Occurrence {
  date: string;
  time: string | null;
}

interface ChangeWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: Workout;
  plan: Plan;
  /** "student": o aluno pede ao professor dele; "trainer": o profissional pede para o aluno do treino. */
  as: "student" | "trainer";
  trainerId: string;
  /** Nome da outra pessoa (para os textos). */
  counterpart: string;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};

const fmtWhen = (iso: string, time: string | null) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}${time ? ` · ${time}` : ""}`;
};

type Step = "type" | "slot" | "cancel";

/** Pedido de mudança de horário/dia ou cancelamento feito direto da tela do treino (antes de iniciar). */
export const ChangeWorkoutDialog = ({ open, onOpenChange, workout, plan, as, trainerId, counterpart }: ChangeWorkoutDialogProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("type");
  const [occurrences, setOccurrences] = useState<Occurrence[] | null>(null);
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState(0);
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("type");
    setSel(0);
    setSlot(null);
    setMessage("");
    setOccurrences(null);
    let alive = true;
    (async () => {
      const today = toLocalISO(new Date());
      const to = addDays(today, 14);
      try {
        const [slots, changes, requests] = await Promise.all([
          fetchSlotsForPlans([plan.id], today, to),
          fetchPlanChanges([plan.id], today, to),
          fetchWorkoutRequests().catch(() => []),
        ]);
        const byDate = new Map(slots.filter((s) => s.workoutId === workout.id).map((s) => [s.date, s]));
        const found: Occurrence[] = [];
        for (let i = 0; i <= 14; i++) {
          const date = addDays(today, i);
          if (!occurrencesOn(plan, date, changes).some((w) => w.id === workout.id)) continue;
          const s = byDate.get(date);
          const accompanied = s ? s.accompanied : workout.accompanied;
          if (!accompanied || (s && s.status !== "pending")) continue;
          found.push({ date, time: s ? s.startTime ?? workout.startTime : workout.startTime });
        }
        const pending = new Set(requests.filter((r) => r.status === "pending" && r.workoutId === workout.id).map((r) => r.fromDate));
        if (alive) {
          setPendingDates(pending);
          setOccurrences(found);
          const firstFree = found.findIndex((o) => !pending.has(o.date));
          setSel(Math.max(0, firstFree));
        }
      } catch {
        if (alive) setOccurrences([]);
        toast({ title: "Não foi possível carregar as datas do treino", variant: "destructive" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, plan, workout, toast]);

  const current = occurrences?.[sel];
  const alreadyPending = !!current && pendingDates.has(current.date);

  const send = async (kind: WorkoutRequestKind) => {
    if (!current) return;
    if (kind === "reschedule" && !slot) return;
    setBusy(true);
    try {
      await createWorkoutRequest({ workoutId: workout.id, fromDate: current.date, kind, toDate: slot?.date, toStart: slot?.start, message });
      toast({ title: "Solicitação enviada", description: `${counterpart} vai receber o aviso. Acompanhe em Solicitações.` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Não foi possível enviar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const messageField = (
    <div className="space-y-2">
      <Label htmlFor="chg-msg">Mensagem (opcional)</Label>
      <Textarea id="chg-msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explique o motivo, se quiser." />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar mudança</DialogTitle>
          <DialogDescription>
            {workout.name} · {counterpart}
          </DialogDescription>
        </DialogHeader>

        {occurrences === null ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : occurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Este treino não tem nenhuma data acompanhada nos próximos 14 dias. Só treinos feitos com o profissional podem ser alterados por aqui.
          </p>
        ) : (
          <>
            {occurrences.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qual data?</p>
                <div className="flex flex-wrap gap-2">
                  {occurrences.map((o, i) => (
                    <button
                      key={o.date}
                      type="button"
                      onClick={() => {
                        setSel(i);
                        setSlot(null);
                      }}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-smooth ${
                        i === sel ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50"
                      }`}
                    >
                      {fmtWhen(o.date, o.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {occurrences.length === 1 && current && (
              <p className="text-sm text-muted-foreground">
                Treino marcado para <strong className="text-foreground">{fmtWhen(current.date, current.time)}</strong>
              </p>
            )}

            {alreadyPending ? (
              <div className="space-y-3 text-center py-2">
                <p className="text-sm text-muted-foreground">Já existe uma solicitação pendente para esse treino nessa data.</p>
                <Button variant="outline" size="sm" onClick={() => navigate(as === "trainer" ? "/dashboard/trainer/requests" : "/dashboard/student/requests")}>
                  Ver em Solicitações
                </Button>
              </div>
            ) : (
              <>
                {step !== "type" && (
                  <Button variant="ghost" size="sm" className="self-start" onClick={() => setStep("type")}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                )}

                {step === "type" && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setStep("slot")}
                      className="w-full flex items-start gap-3 rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-muted/50 transition-smooth"
                    >
                      <CalendarClock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span>
                        <span className="block font-semibold">Mudar o dia ou horário</span>
                        <span className="block text-sm text-muted-foreground">
                          {as === "trainer" ? "Encaixe um novo horário na sua agenda." : "Escolha outro horário livre na agenda do profissional."}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("cancel")}
                      className="w-full flex items-start gap-3 rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-muted/50 transition-smooth"
                    >
                      <XCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span>
                        <span className="block font-semibold">Cancelar este treino</span>
                        <span className="block text-sm text-muted-foreground">Avise que ele não vai acontecer nessa data.</span>
                      </span>
                    </button>
                  </div>
                )}

                {step === "slot" && current && (
                  <div className="space-y-4">
                    <AgendaPicker
                      trainerId={trainerId}
                      value={slot}
                      onChange={setSlot}
                      exclude={{ workoutId: workout.id, date: current.date }}
                      detailed={as === "trainer"}
                    />
                    {slot && (
                      <p className="text-sm">
                        Novo horário: <strong>{fmtWhen(slot.date, slot.start)}</strong>
                      </p>
                    )}
                    {messageField}
                    <Button variant="hero" className="w-full" disabled={!slot || busy} onClick={() => send("reschedule")}>
                      {busy ? "Enviando..." : "Enviar solicitação"}
                    </Button>
                  </div>
                )}

                {step === "cancel" && current && (
                  <div className="space-y-4">
                    <p className="text-sm">
                      Cancelar <strong>{workout.name}</strong> em {fmtWhen(current.date, current.time)}?
                    </p>
                    {messageField}
                    <Button variant="destructive" className="w-full" disabled={busy} onClick={() => send("cancel")}>
                      {busy ? "Enviando..." : "Enviar pedido de cancelamento"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
