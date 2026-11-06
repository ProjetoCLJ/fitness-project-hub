import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Settings, ShieldAlert, Trash2 } from "lucide-react";
import { XpBolt } from "@/components/gamification/FocoFlame";
import { SportIcon } from "@/components/gamification/SportIcon";
import { LeagueTrophy } from "@/components/gamification/LeagueTrophy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FocoCard } from "@/components/gamification/FocoCard";
import { AchievementsTab } from "@/components/gamification/AchievementsTab";
import { StatsContent } from "@/components/stats/StatsContent";
import { useGmOverview, useLeagueOverview } from "@/hooks/useGamification";
import { leagueName } from "@/lib/gamification";
import { sportLabel } from "@/lib/sports";
import { FEATURES } from "@/lib/features";
import { RankingPrivacySetting } from "@/components/gamification/RankingPrivacySetting";
import TrainerProfile from "@/components/dashboard/trainer/TrainerProfile";
import { SearchVisibilityCard } from "@/components/agenda/SearchVisibilityCard";
import StudentProfile from "@/components/dashboard/student/StudentProfile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Plan, Restriction, deleteRestriction, fetchPlansForStudent, fetchRestrictions } from "@/lib/planStore";
import { PaymentsList } from "@/components/finance/PaymentsList";
import { Payment, fetchStudentPayments } from "@/lib/financeStore";

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");

const ClientProfilePage = () => {
  const { user } = useAuth();
  const clientId = user?.studentId ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "resumo";
  const { data: overview } = useGmOverview();
  const { data: league } = useLeagueOverview();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!clientId) return;
    fetchPlansForStudent(clientId)
      .then((all) => setPlans(all.filter((p) => p.status === "active")))
      .catch(() => setPlans([]));
    fetchRestrictions(clientId)
      .then(setRestrictions)
      .catch(() => setRestrictions([]));
    fetchStudentPayments(clientId)
      .then(setPayments)
      .catch(() => setPayments([]));
  }, [clientId]);

  if (!user) return null;

  const handleDeleteRestriction = async (id: string) => {
    try {
      await deleteRestriction(id);
      setRestrictions((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast({ title: "Não foi possível remover a restrição", variant: "destructive" });
    }
  };

  const trainers = Array.from(new Map(plans.filter((p) => p.trainerId).map((p) => [p.trainerId as string, p.trainerName])).entries());
  const isTrainer = user.userType === "trainer";

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Perfil</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Suas informações e preferências</p>
          </div>
          <Button
            variant={tab === "ajustes" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Ajustes"
            title="Ajustes"
            onClick={() => setParams({ tab: "ajustes" }, { replace: true })}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
            <TabsTrigger value="conquistas">
              Conquistas
              {!!overview?.unseen_medals && <span className="ml-1 h-2 w-2 rounded-full bg-destructive inline-block" />}
            </TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <FocoCard />
            <Card className="p-4 sm:p-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold flex items-center justify-center gap-1">
                    <XpBolt className="h-5 w-5" />
                    {(overview?.xp_total ?? 0).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground">XP total</p>
                </div>
                <div>
                  <p className="text-xl font-bold flex items-center justify-center gap-1">
                    <LeagueTrophy league={league?.league ?? 1} className="h-6 w-6" />
                    {leagueName(league?.league ?? 1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Liga</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{overview?.workouts_total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Treinos realizados</p>
                </div>
              </div>
            </Card>
            <div>
              <h2 className="font-semibold text-base sm:text-lg mb-3">XP por esporte</h2>
              <Card className="divide-y">
                {(overview?.xp_by_sport ?? []).length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Seu XP por esporte aparece aqui depois dos primeiros treinos.</p>
                ) : (
                  overview?.xp_by_sport.map((row) => (
                    <div key={row.sport} className="flex items-center justify-between px-4 py-3">
                      <span className="flex items-center gap-3">
                        <SportIcon sport={row.sport} className="h-6 w-6 text-primary" color="currentColor" />
                        {sportLabel(row.sport)}
                      </span>
                      <span className="text-muted-foreground">{row.xp.toLocaleString("pt-BR")} XP</span>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="estatisticas">
            <StatsContent />
          </TabsContent>

          <TabsContent value="conquistas">
            <AchievementsTab />
          </TabsContent>

          <TabsContent value="ajustes" className="space-y-3">
            <h2 className="font-semibold text-base sm:text-lg">Ajustes</h2>
            <ThemeToggle />
            <RankingPrivacySetting />
            {isTrainer && FEATURES.professionalSearch && user && <SearchVisibilityCard trainerId={user.id} />}
          </TabsContent>

          <TabsContent value="dados" className="space-y-6">
        {isTrainer ? (
          <TrainerProfile />
        ) : (
          <>
        <StudentProfile />

        {/* Planos */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Planos</h2>
          {plans.length === 0 ? (
            <Card className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">Você ainda não tem um plano ativo.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className="p-4 sm:p-6 cursor-pointer hover:shadow-medium transition-smooth"
                  onClick={() => navigate(`/dashboard/student/plan?id=${plan.id}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{plan.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {fmt(plan.startDate)} — {plan.endDate ? fmt(plan.endDate) : "sem prazo"}
                      </p>
                      <p className="text-sm text-muted-foreground">{plan.trainerId ? `Profissional: ${plan.trainerName}` : `${sportLabel(plan.sport)} · plano próprio`}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
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

        {/* Pagamentos */}
        <div>
          <h2 className="font-semibold text-base sm:text-lg mb-3">Pagamentos</h2>
          <Card className="p-4 sm:p-6">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado pelo seu profissional ainda.</p>
            ) : (
              <PaymentsList payments={payments} showPayer={false} showTrainer />
            )}
          </Card>
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
              {FEATURES.professionalSearch && (
                <Button variant="outline" size="sm" onClick={() => navigate("/trainers")}>
                  Encontrar
                </Button>
              )}
            </Card>
          )}
        </div>
          </>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientProfilePage;
