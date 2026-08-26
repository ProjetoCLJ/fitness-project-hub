import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Plan, getPlans } from "@/lib/planStore";

const CURRENT_CLIENT_ID = "1";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const PlanHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const all = getPlans(CURRENT_CLIENT_ID);
    setPlans([...all].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
  }, []);

  if (!user || user.userType !== "student") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard/student/plan")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Meu Plano
        </Button>

        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Histórico de planos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Sua evolução ao longo dos planos</p>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-4 sm:p-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{plan.title}</p>
                  <p className="text-sm text-muted-foreground">{plan.objective}</p>
                </div>
                <Badge variant={plan.status === "active" ? "default" : "secondary"} className="shrink-0">
                  {plan.status === "active" ? "Atual" : "Concluído"}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Progress value={plan.progress} className="h-2 flex-1" />
                <span className="text-sm font-medium shrink-0">{plan.progress}%</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                <div>
                  <p className="text-muted-foreground">Início</p>
                  <p className="font-medium">{formatDate(plan.startDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{plan.status === "active" ? "Prazo" : "Concluído em"}</p>
                  <p className="font-medium">{formatDate(plan.endDate ?? plan.deadline)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Personal Trainer</p>
                  <p className="font-medium">{plan.trainerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nutricionista</p>
                  <p className="font-medium">{plan.nutritionistName}</p>
                </div>
              </div>

              {plan.executions.length > 0 && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  {plan.executions.length} treino{plan.executions.length > 1 ? "s" : ""} registrado{plan.executions.length > 1 ? "s" : ""} neste plano
                </p>
              )}
            </Card>
          ))}

          {plans.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum plano encontrado ainda.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanHistory;
