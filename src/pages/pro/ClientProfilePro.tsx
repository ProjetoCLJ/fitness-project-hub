import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Target, ShieldAlert, Sparkles, Plus, Trash2, History as HistoryIcon, CalendarClock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientRow, fetchClientRows } from "./Clients";
import {
  Plan,
  PlanInput,
  Restriction,
  WorkoutExecution,
  addRestriction,
  createPlan,
  deleteRestriction,
  fetchExecutions,
  fetchPlansForStudent,
  fetchRestrictions,
} from "@/lib/planStore";
import { NewPlanDialog } from "@/components/plan/NewPlanDialog";
import { PlanDetail } from "@/components/plan/PlanDetail";

const formatDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

interface StudentInfo {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  description: string;
  fitnessGoals: string;
}

const PlanCard = ({ plan, onOpen }: { plan: Plan; onOpen: () => void }) => (
  <Card className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:shadow-medium transition-smooth" onClick={onOpen}>
    <div className="min-w-0">
      <p className="font-semibold truncate">{plan.title}</p>
      <p className="text-sm text-muted-foreground truncate">{plan.objective || "Sem objetivo definido"}</p>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <CalendarClock className="h-3.5 w-3.5" />
        {formatDate(plan.startDate)} — {plan.endDate ? formatDate(plan.endDate) : "sem prazo"}
      </p>
    </div>
    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
  </Card>
);

const ClientProfilePro = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [client, setClient] = useState<ClientRow | null>(null);
  const [clientLoaded, setClientLoaded] = useState(false);
  const [info, setInfo] = useState<StudentInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [restrictionDraft, setRestrictionDraft] = useState("");

  const trainerId = user?.id ?? "";

  useEffect(() => {
    if (!user) return;
    fetchClientRows(user.id)
      .then((rows) => setClient(rows.find((c) => c.id === id) ?? null))
      .catch(() => setClient(null))
      .finally(() => setClientLoaded(true));
  }, [user, id]);

  const loadData = useCallback(async () => {
    if (!client) return;
    try {
      const [loadedPlans, loadedExecutions, loadedRestrictions, infoRes] = await Promise.all([
        fetchPlansForStudent(client.id),
        fetchExecutions(client.id),
        fetchRestrictions(client.id),
        supabase
          .from("student_profiles")
          .select("description, fitness_goals, profiles(full_name, email, phone, birth_date)")
          .eq("id", client.id)
          .maybeSingle(),
      ]);
      setPlans(loadedPlans);
      setExecutions(loadedExecutions);
      setRestrictions(loadedRestrictions);
      const profile = infoRes.data?.profiles as { full_name: string; email: string; phone: string | null; birth_date: string | null } | null;
      setInfo({
        fullName: profile?.full_name ?? client.name,
        email: profile?.email ?? client.email,
        phone: profile?.phone ?? "",
        birthDate: profile?.birth_date ?? "",
        description: infoRes.data?.description ?? "",
        fitnessGoals: infoRes.data?.fitness_goals ?? "",
      });
    } catch {
      toast({ title: "Não foi possível carregar os dados do cliente", variant: "destructive" });
    }
  }, [client, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user || user.userType !== "trainer") return null;
  if (!clientLoaded) return null;

  const backButton = (
    <Button variant="ghost" onClick={() => navigate("/dashboard/trainer/clients")} className="mb-4 -ml-2">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Clientes
    </Button>
  );

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLoginClick={() => {}} />
        <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
          {backButton}
          <Card className="p-8 text-center text-sm text-muted-foreground">Cliente não encontrado.</Card>
        </div>
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const handleCreatePlan = async (input: PlanInput) => {
    try {
      const planId = await createPlan(trainerId, client.id, input);
      await loadData();
      setNewPlanOpen(false);
      setSelectedPlanId(planId);
      toast({ title: "Plano criado" });
    } catch {
      toast({ title: "Não foi possível criar o plano", description: "Tente novamente.", variant: "destructive" });
    }
  };

  const handleAddRestriction = async () => {
    const text = restrictionDraft.trim();
    if (!text) return;
    try {
      await addRestriction(trainerId, client.id, text);
      setRestrictionDraft("");
      setRestrictions(await fetchRestrictions(client.id));
    } catch {
      toast({ title: "Não foi possível adicionar a restrição", variant: "destructive" });
    }
  };

  const handleDeleteRestriction = async (restrictionId: string) => {
    try {
      await deleteRestriction(restrictionId);
      setRestrictions((prev) => prev.filter((r) => r.id !== restrictionId));
    } catch {
      toast({ title: "Não foi possível remover a restrição", variant: "destructive" });
    }
  };

  const recentExecutions = executions.slice(0, 15);

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        {backButton}

        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
              {client.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            if (value !== "plans") setSelectedPlanId(null);
          }}
        >
          <div className="overflow-x-auto -mx-4 px-4 mb-6">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="plans">Planos</TabsTrigger>
              <TabsTrigger value="evolution">Evolução</TabsTrigger>
              <TabsTrigger value="restrictions">Restrições</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="permissions">Permissões</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Planos ativos</p>
                  {activePlans.length === 0 ? (
                    <p className="font-medium">Nenhum plano ativo</p>
                  ) : (
                    activePlans.map((p) => (
                      <p key={p.id} className="font-medium">
                        {p.title}
                        {p.objective && <span className="text-muted-foreground font-normal"> — {p.objective}</span>}
                      </p>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Restrições relevantes</p>
                  {restrictions.length === 0 ? (
                    <p className="font-medium">Nenhuma restrição registrada</p>
                  ) : (
                    restrictions.map((r) => (
                      <p key={r.id} className="font-medium">
                        {r.description}
                      </p>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Próximo atendimento</p>
                <p className="font-medium">{client.nextAppointment}</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="p-4 sm:p-6 space-y-4">
              {[
                ["Nome", info?.fullName],
                ["E-mail", info?.email],
                ["Telefone", info?.phone],
                ["Data de nascimento", info?.birthDate ? formatDate(info.birthDate) : ""],
                ["Sobre o aluno", info?.description],
                ["Objetivos de fitness", info?.fitnessGoals],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="font-medium whitespace-pre-wrap">{value || "—"}</p>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-3">
            {selectedPlan ? (
              <PlanDetail plan={selectedPlan} onBack={() => setSelectedPlanId(null)} onChanged={loadData} />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base sm:text-lg">Planos ativos</h2>
                  <Button size="sm" onClick={() => setNewPlanOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo plano
                  </Button>
                </div>
                {activePlans.length === 0 ? (
                  <Card className="p-6 sm:p-8 text-center border-dashed">
                    <p className="font-medium mb-1">Nenhum plano ativo</p>
                    <p className="text-sm text-muted-foreground">Crie o primeiro plano de treino para este cliente.</p>
                  </Card>
                ) : (
                  activePlans.map((p) => <PlanCard key={p.id} plan={p} onOpen={() => setSelectedPlanId(p.id)} />)
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="evolution" className="space-y-3">
            {recentExecutions.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center border-dashed">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="font-medium mb-1">Nenhum treino registrado ainda</p>
                <p className="text-sm text-muted-foreground">
                  Assim que o cliente concluir treinos, você verá aqui cada série, carga e observação registradas.
                </p>
              </Card>
            ) : (
              recentExecutions.map((exec) => (
                <Card key={exec.id} className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{exec.workoutName}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(exec.date)}</span>
                  </div>
                  <div className="space-y-2">
                    {exec.exerciseLogs.map((log, index) => (
                      <div key={`${log.exerciseId ?? log.plannedName}-${index}`} className="text-xs p-2 rounded-md bg-muted/30">
                        <p className="font-medium text-foreground flex items-center gap-1">
                          {log.performedName}
                          {log.performedName !== log.plannedName && (
                            <span className="text-muted-foreground font-normal"> (trocado de {log.plannedName})</span>
                          )}
                          {log.isPR && <span className="text-primary">PR</span>}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 text-muted-foreground">
                          {log.sets.map((set) => (
                            <span key={set.setNumber}>
                              S{set.setNumber}: {set.weight} · {set.reps}
                              {set.effort !== undefined && ` · ${set.effort} RIR`}
                            </span>
                          ))}
                        </div>
                        {log.notes && <p className="italic text-muted-foreground mt-1">"{log.notes}"</p>}
                      </div>
                    ))}
                  </div>
                  {exec.observations && <p className="text-xs italic text-muted-foreground mt-2 pt-2 border-t">"{exec.observations}"</p>}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-3">
            <Card className="p-4 sm:p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Restrições ficam associadas ao aluno, que também pode removê-las.
              </p>
              <Textarea
                value={restrictionDraft}
                onChange={(e) => setRestrictionDraft(e.target.value)}
                rows={2}
                placeholder="Ex.: Leve desconforto no joelho direito — evitar impacto"
              />
              <Button onClick={handleAddRestriction} disabled={!restrictionDraft.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar restrição
              </Button>
            </Card>
            {restrictions.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma restrição registrada.</Card>
            ) : (
              restrictions.map((r) => (
                <Card key={r.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium whitespace-pre-wrap">{r.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adicionada por {r.trainerName} em {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  {r.trainerId === trainerId && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRestriction(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {pastPlans.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center border-dashed">
                <HistoryIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">Nenhum plano encerrado ainda</p>
              </Card>
            ) : (
              pastPlans.map((p) => (
                <Card key={p.id} className="p-4 sm:p-6 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.objective || "Sem objetivo definido"}</p>
                    </div>
                    <Badge variant="secondary">{p.status === "completed" ? "Concluído" : "Excluído"}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDate(p.startDate)} — {p.endDate ? formatDate(p.endDate) : "sem prazo"}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Dados de treino</span>
                <Badge>Autorizado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Histórico de saúde</span>
                <Badge variant="outline">Não autorizado</Badge>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NewPlanDialog open={newPlanOpen} onOpenChange={setNewPlanOpen} onCreate={handleCreatePlan} />
    </div>
  );
};

export default ClientProfilePro;
