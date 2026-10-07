import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Trash2 } from "lucide-react";
import StudentProfile from "@/components/dashboard/student/StudentProfile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Plan, Restriction, deleteRestriction, fetchPlansForStudent, fetchRestrictions } from "@/lib/planStore";

const ClientProfilePage = () => {
  const { user } = useAuth();
  const clientId = user?.id ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);

  useEffect(() => {
    if (!clientId) return;
    fetchPlansForStudent(clientId)
      .then((all) => setPlans(all.filter((p) => p.status === "active")))
      .catch(() => setPlans([]));
    fetchRestrictions(clientId)
      .then(setRestrictions)
      .catch(() => setRestrictions([]));
  }, [clientId]);

  if (!user || user.userType !== "student") return null;

  const handleDeleteRestriction = async (id: string) => {
    try {
      await deleteRestriction(id);
      setRestrictions((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast({ title: "Não foi possível remover a restrição", variant: "destructive" });
    }
  };

  const trainers = Array.from(new Map(plans.map((p) => [p.trainerId, p.trainerName])).entries());

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Perfil</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Suas informações e preferências</p>
        </div>

        <StudentProfile />

        <ThemeToggle />

        {/* Objetivos */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Objetivos</h2>
          {plans.length === 0 ? (
            <Card className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">Nenhum objetivo definido ainda.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <Card key={plan.id} className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{plan.objective || plan.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Prazo: {plan.endDate ? new Date(`${plan.endDate}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "sem prazo"}
                      </p>
                    </div>
                    <Badge>Em andamento</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Restrições */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Restrições</h2>
          {restrictions.length === 0 ? (
            <Card className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <p className="font-medium">Nenhuma restrição registrada</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {restrictions.map((r) => (
                <Card key={r.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium whitespace-pre-wrap">{r.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Adicionada por {r.trainerName}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRestriction(r.id)} title="Remover restrição">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Profissionais */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Profissionais</h2>
          {trainers.length > 0 ? (
            <div className="space-y-3">
              {trainers.map(([trainerId, name]) => (
                <Card key={trainerId} className="p-4 sm:p-6 flex items-center gap-4">
                  <button className="flex items-center gap-4 flex-1 text-left" onClick={() => navigate(`/trainer/${trainerId}`)}>
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-primary hover:underline">{name}</p>
                      <p className="text-sm text-muted-foreground">Personal Trainer</p>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 sm:p-6 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">Você ainda não tem um profissional vinculado.</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/trainers")}>
                Encontrar
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientProfilePage;
