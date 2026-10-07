import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, History, Flame, Dumbbell } from "lucide-react";
import { Plan, Workout, WEEKDAY_NAMES, fetchPlansForStudent, workoutPositionLabel, workoutsOnDate } from "@/lib/planStore";
import { toLocalISO } from "@/lib/agendaStore";

const Workouts = () => {
  const { user } = useAuth();
  const clientId = user?.id ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetchPlansForStudent(clientId)
      .then((all) => setPlans(all.filter((p) => p.status === "active")))
      .catch(() => {
        setPlans([]);
        toast({ title: "Não foi possível carregar seus treinos", variant: "destructive" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!user || user.userType !== "student" || plans === null) return null;

  const todayISO = toLocalISO(new Date());
  const todayName = WEEKDAY_NAMES[new Date().getDay()];
  const todayWorkouts = plans.flatMap((p) => workoutsOnDate(p, todayISO));
  const todayIds = new Set(todayWorkouts.map((w) => w.id));
  const otherWorkouts = plans.flatMap((p) => p.workouts.filter((w) => !todayIds.has(w.id)).map((w) => ({ workout: w, planTitle: p.title })));

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
        ) : (
          <>
            {todayWorkouts.length > 0 ? (
              todayWorkouts.map((workout) => (
                <Card key={workout.id} className="overflow-hidden mb-6 border-0 shadow-strong">
                  <div className="bg-gradient-hero p-5 sm:p-8 text-primary-foreground relative">
                    <div className="absolute top-4 right-4 opacity-20">
                      <Flame className="h-20 w-20" />
                    </div>
                    <Badge variant="secondary" className="mb-3">Treino de hoje</Badge>
                    <h2 className="text-2xl font-bold mb-1">{workout.name}</h2>
                    <p className="text-sm opacity-90 mb-5">{workout.exercises.length} exercícios</p>
                    <Button variant="secondary" size="lg" className="w-full font-semibold" onClick={() => startWorkout(workout)}>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Iniciar {workout.name}
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 mb-6 text-center text-sm text-muted-foreground border-dashed">
                Sem treino programado para hoje. Aproveite para descansar ou escolha outra rotina abaixo.
              </Card>
            )}

            {otherWorkouts.length > 0 && (
              <>
                <h2 className="font-semibold text-base sm:text-lg mb-3">Outras rotinas</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {otherWorkouts.map(({ workout, planTitle }) => (
                    <Card
                      key={workout.id}
                      className="p-4 flex items-center gap-3 cursor-pointer hover:shadow-medium hover:border-primary/40 transition-smooth"
                      onClick={() => startWorkout(workout)}
                    >
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="secondary" className="mb-1 text-xs">{workoutPositionLabel(workout)}</Badge>
                        <p className="font-medium truncate">{workout.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {planTitle} · {workout.exercises.length} exercícios
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Workouts;
