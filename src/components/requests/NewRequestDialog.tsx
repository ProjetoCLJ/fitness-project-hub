import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarClock, Loader2, Search, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toLocalISO, fetchLinkedStudents } from "@/lib/agendaStore";
import {
  Plan,
  Workout,
  WorkoutExecution,
  WEEKDAY_SHORT,
  fetchExecutions,
  fetchPlansForStudent,
  fetchPlansForTrainer,
  fetchSlots,
  fetchSlotsForPlans,
} from "@/lib/planStore";
import { NO_CHANGES, PlanChanges, fetchPlanChanges, occurrencesOn } from "@/lib/planChanges";
import { WorkoutRequest, WorkoutRequestKind, createWorkoutRequest } from "@/lib/workoutRequests";
import { AgendaPicker, PickedSlot } from "@/components/requests/AgendaPicker";
import { PlanWeeks, PlansView, ViewToggle } from "@/components/plan/PlanWeeks";

/** Pessoa com quem o treino é feito: um aluno do profissional ou um professor do usuário. */
interface Person {
  key: string;
  /** "trainer": o usuário atua como profissional (a pessoa é aluno dele); "student": o usuário é o aluno (a pessoa é o professor). */
  as: "student" | "trainer";
  name: string;
  plans: Plan[];
  studentId: string;
  trainerId: string;
}

interface Candidate {
  workout: Workout;
  plan: Plan;
  person: Person;
  date: string;
  time: string | null;
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

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Step = "type" | "who" | "workout" | "slot" | "cancel";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pedidos já em andamento (o mesmo treino/dia não pode ter dois pendentes). */
  requests: WorkoutRequest[];
  onCreated: () => void;
}

export const NewRequestDialog = ({ open, onOpenChange, requests, onCreated }: NewRequestDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isTrainerUser = !!user?.trainerId;

  const [step, setStep] = useState<Step>("type");
  const [kind, setKind] = useState<WorkoutRequestKind>("reschedule");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [changes, setChanges] = useState<PlanChanges>(NO_CHANGES);
  const [person, setPerson] = useState<Person | null>(null);
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const [view, setView] = useState<PlansView>("weeks");
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<Candidate | null>(null);
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Reinicia ao abrir.
  useEffect(() => {
    if (!open) return;
    setStep("type");
    setKind("reschedule");
    setPerson(null);
    setChosen(null);
    setSlot(null);
    setSearch("");
    setMessage("");
    setView("weeks");
  }, [open]);

  // Pessoas e treinos acompanhados dos próximos 14 dias.
  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    setPeople(null);
    (async () => {
      const today = toLocalISO(new Date());
      const to = addDays(today, 14);
      const list: Person[] = [];
      const found: Candidate[] = [];
      const allPlanIds: string[] = [];

      const collect = (p: Person, slots: { workoutId: string; date: string; accompanied: boolean; startTime: string | null; status: string }[], ch: PlanChanges) => {
        const byKey = new Map(slots.map((s) => [`${s.workoutId}|${s.date}`, s]));
        for (let i = 0; i <= 14; i++) {
          const date = addDays(today, i);
          for (const plan of p.plans) {
            for (const workout of occurrencesOn(plan, date, ch)) {
              const s = byKey.get(`${workout.id}|${date}`);
              const accompanied = s ? s.accompanied : workout.accompanied;
              if (!accompanied || (s && s.status !== "pending")) continue;
              found.push({ workout, plan, person: p, date, time: s ? s.startTime ?? workout.startTime : workout.startTime });
            }
          }
        }
      };

      try {
        // Como aluno: os professores com quem treina.
        if (user.studentId) {
          const plans = (await fetchPlansForStudent(user.studentId)).filter((p) => p.status === "active" && p.trainerId);
          if (plans.length > 0) {
            const byTrainer = new Map<string, Plan[]>();
            plans.forEach((p) => byTrainer.set(p.trainerId as string, [...(byTrainer.get(p.trainerId as string) ?? []), p]));
            const [slots, ch] = await Promise.all([fetchSlots(user.studentId, today, to), fetchPlanChanges(plans.map((p) => p.id), today, to)]);
            allPlanIds.push(...plans.map((p) => p.id));
            byTrainer.forEach((ps, trainerId) => {
              const p: Person = { key: `t:${trainerId}`, as: "student", name: ps[0].trainerName, plans: ps, studentId: user.studentId, trainerId };
              list.push(p);
              collect(p, slots, ch);
            });
          }
        }
        // Como profissional: os alunos dele (mesmo os sem treino acompanhado, para aparecerem desativados).
        if (user.trainerId) {
          const [plans, students] = await Promise.all([fetchPlansForTrainer(user.trainerId), fetchLinkedStudents(user.trainerId)]);
          const [slots, ch] = await Promise.all([
            fetchSlotsForPlans(plans.map((p) => p.id), today, to),
            fetchPlanChanges(plans.map((p) => p.id), today, to),
          ]);
          allPlanIds.push(...plans.map((p) => p.id));
          students.forEach((s) => {
            const p: Person = {
              key: `s:${s.studentId}`,
              as: "trainer",
              name: s.name,
              plans: plans.filter((pl) => pl.studentId === s.studentId),
              studentId: s.studentId,
              trainerId: user.trainerId as string,
            };
            list.push(p);
            collect(p, slots, ch);
          });
        }
        const merged = allPlanIds.length > 0 ? await fetchPlanChanges(allPlanIds, addDays(today, -120), addDays(today, 180)) : NO_CHANGES;
        if (alive) setChanges(merged);
      } catch {
        toast({ title: "Não foi possível carregar os treinos", variant: "destructive" });
      }
      if (alive) {
        setCandidates(found);
        setPeople(list);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, user, toast]);

  // Treinos que ainda podem receber um novo pedido.
  const open_ = useMemo(
    () => candidates.filter((c) => !requests.some((r) => r.status === "pending" && r.workoutId === c.workout.id && r.fromDate === c.date)),
    [candidates, requests]
  );
  const countFor = (p: Person) => open_.filter((c) => c.person.key === p.key).length;

  // Aluno com um único professor pula a escolha da pessoa.
  const needsWho = isTrainerUser || (people?.length ?? 0) > 1;
  useEffect(() => {
    if (step !== "who" || people === null || needsWho) return;
    if (people.length === 1) {
      choosePerson(people[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, people, needsWho]);

  const choosePerson = (p: Person) => {
    setPerson(p);
    setChosen(null);
    setSlot(null);
    setExecutions([]);
    fetchExecutions(p.studentId).then(setExecutions).catch(() => setExecutions([]));
    setStep("workout");
  };

  const pickableKeys = useMemo(
    () => new Set(open_.filter((c) => person && c.person.key === person.key).map((c) => `${c.workout.id}|${c.date}`)),
    [open_, person]
  );

  const pickWorkout = (workout: Workout, _plan: Plan, dateISO: string) => {
    const c = open_.find((x) => person && x.person.key === person.key && x.workout.id === workout.id && x.date === dateISO);
    if (!c) return;
    setChosen(c);
    setSlot(null);
    setStep(kind === "reschedule" ? "slot" : "cancel");
  };

  const send = async () => {
    if (!chosen) return;
    if (kind === "reschedule" && !slot) return;
    setBusy(true);
    try {
      await createWorkoutRequest({ workoutId: chosen.workout.id, fromDate: chosen.date, kind, toDate: slot?.date, toStart: slot?.start, message });
      toast({ title: "Solicitação enviada", description: `${chosen.person.name} vai receber o aviso.` });
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast({ title: "Não foi possível enviar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    if (step === "slot" || step === "cancel") setStep("workout");
    else if (step === "workout") setStep(needsWho ? "who" : "type");
    else setStep("type");
  };

  const typeOptions: { kind: WorkoutRequestKind; title: string; text: string; icon: typeof CalendarClock }[] = isTrainerUser
    ? [
        { kind: "reschedule", title: "Mudar o dia ou horário de um treino", text: "Escolha o aluno (ou o seu professor) e encaixe o novo horário na agenda.", icon: CalendarClock },
        { kind: "cancel", title: "Cancelar um treino", text: "Escolha o aluno (ou o seu professor) e o treino que não vai acontecer.", icon: XCircle },
      ]
    : [
        { kind: "reschedule", title: "Mudança de horário ou dia", text: "Escolha outro horário livre na agenda do profissional.", icon: CalendarClock },
        { kind: "cancel", title: "Cancelamento de treino", text: "Avise que não vai acontecer neste dia.", icon: XCircle },
      ];

  const description = {
    type: "O que você quer pedir?",
    who: isTrainerUser ? "Para quem?" : "Com qual profissional?",
    workout: "Qual treino? Toque em um treino acompanhado.",
    slot: person?.as === "trainer" ? "Escolha onde encaixar o novo horário na sua agenda." : "Escolha o novo dia e horário na agenda do profissional.",
    cancel: "Confirme o cancelamento.",
  }[step];

  const filtered = (people ?? []).filter((p) => norm(p.name).includes(norm(search.trim())));
  const section = (title: string, list: Person[]) =>
    list.length > 0 && (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {list.map((p) => {
          const n = countFor(p);
          return (
            <button
              key={p.key}
              type="button"
              disabled={n === 0}
              onClick={() => choosePerson(p)}
              className="w-full rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-muted/50 transition-smooth disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent disabled:cursor-not-allowed"
            >
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {n === 0 ? "Sem treinos acompanhados nos próximos 14 dias" : `${n} ${n === 1 ? "treino acompanhado" : "treinos acompanhados"} nos próximos 14 dias`}
              </p>
            </button>
          );
        })}
      </div>
    );

  const trainersTitle = isTrainerUser ? ((people ?? []).filter((p) => p.as === "student").length > 1 ? "Meus professores" : "Meu professor") : "Profissionais";

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
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step !== "type" && (
          <Button variant="ghost" size="sm" className="-mt-2 self-start" onClick={back}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}

        {step === "type" && (
          <div className="space-y-3">
            {typeOptions.map((t) => (
              <button
                key={t.kind}
                type="button"
                onClick={() => {
                  setKind(t.kind);
                  setStep("who");
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

        {step === "who" && (
          <div className="space-y-4">
            {people === null ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : people.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {isTrainerUser ? "Você ainda não tem alunos nem professor vinculado." : "Você ainda não tem um profissional vinculado."}
              </p>
            ) : needsWho ? (
              <>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar pelo nome" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
                </div>
                {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Ninguém encontrado.</p>}
                {section("Meus alunos", filtered.filter((p) => p.as === "trainer"))}
                {section(trainersTitle, filtered.filter((p) => p.as === "student"))}
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Abrindo os treinos...
              </div>
            )}
          </div>
        )}

        {step === "workout" && person && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                Treinos de <strong>{person.name}</strong>
              </p>
              <ViewToggle value={view} onChange={setView} />
            </div>
            {pickableKeys.size === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum treino acompanhado nos próximos 14 dias para alterar.</p>
            ) : (
              <PlanWeeks
                plans={person.plans}
                executions={executions}
                todayISO={toLocalISO(new Date())}
                view={view}
                changes={changes}
                pickMode
                canPick={(w, d) => pickableKeys.has(`${w.id}|${d}`)}
                onPick={pickWorkout}
              />
            )}
            <p className="text-xs text-muted-foreground">Só treinos acompanhados dos próximos 14 dias podem ser alterados; eles ficam destacados.</p>
          </div>
        )}

        {step === "slot" && chosen && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{chosen.workout.name}</strong> · {chosen.person.name} · hoje marcado para {fmtWhen(chosen.date, chosen.time)}
            </p>
            <AgendaPicker
              trainerId={chosen.person.trainerId}
              value={slot}
              onChange={setSlot}
              exclude={{ workoutId: chosen.workout.id, date: chosen.date }}
              detailed={chosen.person.as === "trainer"}
            />
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
              Cancelar <strong>{chosen.workout.name}</strong> de {chosen.person.name} em {fmtWhen(chosen.date, chosen.time)}?
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
