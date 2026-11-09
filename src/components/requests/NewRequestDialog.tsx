import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarClock, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toLocalISO, fetchLinkedStudents } from "@/lib/agendaStore";
import { Plan, Workout, WEEKDAY_SHORT, fetchPlansForStudent, fetchPlansForTrainer, fetchSlots, fetchSlotsForPlans } from "@/lib/planStore";
import { fetchPlanChanges, occurrencesOn } from "@/lib/planChanges";
import { WorkoutRequest, WorkoutRequestKind, createWorkoutRequest } from "@/lib/workoutRequests";
import { AgendaPicker, PickedSlot } from "@/components/requests/AgendaPicker";

interface Candidate {
  key: string;
  workout: Workout;
  plan: Plan;
  date: string;
  time: string | null;
  trainerId: string;
  /** "student": treino do próprio usuário; "trainer": treino de um aluno dele. */
  as: "student" | "trainer";
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

type Step = "type" | "workout" | "slot" | "cancel";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pedidos já em andamento (o mesmo treino/dia não pode ter dois pendentes). */
  requests: WorkoutRequest[];
  onCreated: () => void;
}

const TYPES: { kind: WorkoutRequestKind; title: string; text: string; icon: typeof CalendarClock }[] = [
  { kind: "reschedule", title: "Mudança de horário ou dia", text: "Escolha outro horário livre na agenda do profissional.", icon: CalendarClock },
  { kind: "cancel", title: "Cancelamento de treino", text: "Avise que não vai acontecer neste dia.", icon: XCircle },
];

export const NewRequestDialog = ({ open, onOpenChange, requests, onCreated }: NewRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("type");
  const [kind, setKind] = useState<WorkoutRequestKind>("reschedule");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [chosen, setChosen] = useState<Candidate | null>(null);
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Reinicia ao abrir.
  useEffect(() => {
    if (!open) return;
    setStep("type");
    setKind("reschedule");
    setChosen(null);
    setSlot(null);
    setMessage("");
    setCandidates(null);
  }, [open]);

  // Treinos acompanhados dos próximos 14 dias: os do usuário como aluno e, se for profissional, os dos alunos dele.
  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    (async () => {
      const today = toLocalISO(new Date());
      const to = addDays(today, 14);
      const out: Candidate[] = [];

      const collect = (plans: Plan[], slots: { workoutId: string; date: string; accompanied: boolean; startTime: string | null; status: string }[], changes: Awaited<ReturnType<typeof fetchPlanChanges>>, as: Candidate["as"], nameOf: (p: Plan) => string) => {
        const slotByKey = new Map(slots.map((s) => [`${s.workoutId}|${s.date}`, s]));
        for (let i = 0; i <= 14; i++) {
          const date = addDays(today, i);
          for (const plan of plans) {
            for (const workout of occurrencesOn(plan, date, changes)) {
              const s = slotByKey.get(`${workout.id}|${date}`);
              const accompanied = s ? s.accompanied : workout.accompanied;
              if (!accompanied || (s && s.status !== "pending")) continue;
              out.push({
                key: `${as}|${workout.id}|${date}`,
                workout,
                plan,
                date,
                time: s ? s.startTime ?? workout.startTime : workout.startTime,
                trainerId: plan.trainerId as string,
                as,
                counterpart: nameOf(plan),
              });
            }
          }
        }
      };

      try {
        if (user.studentId) {
          const plans = (await fetchPlansForStudent(user.studentId)).filter((p) => p.status === "active" && p.trainerId);
          if (plans.length > 0) {
            const [slots, changes] = await Promise.all([fetchSlots(user.studentId, today, to), fetchPlanChanges(plans.map((p) => p.id), today, to)]);
            collect(plans, slots, changes, "student", (p) => p.trainerName);
          }
        }
        if (user.trainerId) {
          const plans = await fetchPlansForTrainer(user.trainerId);
          if (plans.length > 0) {
            const students = await fetchLinkedStudents(user.trainerId);
            const names = new Map(students.map((s) => [s.studentId, s.name]));
            const [slots, changes] = await Promise.all([fetchSlotsForPlans(plans.map((p) => p.id), today, to), fetchPlanChanges(plans.map((p) => p.id), today, to)]);
            collect(plans, slots, changes, "trainer", (p) => names.get(p.studentId) ?? "Aluno");
          }
        }
      } catch {
        toast({ title: "Não foi possível carregar seus treinos", variant: "destructive" });
      }
      if (alive) setCandidates(out.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? ""))));
    })();
    return () => {
      alive = false;
    };
  }, [open, user, toast]);

  const free = useMemo(
    () =>
      (candidates ?? []).filter(
        (c) => !requests.some((r) => r.status === "pending" && r.workoutId === c.workout.id && r.fromDate === c.date)
      ),
    [candidates, requests]
  );
  const mine = free.filter((c) => c.as === "student");
  const theirs = free.filter((c) => c.as === "trainer");

  const send = async () => {
    if (!chosen) return;
    if (kind === "reschedule" && !slot) return;
    setBusy(true);
    try {
      await createWorkoutRequest({
        workoutId: chosen.workout.id,
        fromDate: chosen.date,
        kind,
        toDate: slot?.date,
        toStart: slot?.start,
        message,
      });
      toast({ title: "Solicitação enviada", description: `${chosen.counterpart} vai receber o aviso.` });
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast({ title: "Não foi possível enviar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const back = () => setStep(step === "slot" || step === "cancel" ? "workout" : "type");

  const renderGroup = (title: string, list: Candidate[]) =>
    list.length > 0 && (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {list.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              setChosen(c);
              setSlot(null);
              setStep(kind === "reschedule" ? "slot" : "cancel");
            }}
            className="w-full rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-muted/50 transition-smooth"
          >
            <p className="font-medium">{c.workout.name}</p>
            <p className="text-xs text-muted-foreground">
              {fmtWhen(c.date, c.time)} · {c.plan.title} · {c.counterpart}
            </p>
          </button>
        ))}
      </div>
    );

  const messageField = (
    <div className="space-y-2">
      <Label htmlFor="req-msg">Mensagem (opcional)</Label>
      <Textarea id="req-msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Explique o motivo, se quiser." />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova solicitação</DialogTitle>
          <DialogDescription>
            {step === "type" && "O que você quer pedir?"}
            {step === "workout" && "Qual treino?"}
            {step === "slot" && "Escolha o novo dia e horário na agenda."}
            {step === "cancel" && "Confirme o cancelamento."}
          </DialogDescription>
        </DialogHeader>

        {step !== "type" && (
          <Button variant="ghost" size="sm" className="-mt-2 self-start" onClick={back}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}

        {step === "type" && (
          <div className="space-y-3">
            {TYPES.map((t) => (
              <button
                key={t.kind}
                type="button"
                onClick={() => {
                  setKind(t.kind);
                  setStep("workout");
                }}
                className="w-full flex items-start gap-3 rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-muted/50 transition-smooth"
              >
                <t.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>
                  <span className="block font-semibold">{t.title}</span>
                  <span className="block text-sm text-muted-foreground">{t.text}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "workout" && (
          <div className="space-y-4">
            {candidates === null ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando seus treinos...
              </div>
            ) : free.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum treino acompanhado nos próximos 14 dias para alterar. Só treinos feitos com o profissional entram aqui.
              </p>
            ) : (
              <>
                {renderGroup(user?.trainerId && mine.length > 0 ? "Meus treinos" : "Treinos acompanhados", mine)}
                {renderGroup("Treinos dos meus alunos", theirs)}
              </>
            )}
          </div>
        )}

        {step === "slot" && chosen && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{chosen.workout.name}</strong> · hoje marcado para {fmtWhen(chosen.date, chosen.time)} · agenda de {chosen.as === "student" ? chosen.counterpart : "você"}
            </p>
            <AgendaPicker trainerId={chosen.trainerId} value={slot} onChange={setSlot} exclude={{ workoutId: chosen.workout.id, date: chosen.date }} />
            {slot && (
              <p className="text-sm">
                Novo horário: <strong>{fmtWhen(slot.date, slot.start)}</strong>
              </p>
            )}
            {messageField}
            <Button variant="hero" className="w-full" disabled={!slot || busy} onClick={send}>
              {busy ? "Enviando..." : "Enviar solicitação"}
            </Button>
          </div>
        )}

        {step === "cancel" && chosen && (
          <div className="space-y-4">
            <p className="text-sm">
              Cancelar <strong>{chosen.workout.name}</strong> de {fmtWhen(chosen.date, chosen.time)}?
            </p>
            {messageField}
            <Button variant="destructive" className="w-full" disabled={busy} onClick={send}>
              {busy ? "Enviando..." : "Enviar pedido de cancelamento"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
