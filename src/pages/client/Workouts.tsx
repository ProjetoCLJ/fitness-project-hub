import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanWeeks } from "@/components/plan/PlanWeeks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, History, Flame, Shuffle, X } from "lucide-react";
import { Plan, Workout, WorkoutExecution, WEEKDAY_NAMES, fetchExecutions, fetchPlansForStudent } from "@/lib/planStore";
import { buildPlanWeeks, executionDay } from "@/lib/planSchedule";
import { toLocalISO } from "@/lib/agendaStore";

const Workouts = () => {
  const { user } = useAuth();
  const clientId = user?.id ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const [pickMode, setPickMode] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    Promise.all([fetchPlansForStudent(clientId), fetchExecutions(clientId)])
      .then(([all, execs]) => {
        setPlans(all.filter((p) => p.status === "active"));
        setExecutions(execs);
      })
      .catch(() => {
        setPlans([]);
        toast({ title: "Não foi possível carregar seus treinos", variant: "destructive" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!user || user.userType !== "student" || plans === null) return null;

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

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Treinos</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{todayName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student/workouts/history")}>
            <History className="h-4 w-4 mr-1" />
            Histórico
          </Button>
        </div>

        {plans.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem treinos. Assim que seu profissional criar seu plano, eles aparecem aqui.
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
            <PlanWeeks plans={plans} executions={executions} todayISO={todayISO} />
          </>
        )}
      </div>
    </div>
  );
};

export default Workouts;
