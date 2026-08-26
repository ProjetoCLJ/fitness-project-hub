import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import StudentProfile from "@/components/dashboard/student/StudentProfile";
import { Plan, getActivePlan } from "@/lib/planStore";

const CURRENT_CLIENT_ID = "1";
const TRAINER_PROFILE_PATH = "/trainer/1";

const ClientProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    setPlan(getActivePlan(CURRENT_CLIENT_ID) ?? null);
  }, []);

  if (!user || user.userType !== "student" || !plan) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Perfil</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Suas informações e preferências</p>
        </div>

        <StudentProfile />

        {/* Objetivos */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Objetivos</h2>
          <Card className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold">{plan.objective}</p>
                <p className="text-sm text-muted-foreground">
                  Prazo: {new Date(plan.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
              <Badge>Em andamento</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Progresso estimado: {plan.progress}%</p>
          </Card>
        </div>

        {/* Restrições */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Restrições</h2>
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
        </div>

        {/* Profissionais */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Profissionais</h2>
          <div className="space-y-3">
            <Card className="p-4 sm:p-6 flex items-center gap-4">
              <button
                className="flex items-center gap-4 flex-1 text-left"
                onClick={() => navigate(TRAINER_PROFILE_PATH)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {plan.trainerName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-primary hover:underline">{plan.trainerName}</p>
                  <p className="text-sm text-muted-foreground">Personal Trainer</p>
                </div>
              </button>
              <Button variant="outline" size="sm" onClick={() => navigate("/trainers")}>
                Trocar
              </Button>
            </Card>
            <Card className="p-4 sm:p-6 flex items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {plan.nutritionistName.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{plan.nutritionistName}</p>
                  <p className="text-sm text-muted-foreground">Nutricionista</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/trainers")}>
                Trocar
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientProfilePage;
