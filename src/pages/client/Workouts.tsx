import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanWeeks } from "@/components/plan/PlanWeeks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, History, Flame, ListChecks, Plus, Shuffle, X } from "lucide-react";
import { Plan, SlotInfo, Workout, WorkoutExecution, WEEKDAY_NAMES, fetchExecutions, fetchPlansForStudent, fetchSlots, setSlotOptions } from "@/lib/planStore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck } from "lucide-react";
import { buildPlanWeeks, executionDay } from "@/lib/planSchedule";
import { toLocalISO } from "@/lib/agendaStore";

const Workouts = () => {
  const { user } = useAuth();
  const clientId = user?.studentId ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const [pickMode, setPickMode] = useState(false);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [adjust, setAdjust] = useState<{ workout: Workout; plan: Plan; slot: SlotInfo } | null>(null);
  const [adjAccompanied, setAdjAccompanied] = useState(false);
  const [adjTime, setAdjTime] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const until = new Date(monday);
    until.setDate(until.getDate() + 20);
    Promise.all([fetchPlansForStudent(clientId), fetchExecutions(clientId), fetchSlots(clientId, toLocalISO(monday), toLocalISO(until))])
      .then(([all, execs, loadedSlots]) => {
        setPlans(all.filter((p) => p.status === "active"));
        setExecutions(execs);
        setSlots(loadedSlots);
      })
      .catch(() => {
        setPlans([]);
        toast({ title: "Não foi possível carregar seus treinos", variant: "destructive" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!user || plans === null) return null;

  const todayISO = toLocalISO(new Date());
  const todayName = WEEKDAY_NAMES[new Date().getDay()];

  const todaySlots = plans.flatMap((plan) =>
    buildPlanWeeks(plan, executions, todayISO)
      .flat()
      .filter((d) => d.dateISO === todayISO)
      .flatMap((d) => d.slots.map((slot) => ({ ...slot, plan })))
  );
  const doneToday = executions.filter((e) => executionDay(e) === todayISO);

  const startWorkout = (workout: Workout) => navigate(`/dashboard/student/workouts/session/${workout.id}`);

  const openAdjust = (workout: Workout, plan: Plan, slot: SlotInfo) => {
    setAdjust({ workout, plan, slot });
    setAdjAccompanied(slot.accompanied);
    setAdjTime(slot.startTime ?? "");
  };

  const saveAdjust = async () => {
    if (!adjust) return;
    setAdjBusy(true);
    try {
      await setSlotOptions(adjust.slot.id, adjAccompanied, adjTime || null);
      setSlots((prev) => prev.map((s) => (s.id === adjust.slot.id ? { ...s, accompanied: adjAccompanied, startTime: adjTime || null } : s)));
      setAdjust(null);
      toast({ title: "Treino ajustado", description: "Vale só para este dia." });
    } catch {
      toast({ title: "Não foi possível ajustar", variant: "destructive" });
    } finally {
      setAdjBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Treinos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{todayName}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student/plan")}>
              <ListChecks className="h-4 w-4 mr-1" />
              Meus planos
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student/workouts/history")}>
              <History className="h-4 w-4 mr-1" />
              Histórico
            </Button>
          </div>
        </div>

        {plans.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground space-y-3">
            <p>Você ainda não tem treinos. Crie seu próprio plano ou espere seu profissional montar um.</p>
            <Button variant="hero" onClick={() => navigate("/dashboard/student/plan?new=1")}>
              <Plus className="h-4 w-4 mr-1" />
              Criar meu plano
            </Button>
          </Card>
        ) : pickMode ? (
          <>
            <Card className="p-4 mb-4 flex items-center justify-between gap-3 border-primary/40">
              <p className="text-sm">Escolha o treino que você quer fazer hoje.</p>
              <Button variant="ghost" size="sm" onClick={() => setPickMode(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </Card>
            <PlanWeeks plans={plans} executions={executions} todayISO={todayISO} pickMode onPick={startWorkout} />
          </>
        ) : (
          <>
            <h2 className="font-semibold text-base sm:text-lg mb-3">Treino de hoje</h2>
            {todaySlots.length > 0 ? (
              todaySlots.map(({ workout, state, plan }) => (
                <Card key={workout.id} className="overflow-hidden mb-3 border-0 shadow-strong">
                  <div className="bg-gradient-hero p-5 sm:p-8 text-primary-foreground relative">
                    <div className="absolute top-4 right-4 opacity-20">
                      <Flame className="h-20 w-20" />
                    </div>
                    <Badge variant="secondary" className="mb-3">{plans.length > 1 ? plan.title : "Treino de hoje"}</Badge>
                    {(() => {
                      const info = slots.find((s) => s.workoutId === workout.id && s.date === todayISO);
                      const acc = info ? info.accompanied : workout.accompanied;
                      const time = info ? info.startTime : workout.startTime;
                      return acc || time ? (
                        <p className="text-xs opacity-90 mb-1 flex items-center gap-1">
                          {acc && <UserCheck className="h-3.5 w-3.5" />}
                          {acc ? "Acompanhado pelo professor" : "Sozinho"}
                          {time ? ` · ${time}` : ""}
                        </p>
                      ) : null;
                    })()}
                    <h3 className="text-2xl font-bold mb-1">{workout.name}</h3>
                    <p className="text-sm opacity-90 mb-5">{workout.exercises.length} exercícios</p>
                    {state === "done" ? (
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-5 w-5" />
                        Concluído hoje
                      </div>
                    ) : (
                      <Button variant="secondary" size="lg" className="w-full font-semibold" onClick={() => startWorkout(workout)}>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Iniciar {workout.name}
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 mb-3 text-center text-sm text-muted-foreground border-dashed">
                Sem treino programado para hoje.
              </Card>
            )}

            {doneToday.length > 0 && (
              <p className="text-sm text-muted-foreground mb-3">
                Feito hoje: {doneToday.map((e) => e.workoutName).join(", ")}
              </p>
            )}

            <Button variant="outline" className="w-full mb-8" onClick={() => setPickMode(true)}>
              <Shuffle className="h-4 w-4 mr-2" />
              Adiantar ou trocar treino
            </Button>

            <h2 className="font-semibold text-base sm:text-lg mb-3">Seus planos</h2>
            <PlanWeeks plans={plans} executions={executions} todayISO={todayISO} slots={slots} onAdjust={openAdjust} />
            <p className="text-xs text-muted-foreground mt-2">Toque em um treino da semana para ajustar se ele é acompanhado e o horário (vale só para aquele dia).</p>
          </>
        )}
      </div>

      <Dialog open={!!adjust} onOpenChange={(open) => !open && setAdjust(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{adjust?.workout.name}</DialogTitle>
            <DialogDescription>Ajuste só este dia. O plano continua como o profissional montou.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="adj-acc">Acompanhado pelo professor</Label>
              <Switch id="adj-acc" checked={adjAccompanied} onCheckedChange={setAdjAccompanied} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="adj-time">Horário</Label>
              <Input id="adj-time" type="time" className="w-32" value={adjTime} onChange={(e) => setAdjTime(e.target.value)} />
            </div>
            <Button variant="hero" className="w-full" onClick={saveAdjust} disabled={adjBusy}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workouts;
