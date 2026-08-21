import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Target,
  Dumbbell,
  Apple,
  ShieldAlert,
  Users,
  Clock,
  CheckCircle2,
  History as HistoryIcon,
} from "lucide-react";
import StudentHistory from "@/components/dashboard/student/StudentHistory";
import { WorkoutExecutionDialog } from "@/components/plan/WorkoutExecutionDialog";
import { ClientPlan, Workout, getPlan, recordExecution } from "@/lib/planStore";

// Demonstração local: o cliente autenticado (mock) representa sempre
// o cliente "1" (Maria Fernanda) da carteira do profissional, permitindo
// que edições feitas em ClientProfilePro apareçam aqui no mesmo navegador.
const CURRENT_CLIENT_ID = "1";

const MyPlan = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
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
          <h1 className="text-xl sm:text-3xl font-bold">Meu Plano</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sua estratégia de treinamento e nutrição
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-4 px-4 mb-6">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="workouts">Treinos</TabsTrigger>
              <TabsTrigger value="nutrition">Nutrição</TabsTrigger>
              <TabsTrigger value="goals">Objetivos</TabsTrigger>
              <TabsTrigger value="restrictions">Restrições</TabsTrigger>
              <TabsTrigger value="professionals">Profissionais</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Objetivo atual</p>
                  <p className="font-medium">{plan.objective}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Dumbbell className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Estratégia de treinamento</p>
                  <p className="font-medium">{plan.strategy}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Apple className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Estratégia nutricional</p>
                  <p className="font-medium">Plano alimentar ativo - reeducação alimentar</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Personal Trainer</p>
                  <p className="font-medium">Carlos Silva</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nutricionista</p>
                  <p className="font-medium">Maria Santos</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Início do plano</p>
                  <p className="font-medium">01/11/2024</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="font-medium">
                    {new Date(plan.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="workouts" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Objetivo nutricional</p>
                <p className="font-medium">Reeducação alimentar com déficit calórico moderado</p>
              </div>
              <div className="space-y-3 pt-2 border-t">
                {["Café da manhã - 07:00", "Almoço - 12:30", "Lanche - 16:00", "Jantar - 20:00"].map((meal) => (
                  <div key={meal} className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {meal}
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-1">Observações da nutricionista</p>
                <p className="text-sm">Priorizar proteína magra nas refeições principais e hidratação ao longo do dia.</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Somente leitura — edição exclusiva da nutricionista responsável
              </Badge>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">Melhorar condicionamento físico</p>
                  <p className="text-sm text-muted-foreground">Prazo: 3 meses</p>
                </div>
                <Badge>Em andamento</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Progresso estimado: 60%</p>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Restrições físicas</p>
                  <p className="font-medium">Leve desconforto no joelho direito — evitar impacto</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Restrições alimentares</p>
                  <p className="font-medium">Intolerância à lactose</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="professionals" className="space-y-4">
            <Card className="p-4 sm:p-6 flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">CS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Carlos Silva</p>
                <p className="text-sm text-muted-foreground">Personal Trainer</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </Card>
            <Card className="p-4 sm:p-6 flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">MS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Maria Santos</p>
                <p className="text-sm text-muted-foreground">Nutricionista</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div>
              <h2 className="font-semibold text-base sm:text-lg mb-3 flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-primary" />
                Treinos executados
              </h2>
              {plan.executions.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum treino registrado ainda. Conclua um treino na aba Treinos para começar seu histórico.
                </Card>
              ) : (
                <div className="space-y-3">
                  {plan.executions.map((exec) => (
                    <Card key={exec.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{exec.workoutName}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(exec.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                      <div className="space-y-1 mb-2">
                        {exec.completedExercises.map((ex) => (
                          <div key={ex.name} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{ex.name}</span>
                            <span>{ex.sets}x{ex.reps} · {ex.load}</span>
                          </div>
                        ))}
                      </div>
                      {exec.observations && (
                        <p className="text-xs italic text-muted-foreground pt-2 border-t">"{exec.observations}"</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="font-semibold text-base sm:text-lg mb-3">Aulas com profissionais</h2>
              <StudentHistory />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyPlan;
