import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import { WorkoutExecutionDialog } from "@/components/plan/WorkoutExecutionDialog";
import { ClientPlan, Workout, getPlan, recordExecution } from "@/lib/planStore";

// Demonstração local: o cliente autenticado (mock) representa sempre
// o cliente "1" (Maria Fernanda) da carteira do profissional.
const CURRENT_CLIENT_ID = "1";

const Workouts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<ClientPlan | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    setPlan(getPlan(CURRENT_CLIENT_ID));
  }, []);

  if (!user || user.userType !== "student" || !plan) return null;

  const handleWorkoutComplete = (result: {
    completedExercises: { name: string; sets: number; reps: string; load: string }[];
    observations?: string;
  }) => {
    if (!activeWorkout) return;
    const updated = recordExecution(CURRENT_CLIENT_ID, {
      workoutId: activeWorkout.id,
      workoutName: activeWorkout.name,
      date: new Date().toISOString(),
      ...result,
    });
    setPlan(updated);
    toast({
      title: "Treino concluído!",
      description: `${activeWorkout.name} registrado no seu histórico.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Treinos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sua programação semanal — registre a execução de cada treino
          </p>
        </div>

        <div className="space-y-4">
          {plan.workouts.map((workout) => (
            <Card key={workout.id} className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Badge variant="secondary" className="mb-1">{workout.day}</Badge>
                  <p className="font-semibold">{workout.name}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {workout.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {ex.sets}x{ex.reps} · {ex.load} · desc. {ex.rest}
                    </span>
                  </div>
                ))}
              </div>
              {workout.observations && (
                <p className="text-xs text-muted-foreground italic mb-4">{workout.observations}</p>
              )}
              <Button variant="hero" className="w-full" onClick={() => setActiveWorkout(workout)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Iniciar treino
              </Button>
            </Card>
          ))}

          <WorkoutExecutionDialog
            workout={activeWorkout}
            open={!!activeWorkout}
            onOpenChange={(open) => !open && setActiveWorkout(null)}
            onComplete={handleWorkoutComplete}
          />
        </div>

        {plan.executions.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold text-base sm:text-lg mb-3">Treinos executados recentemente</h2>
            <div className="space-y-3">
              {plan.executions.slice(0, 5).map((exec) => (
                <Card key={exec.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{exec.workoutName}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(exec.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {exec.completedExercises.map((ex) => (
                      <div key={ex.name} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{ex.name}</span>
                        <span>{ex.sets}x{ex.reps} · {ex.load}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workouts;
