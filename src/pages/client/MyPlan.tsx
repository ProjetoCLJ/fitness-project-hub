import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Target, Dumbbell, ChevronRight, CalendarClock, History } from "lucide-react";
import { Plan, fetchPlansForStudent } from "@/lib/planStore";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const MyPlan = () => {
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
        toast({ title: "Não foi possível carregar seus planos", variant: "destructive" });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!user || user.userType !== "student" || plans === null) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-3xl font-bold">Meu Plano</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student/plan/history")}>
            <History className="h-4 w-4 mr-1" />
            Histórico
          </Button>
        </div>

        {plans.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem um plano ativo. Assim que seu profissional criar um, ele aparece aqui.
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-lg">{plan.title}</h2>
                  <p className="text-sm text-muted-foreground">por {plan.trainerName}</p>
                </div>
                <Badge>Ativo</Badge>
              </div>

              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Objetivo</p>
                  <p className="font-medium whitespace-pre-wrap">{plan.objective || "—"}</p>
                </div>
              </div>

              {plan.description && (
                <div className="flex items-start gap-3">
                  <Dumbbell className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="font-medium whitespace-pre-wrap">{plan.description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                {formatDate(plan.startDate)} — {plan.endDate ? formatDate(plan.endDate) : "sem prazo"}
              </div>

              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard/student/workouts")}>
                Ver treinos e registrar execução
              </Button>
            </Card>
          ))
        )}

        <Button variant="ghost" className="w-full justify-between" onClick={() => navigate("/dashboard/student/profile")}>
          Ver objetivos e restrições no seu perfil
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MyPlan;
