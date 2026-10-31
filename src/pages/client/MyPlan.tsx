import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Target, Dumbbell, ChevronRight, CalendarClock, History, Plus, Copy, Pause, Play } from "lucide-react";
import { Plan, PlanInput, copyPlanAsOwn, createPlan, fetchPlansForStudent, pausePlan, resumePlan } from "@/lib/planStore";
import { NewPlanDialog } from "@/components/plan/NewPlanDialog";
import { PlanDetail } from "@/components/plan/PlanDetail";
import { sportLabel } from "@/lib/sports";
import { toLocalISO } from "@/lib/agendaStore";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

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

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      const all = await fetchPlansForStudent(clientId);
      setPlans(all.filter((p) => p.status === "active"));
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
          <PlanDetail plan={selected} canEdit={!selected.trainerId} onBack={() => setParams({}, { replace: true })} onChanged={load} />
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
                const pause = openPause(plan);
                const pausedNow = !!pause && pause.startsOn <= today;
                const own = !plan.trainerId;
                return (
                  <Card key={plan.id} className="p-4 sm:p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-lg truncate">{plan.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {sportLabel(plan.sport)} · {own ? "plano próprio" : `por ${plan.trainerName}`}
                        </p>
                      </div>
                      {pause ? <Badge variant="secondary">{pausedNow ? "Pausado" : `Pausa em ${formatDate(pause.startsOn)}`}</Badge> : <Badge>Ativo</Badge>}
                    </div>

                    {plan.objective && (
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Objetivo</p>
                          <p className="font-medium whitespace-pre-wrap">{plan.objective}</p>
                        </div>
                      </div>
                    )}

                    {plan.description && (
                      <div className="flex items-start gap-3">
                        <Dumbbell className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Descrição</p>
                          <p className="font-medium whitespace-pre-wrap">{plan.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      {formatDate(plan.startDate)} — {plan.endDate ? formatDate(plan.endDate) : "sem prazo"}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => navigate("/dashboard/student/workouts")}>
                        Treinar
                      </Button>
                      <Button variant="outline" onClick={() => setParams({ id: plan.id }, { replace: true })}>
                        {own ? "Editar plano" : "Ver plano"}
                      </Button>
                      {!own && (
                        <Button variant="ghost" disabled={busy} onClick={() => handleCopy(plan)}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar como meu plano
                        </Button>
                      )}
                      {pause ? (
                        <Button variant="ghost" disabled={busy} onClick={() => resume(plan)}>
                          <Play className="h-4 w-4 mr-1" />
                          {pausedNow ? "Retomar" : "Cancelar pausa"}
                        </Button>
                      ) : (
                        <Button variant="ghost" disabled={busy} onClick={() => setPauseTarget(plan)}>
                          <Pause className="h-4 w-4 mr-1" />
                          Pausar plano
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}

            <Button variant="ghost" className="w-full justify-between" onClick={() => navigate("/dashboard/student/profile?tab=dados")}>
              Ver objetivos e restrições no seu perfil
              <ChevronRight className="h-4 w-4" />
            </Button>
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
