import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, History, Plus, Copy, Pause, Play, Dumbbell } from "lucide-react";
import { Plan, PlanInput, WorkoutExecution, copyPlanAsOwn, createPlan, fetchExecutions, fetchPlansForStudent, pausePlan, resumePlan } from "@/lib/planStore";
import { NewPlanDialog } from "@/components/plan/NewPlanDialog";
import { PlanDetail } from "@/components/plan/PlanDetail";
import { PlanWorkoutsView } from "@/components/plan/PlanWorkoutsView";
import { sportLabel } from "@/lib/sports";
import { toLocalISO } from "@/lib/agendaStore";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const dayDiff = (a: string, b: string) => Math.round((new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()) / 86400000);

/** Progresso do plano pelas datas (início até o prazo). Sem prazo, não há como calcular. */
const planProgress = (plan: Plan, todayISO: string): number | null => {
  if (!plan.endDate) return null;
  const total = dayDiff(plan.endDate, plan.startDate);
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((dayDiff(todayISO, plan.startDate) / total) * 100)));
};

const MyPlan = () => {
  const { user } = useAuth();
  const clientId = user?.studentId ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id");
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [pauseTarget, setPauseTarget] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      const all = await fetchPlansForStudent(clientId);
      setPlans(all.filter((p) => p.status === "active"));
      fetchExecutions(clientId).then(setExecutions).catch(() => setExecutions([]));
    } catch {
      setPlans([]);
      toast({ title: "Não foi possível carregar seus planos", variant: "destructive" });
    }
  }, [clientId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get("new") === "1") setNewOpen(true);
  }, [params]);

  if (!user || plans === null) return null;

  const today = toLocalISO(new Date());
  const selected = selectedId ? plans.find((p) => p.id === selectedId) : undefined;

  const handleCreate = async (input: PlanInput) => {
    try {
      const id = await createPlan(null, clientId, input);
      setNewOpen(false);
      await load();
      setParams({ id }, { replace: true });
      toast({ title: "Plano criado", description: "Agora monte os treinos na aba Treinos do plano." });
    } catch {
      toast({ title: "Não foi possível criar o plano", variant: "destructive" });
    }
  };

  const handleCopy = async (plan: Plan) => {
    setBusy(true);
    try {
      const id = await copyPlanAsOwn(clientId, plan);
      await load();
      setParams({ id }, { replace: true });
      toast({ title: "Cópia criada", description: "Você pode editar este plano à vontade." });
    } catch {
      toast({ title: "Não foi possível copiar o plano", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmPause = async () => {
    if (!pauseTarget) return;
    setBusy(true);
    try {
      const from = await pausePlan(pauseTarget.id);
      toast({ title: "Pausa agendada", description: `O plano fica pausado a partir de ${formatDate(from)}.` });
      setPauseTarget(null);
      await load();
    } catch {
      toast({ title: "Não foi possível pausar", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const resume = async (plan: Plan) => {
    setBusy(true);
    try {
      await resumePlan(plan.id);
      toast({ title: "Plano retomado" });
      await load();
    } catch {
      toast({ title: "Não foi possível retomar", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openPause = (plan: Plan) => plan.pauses.find((p) => !p.endsOn);

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-4">
        {selected ? (
          (() => {
            const pause = openPause(selected);
            const pausedNow = !!pause && pause.startsOn <= today;
            const own = !selected.trainerId;
            const actions = (
              <Card className="p-4 sm:p-6 space-y-3">
                <h3 className="font-semibold">Ações do plano</h3>
                {pause && (
                  <p className="text-sm text-muted-foreground">
                    {pausedNow ? "Este plano está pausado." : `Pausa agendada para ${formatDate(pause.startsOn)}.`}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button variant="hero" onClick={() => navigate("/dashboard/student/workouts")}>
                    <Dumbbell className="h-4 w-4 mr-1" />
                    Treinar
                  </Button>
                  {pause ? (
                    <Button variant="outline" disabled={busy} onClick={() => resume(selected)}>
                      <Play className="h-4 w-4 mr-1" />
                      {pausedNow ? "Retomar plano" : "Cancelar pausa"}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled={busy} onClick={() => setPauseTarget(selected)}>
                      <Pause className="h-4 w-4 mr-1" />
                      Pausar plano
                    </Button>
                  )}
                  {!own && (
                    <Button variant="outline" disabled={busy} onClick={() => handleCopy(selected)} className="sm:col-span-2">
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar como meu plano
                    </Button>
                  )}
                </div>
              </Card>
            );
            return (
              <PlanDetail
                plan={selected}
                canEdit={own}
                onBack={() => setParams({}, { replace: true })}
                onChanged={load}
                descriptionExtra={actions}
                workoutsTop={
                  <PlanWorkoutsView
                    plan={selected}
                    executions={executions}
                    todayISO={today}
                    onStart={(w) => navigate(`/dashboard/student/workouts/session/${w.id}`)}
                  />
                }
              />
            );
          })()
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl sm:text-3xl font-bold">Meus planos</h1>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student/plan/history")}>
                  <History className="h-4 w-4 mr-1" />
                  Histórico
                </Button>
                <Button variant="hero" size="sm" onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar plano
                </Button>
              </div>
            </div>

            {plans.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground space-y-3">
                <p>Você ainda não tem um plano ativo. Crie o seu ou espere seu profissional montar um.</p>
                <Button variant="hero" onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar meu plano
                </Button>
              </Card>
            ) : (
              plans.map((plan) => {
                const pct = planProgress(plan, today);
                return (
                  <Card
                    key={plan.id}
                    className="p-4 sm:p-5 cursor-pointer hover:shadow-medium transition-smooth"
                    onClick={() => setParams({ id: plan.id }, { replace: true })}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <h2 className="font-semibold text-lg truncate">{plan.title}</h2>
                          <p className="text-sm text-muted-foreground">
                            {sportLabel(plan.sport)} · {plan.trainerId ? `por ${plan.trainerName}` : "plano próprio"}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">Início em {formatDate(plan.startDate)}</p>
                        {pct !== null ? (
                          <div className="space-y-1">
                            <Progress value={pct} className="h-2" />
                            <p className="text-xs text-muted-foreground">{pct}% do plano</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem prazo definido</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                );
              })
            )}
          </>
        )}
      </div>

      <NewPlanDialog
        open={newOpen}
        onOpenChange={(open) => {
          setNewOpen(open);
          if (!open && params.get("new")) setParams({}, { replace: true });
        }}
        onCreate={handleCreate}
      />

      <Dialog open={!!pauseTarget} onOpenChange={(open) => !open && setPauseTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pausar este plano?</DialogTitle>
            <DialogDescription>
              A pausa só começa na próxima segunda-feira; até lá você segue com os treinos da semana. Pausas maiores que 7 dias zeram o seu Foco (o XP e as medalhas ficam).
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPauseTarget(null)}>
              Voltar
            </Button>
            <Button variant="hero" className="flex-1" disabled={busy} onClick={confirmPause}>
              Pausar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPlan;
