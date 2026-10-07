import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Plan, fetchPlansForStudent } from "@/lib/planStore";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const statusLabel: Record<Plan["status"], string> = { active: "Atual", completed: "Concluído", cancelled: "Excluído" };

const PlanHistory = () => {
  const { user } = useAuth();
  const clientId = user?.id ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (!clientId) return;
    fetchPlansForStudent(clientId)
      .then(setPlans)
      .catch(() => toast({ title: "Não foi possível carregar o histórico", variant: "destructive" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

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

        {plans.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum plano encontrado ainda.</Card>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="p-4 sm:p-6 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{plan.title}</p>
                    <p className="text-sm text-muted-foreground">{plan.objective}</p>
                  </div>
                  <Badge variant={plan.status === "active" ? "default" : "secondary"} className="shrink-0">
                    {statusLabel[plan.status]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                  <div>
                    <p className="text-muted-foreground">Início</p>
                    <p className="font-medium">{formatDate(plan.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prazo</p>
                    <p className="font-medium">{plan.endDate ? formatDate(plan.endDate) : "Sem prazo"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Personal Trainer</p>
                    <p className="font-medium">{plan.trainerName}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanHistory;
