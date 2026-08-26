import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Target, Dumbbell, Apple, ChevronRight, CalendarClock, History } from "lucide-react";
import { Plan, getActivePlan } from "@/lib/planStore";

// Demonstração local: o cliente autenticado (mock) representa sempre
// o cliente "1" (Maria Fernanda) da carteira do profissional, e o
// Personal Trainer é sempre "Carlos Silva" (perfil público id "1").
const CURRENT_CLIENT_ID = "1";
const TRAINER_PROFILE_PATH = "/trainer/1";

type PlanSection = "overview" | "nutrition";

const SECTIONS: { key: PlanSection; label: string }[] = [
  { key: "overview", label: "Visão geral" },
  { key: "nutrition", label: "Nutrição" },
];

const MyPlan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<PlanSection>("overview");
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    setPlan(getActivePlan(CURRENT_CLIENT_ID) ?? null);
  }, []);

  if (!user || user.userType !== "student" || !plan) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(plan.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="pt-16 sm:pt-20">
        <div className="border-b border-border bg-background sticky top-16 sm:top-20 z-40">
          <div className="container mx-auto px-4 py-3 max-w-3xl overflow-x-auto">
            <div className="inline-flex gap-2">
              {SECTIONS.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={section === s.key ? "default" : "outline"}
                  onClick={() => setSection(s.key)}
                  className="rounded-full"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-24 sm:pb-12 pt-6 max-w-3xl space-y-4">
        {section === "overview" && (
          <>
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{plan.title}</p>
                  <h2 className="font-semibold text-lg">Progresso do plano</h2>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-primary">{plan.progress}%</p>
                </div>
              </div>
              <Progress value={plan.progress} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                {daysLeft > 0 ? `${daysLeft} dias até o prazo` : "Prazo do plano atingido"} ·{" "}
                {new Date(plan.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => navigate("/dashboard/student/plan/history")}
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Ver histórico de planos
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Card>

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
                  <p className="font-medium">{plan.trainingStrategy}</p>
                  <p className="text-sm text-muted-foreground mt-1">{plan.trainingApproach}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Apple className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Estratégia nutricional</p>
                  <p className="font-medium">{plan.nutritionStrategy}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard/student/workouts")}
              >
                Ver treinos da semana e registrar execução
              </Button>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <button className="text-left" onClick={() => navigate(TRAINER_PROFILE_PATH)}>
                  <p className="text-sm text-muted-foreground">Personal Trainer</p>
                  <p className="font-medium text-primary hover:underline">{plan.trainerName}</p>
                </button>
                <div>
                  <p className="text-sm text-muted-foreground">Nutricionista</p>
                  <p className="font-medium">{plan.nutritionistName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Início do plano</p>
                  <p className="font-medium">
                    {new Date(plan.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="font-medium">
                    {new Date(plan.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => navigate("/dashboard/student/profile")}
              >
                Ver objetivos e restrições completos no seu perfil
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Card>
          </>
        )}

        {section === "nutrition" && (
          <Card className="p-4 sm:p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Estratégia nutricional</p>
              <p className="font-medium">{plan.nutritionStrategy}</p>
            </div>
            <div className="space-y-3 pt-2 border-t">
              {["Café da manhã - 07:00", "Almoço - 12:30", "Lanche - 16:00", "Jantar - 20:00"].map((meal) => (
                <div key={meal} className="text-sm">{meal}</div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MyPlan;
