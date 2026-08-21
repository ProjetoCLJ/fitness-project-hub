import { useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  Target,
  Dumbbell,
  Apple,
  ShieldAlert,
  Users,
  History,
  Clock,
  CheckCircle2,
} from "lucide-react";
import StudentHistory from "@/components/dashboard/student/StudentHistory";

const weekWorkouts = [
  {
    day: "Segunda",
    name: "Treino A - Inferiores",
    exercises: [
      { name: "Agachamento livre", sets: 4, reps: "10-12", load: "40kg", rest: "90s" },
      { name: "Leg press", sets: 3, reps: "12-15", load: "120kg", rest: "60s" },
      { name: "Cadeira extensora", sets: 3, reps: "15", load: "30kg", rest: "45s" },
    ],
  },
  {
    day: "Quarta",
    name: "Treino B - Superiores",
    exercises: [
      { name: "Supino reto", sets: 4, reps: "8-10", load: "50kg", rest: "90s" },
      { name: "Puxada frontal", sets: 3, reps: "10-12", load: "45kg", rest: "60s" },
      { name: "Desenvolvimento", sets: 3, reps: "10", load: "20kg", rest: "60s" },
    ],
  },
  {
    day: "Sexta",
    name: "Treino C - Full Body",
    exercises: [
      { name: "Levantamento terra", sets: 4, reps: "8", load: "60kg", rest: "120s" },
      { name: "Remada curvada", sets: 3, reps: "10", load: "40kg", rest: "60s" },
      { name: "Prancha", sets: 3, reps: "45s", load: "-", rest: "30s" },
    ],
  },
];

const MyPlan = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  if (!user || user.userType !== "student") return null;

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
                  <p className="font-medium">Melhorar condicionamento físico</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Dumbbell className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Estratégia de treinamento</p>
                  <p className="font-medium">4 sessões semanais - hipertrofia</p>
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
                  <p className="font-medium">28/11/2024</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="workouts" className="space-y-4">
            {weekWorkouts.map((workout) => (
              <Card key={workout.day} className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Badge variant="secondary" className="mb-1">{workout.day}</Badge>
                    <p className="font-semibold">{workout.name}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  {workout.exercises.map((ex) => (
                    <div key={ex.name} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {ex.sets}x{ex.reps} · {ex.load} · desc. {ex.rest}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="hero" className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Iniciar treino
                </Button>
              </Card>
            ))}
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

          <TabsContent value="history">
            <StudentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyPlan;
