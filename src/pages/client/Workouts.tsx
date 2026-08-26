import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, History } from "lucide-react";
import { Plan, Workout, getActivePlan } from "@/lib/planStore";

const CURRENT_CLIENT_ID = "1";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const Workouts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    setPlan(getActivePlan(CURRENT_CLIENT_ID) ?? null);
  }, []);

  if (!user || user.userType !== "student" || !plan) return null;

  const todayName = WEEKDAYS[new Date().getDay()];
  const todayWorkout = plan.workouts.find((w) => w.day === todayName);
  const otherWorkouts = plan.workouts.filter((w) => w.id !== todayWorkout?.id);

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

        {todayWorkout ? (
          <Card className="p-4 sm:p-6 mb-6 border-2 border-primary/40 bg-primary/5">
            <Badge className="mb-2">Treino de hoje</Badge>
            <h2 className="text-lg font-semibold mb-1">{todayWorkout.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{todayWorkout.exercises.length} exercícios</p>
            <Button variant="hero" className="w-full" onClick={() => startWorkout(todayWorkout)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Iniciar {todayWorkout.name}
            </Button>
          </Card>
        ) : (
          <Card className="p-4 sm:p-6 mb-6 text-center text-sm text-muted-foreground">
            Sem treino programado para hoje. Aproveite para descansar ou escolha outra rotina abaixo.
          </Card>
        )}

        {otherWorkouts.length > 0 && (
          <>
            <h2 className="font-semibold text-base sm:text-lg mb-3">Outras rotinas</h2>
            <div className="space-y-3">
              {otherWorkouts.map((workout) => (
                <Card
                  key={workout.id}
                  className="p-4 flex items-center justify-between cursor-pointer hover:shadow-medium transition-smooth"
                  onClick={() => startWorkout(workout)}
                >
                  <div>
                    <Badge variant="secondary" className="mb-1 text-xs">{workout.day}</Badge>
                    <p className="font-medium">{workout.name}</p>
                    <p className="text-xs text-muted-foreground">{workout.exercises.length} exercícios</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Workouts;
