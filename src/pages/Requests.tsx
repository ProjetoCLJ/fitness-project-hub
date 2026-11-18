import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Bell, CalendarClock, Check, Plus, UserPlus, X, XCircle } from "lucide-react";
import { RequestItem, fetchRequestsForStudent, fetchRequestsForTrainer, respondToRequest } from "@/lib/requestsStore";
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  RequesterRole,
  WorkoutRequest,
  fetchWorkoutRequests,
  respondWorkoutRequest,
  withdrawWorkoutRequest,
} from "@/lib/workoutRequests";
import { WEEKDAY_SHORT } from "@/lib/planStore";
import { NewRequestDialog } from "@/components/requests/NewRequestDialog";
import { AgendaPicker, PickedSlot } from "@/components/requests/AgendaPicker";
import { ConflictNote, useRecurrenceConflicts } from "@/components/requests/RecurrenceControls";

const kindIcon = {
  invite: UserPlus,
  booking: CalendarClock,
  suggestion: CalendarClock,
  reschedule: CalendarClock,
} as const;

const fmtWhen = (iso: string, time?: string | null) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}${time ? ` às ${time}` : ""}`;
};

const statusStyle: Record<WorkoutRequest["status"], string> = {
  pending: "border-amber-500/50 text-amber-600",
  accepted: "border-green-500/50 text-green-600",
  declined: "border-destructive/50 text-destructive",
  countered: "border-primary/50 text-primary",
  withdrawn: "border-border text-muted-foreground",
};

interface CardProps {
  request: WorkoutRequest;
  me: RequesterRole;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCounter: () => void;
  onWithdraw: () => void;
}

const WorkoutRequestCard = ({ request: r, me, busy, onAccept, onDecline, onCounter, onWithdraw }: CardProps) => {
  const iRequested = r.requestedBy === me;
  const counterpart = me === "trainer" ? r.studentName : r.trainerName;
  const who = iRequested ? "Você pediu" : `${counterpart} pediu`;
  const pending = r.status === "pending";
  const Icon = r.kind === "cancel" ? XCircle : CalendarClock;

  return (
    <Card className="p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{REQUEST_KIND_LABEL[r.kind]}</p>
            <Badge variant="outline" className={`text-xs ${statusStyle[r.status]}`}>
              {pending && iRequested ? "Aguardando resposta" : REQUEST_STATUS_LABEL[r.status]}
            </Badge>
            {r.scope === "all" && (
              <Badge variant="outline" className="text-xs border-primary/60 bg-primary/10 text-primary">
                Todas as semanas
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {who} · {r.workoutName} · {counterpart}
          </p>
          <p className="text-sm flex flex-wrap items-center gap-x-2">
            <span>{fmtWhen(r.fromDate)}</span>
            {r.kind === "reschedule" && r.toDate && (
              <>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <strong>{fmtWhen(r.toDate, r.toStart)}</strong>
              </>
            )}
            {r.kind === "cancel" && <span className="text-muted-foreground">(cancelar este dia)</span>}
          </p>
          {r.scope === "all" && (
            <p className="text-xs text-muted-foreground">
              Muda este treino em todas as semanas, daqui para frente. Os treinos já feitos não mudam e os outros treinos do plano continuam iguais.
            </p>
          )}
          {r.scope === "all" && r.conflictDates.length > 0 && pending && (
            <p className="text-xs text-amber-700 dark:text-amber-500">
              Atenção: nas próximas semanas esse horário estava ocupado em {r.conflictDates.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`).join(", ")}.
            </p>
          )}
          {r.message && <p className="text-sm text-muted-foreground whitespace-pre-wrap">“{r.message}”</p>}
          {r.responseMessage && !pending && <p className="text-sm text-muted-foreground whitespace-pre-wrap">Resposta: “{r.responseMessage}”</p>}
        </div>
      </div>

      {pending && !iRequested && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="flex-1" size="sm" disabled={busy} onClick={onAccept}>
            <Check className="h-4 w-4 mr-1" />
            Aceitar
          </Button>
          <Button className="flex-1" size="sm" variant="outline" disabled={busy} onClick={onCounter}>
            <CalendarClock className="h-4 w-4 mr-1" />
            Propor outro horário
          </Button>
          <Button className="flex-1" size="sm" variant="outline" disabled={busy} onClick={onDecline}>
            <X className="h-4 w-4 mr-1" />
            Recusar
          </Button>
        </div>
      )}
      {pending && iRequested && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={onWithdraw}>
          Cancelar solicitação
        </Button>
      )}
    </Card>
  );
};

const Requests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [requests, setRequests] = useState<WorkoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [counter, setCounter] = useState<WorkoutRequest | null>(null);
  const [counterSlot, setCounterSlot] = useState<PickedSlot | null>(null);
  const [counterMsg, setCounterMsg] = useState("");
  const [declining, setDeclining] = useState<WorkoutRequest | null>(null);
  const [confirmAll, setConfirmAll] = useState<WorkoutRequest | null>(null);
  const counterConflicts = useRecurrenceConflicts(counter?.workoutId, counter?.scope === "all" ? counterSlot : null);
  const [declineMsg, setDeclineMsg] = useState("");
  const [tab, setTab] = useState("received");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [asTrainer, asStudent, workoutRequests] = await Promise.all([
        user.trainerId ? fetchRequestsForTrainer(user.trainerId) : Promise.resolve([]),
        fetchRequestsForStudent(user.studentId),
        fetchWorkoutRequests(),
      ]);
      setItems([...asTrainer, ...asStudent].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setRequests(workoutRequests);
    } catch {
      toast({ title: "Não foi possível carregar as solicitações", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const myRole = useMemo(
    () => (r: WorkoutRequest): RequesterRole => (user?.trainerId && r.trainerId === user.trainerId ? "trainer" : "student"),
    [user]
  );

  if (!user) return null;

  const receivedWorkout = requests.filter((r) => r.status === "pending" && r.requestedBy !== myRole(r));
  const sent = requests.filter((r) => r.status === "pending" && r.requestedBy === myRole(r));
  const receivedHistory = requests.filter((r) => r.status !== "pending" && r.requestedBy !== myRole(r));
  const sentHistory = requests.filter((r) => r.status !== "pending" && r.requestedBy === myRole(r));
  const receivedCount = receivedWorkout.length + items.length;

  const run = async (id: string, action: () => Promise<void>, ok: string) => {
    setBusyId(id);
    try {
      await action();
      toast({ title: ok });
      await load();
    } catch (e) {
      toast({ title: "Não foi possível concluir", description: (e as Error).message, variant: "destructive" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const respondLegacy = (item: RequestItem, accept: boolean) =>
    run(item.id, () => respondToRequest(item, accept), accept ? "Solicitação aceita" : "Solicitação recusada");

  const renderCard = (r: WorkoutRequest) => (
    <WorkoutRequestCard
      key={r.id}
      request={r}
      me={myRole(r)}
      busy={busyId === r.id}
      onAccept={() =>
        r.kind === "reschedule" && r.scope === "all"
          ? setConfirmAll(r)
          : run(r.id, () => respondWorkoutRequest(r.id, "accept"), "Solicitação aceita: o treino foi atualizado")
      }
      onDecline={() => {
        setDeclining(r);
        setDeclineMsg("");
      }}
      onCounter={() => {
        setCounter(r);
        setCounterSlot(null);
        setCounterMsg("");
      }}
      onWithdraw={() => run(r.id, () => withdrawWorkoutRequest(r.id), "Solicitação cancelada")}
    />
  );

  const empty = (text: string) => (
    <Card className="p-8 text-center text-sm text-muted-foreground">
      <Bell className="h-8 w-8 mx-auto mb-3" />
      {text}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Solicitações</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Pedidos de mudança de treino, convites e respostas</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sent">Enviadas</TabsTrigger>
            <TabsTrigger value="received">
              Recebidas
              {receivedCount > 0 && <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[10px] leading-4 text-destructive-foreground">{receivedCount}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="space-y-3">
            <h2 className="font-semibold text-base sm:text-lg">Aguardando resposta</h2>
            {!isLoading && sent.length === 0 && empty("Você não tem solicitações enviadas aguardando resposta.")}
            {sent.map(renderCard)}

            <h2 className="font-semibold text-base sm:text-lg pt-4">Histórico</h2>
            {!isLoading && sentHistory.length === 0 && empty("As solicitações que você enviou e já foram respondidas aparecem aqui.")}
            {sentHistory.map(renderCard)}
          </TabsContent>

          <TabsContent value="received" className="space-y-3">
            <h2 className="font-semibold text-base sm:text-lg">Aguardando sua resposta</h2>
            {!isLoading && receivedCount === 0 && empty("Nenhuma solicitação aguardando a sua resposta.")}
            {receivedWorkout.map(renderCard)}
            {items.map((item) => {
              const Icon = kindIcon[item.kind];
              return (
                <Card key={`${item.kind}-${item.id}`} className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{item.title}</p>
                        <Badge variant="outline" className="text-xs">Pendente</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm" disabled={busyId === item.id} onClick={() => respondLegacy(item, true)}>
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button className="flex-1" size="sm" variant="outline" disabled={busyId === item.id} onClick={() => respondLegacy(item, false)}>
                      <X className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                  </div>
                </Card>
              );
            })}

            <h2 className="font-semibold text-base sm:text-lg pt-4">Histórico</h2>
            {!isLoading && receivedHistory.length === 0 && empty("As solicitações que você recebeu e já respondeu aparecem aqui.")}
            {receivedHistory.map(renderCard)}
          </TabsContent>
        </Tabs>
      </div>

      <NewRequestDialog open={newOpen} onOpenChange={setNewOpen} requests={requests} onCreated={load} />

      {/* Propor outro horário */}
      <Dialog open={!!counter} onOpenChange={(open) => !open && setCounter(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Propor outro horário</DialogTitle>
            <DialogDescription>
              {counter ? `${counter.workoutName} · treino de ${fmtWhen(counter.fromDate)}. Escolha um horário livre na agenda.` : ""}
            </DialogDescription>
          </DialogHeader>
          {counter && (
            <div className="space-y-4">
              <AgendaPicker
                trainerId={counter.trainerId}
                value={counterSlot}
                onChange={setCounterSlot}
                exclude={{ workoutId: counter.workoutId, date: counter.scope === "all" ? undefined : counter.fromDate, requestId: counter.id }}
                detailed={!!user.trainerId && counter.trainerId === user.trainerId}
                onlyWeekOf={counter.scope === "all" ? counter.fromDate : undefined}
              />
              {counter.scope === "all" && (
                <p className="text-xs text-muted-foreground">Este pedido é para todas as semanas: escolha o novo dia dentro da mesma semana do treino.</p>
              )}
              <ConflictNote dates={counterConflicts} who="Você" />
              <div className="space-y-2">
                <Label htmlFor="counter-msg">Mensagem (opcional)</Label>
                <Textarea id="counter-msg" rows={2} value={counterMsg} onChange={(e) => setCounterMsg(e.target.value)} />
              </div>
              <Button
                variant="hero"
                className="w-full"
                disabled={!counterSlot || busyId === counter.id}
                onClick={async () => {
                  if (!counterSlot) return;
                  const target = counter;
                  await run(
                    target.id,
                    () => respondWorkoutRequest(target.id, "counter", { toDate: counterSlot.date, toStart: counterSlot.start, message: counterMsg }),
                    "Proposta enviada"
                  );
                  setCounter(null);
                }}
              >
                Enviar proposta
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Aceitar mudança em todas as semanas */}
      <Dialog open={!!confirmAll} onOpenChange={(open) => !open && setConfirmAll(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mudar em todas as semanas?</DialogTitle>
            <DialogDescription>
              {confirmAll
                ? `${confirmAll.workoutName} passa para ${fmtWhen(confirmAll.toDate ?? confirmAll.fromDate, confirmAll.toStart)} e se repete assim daqui para frente. O plano e a agenda são atualizados. Os treinos já feitos continuam registrados como foram.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {confirmAll && confirmAll.conflictDates.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-500">
              O horário estava ocupado nas próximas semanas em {confirmAll.conflictDates.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`).join(", ")}. Confira a agenda depois.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmAll(null)}>
              Voltar
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={async () => {
                const target = confirmAll;
                if (!target) return;
                await run(target.id, () => respondWorkoutRequest(target.id, "accept"), "Solicitação aceita: o treino foi atualizado em todas as semanas");
                setConfirmAll(null);
              }}
            >
              Aceitar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recusar */}
      <Dialog open={!!declining} onOpenChange={(open) => !open && setDeclining(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar solicitação</DialogTitle>
            <DialogDescription>O treino continua como está. Se quiser, explique o motivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea rows={3} value={declineMsg} onChange={(e) => setDeclineMsg(e.target.value)} placeholder="Motivo (opcional)" />
            <Button
              variant="destructive"
              className="w-full"
              onClick={async () => {
                const target = declining;
                if (!target) return;
                await run(target.id, () => respondWorkoutRequest(target.id, "decline", { message: declineMsg }), "Solicitação recusada");
                setDeclining(null);
              }}
            >
              Recusar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Requests;
