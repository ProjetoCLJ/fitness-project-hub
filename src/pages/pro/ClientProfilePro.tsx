import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Target, ShieldAlert, Sparkles, Plus, Pencil, Copy, Trash2, History as HistoryIcon } from "lucide-react";
import { mockClients } from "./Clients";
import { ClientPlan, Workout, getPlan, savePlanEdits } from "@/lib/planStore";
import { WorkoutEditorDialog } from "@/components/plan/WorkoutEditorDialog";

const ClientProfilePro = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [plan, setPlan] = useState<ClientPlan | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [strategyDraft, setStrategyDraft] = useState("");
  const [approachDraft, setApproachDraft] = useState("");

  const client = mockClients.find((c) => c.id === id) ?? mockClients[0];

  useEffect(() => {
    const loaded = getPlan(client.id);
    setPlan(loaded);
    setObjectiveDraft(loaded.objective);
    setStrategyDraft(loaded.strategy);
    setApproachDraft(loaded.trainingApproach);
  }, [client.id]);

  if (!user || user.userType !== "trainer" || !plan) return null;

  const saveStrategy = () => {
    const updated = savePlanEdits(client.id, {
      objective: objectiveDraft,
      strategy: strategyDraft,
      trainingApproach: approachDraft,
    });
    setPlan(updated);
    toast({ title: "Plano atualizado", description: "O cliente já visualiza a nova versão." });
  };

  const saveWorkout = (workout: Workout) => {
    const exists = plan.workouts.some((w) => w.id === workout.id);
    const workouts = exists
      ? plan.workouts.map((w) => (w.id === workout.id ? workout : w))
      : [...plan.workouts, workout];
    const updated = savePlanEdits(client.id, { workouts });
    setPlan(updated);
    toast({ title: exists ? "Treino atualizado" : "Treino criado", description: `${workout.name} salvo com sucesso.` });
  };

  const duplicateWorkout = (workout: Workout) => {
    const copy: Workout = {
      ...workout,
      id: crypto.randomUUID(),
      name: `${workout.name} (cópia)`,
      exercises: workout.exercises.map((ex) => ({ ...ex, id: crypto.randomUUID() })),
    };
    const updated = savePlanEdits(client.id, { workouts: [...plan.workouts, copy] });
    setPlan(updated);
    toast({ title: "Treino duplicado" });
  };

  const deleteWorkout = (workoutId: string) => {
    const updated = savePlanEdits(client.id, { workouts: plan.workouts.filter((w) => w.id !== workoutId) });
    setPlan(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard/trainer/clients")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Clientes
        </Button>

        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
              {client.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.objective}</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto -mx-4 px-4 mb-6">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="plan">Meu Plano</TabsTrigger>
              <TabsTrigger value="evolution">Evolução</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="permissions">Permissões</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Objetivo atual</p>
                  <p className="font-medium">{client.objective}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Restrições relevantes</p>
                  <p className="font-medium">Leve desconforto no joelho direito — evitar impacto</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Próximo atendimento</p>
                  <p className="font-medium">{client.nextAppointment}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="font-medium">{client.lastUpdate}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="plan" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Textarea id="objective" value={objectiveDraft} onChange={(e) => setObjectiveDraft(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strategy">Estratégia de treinamento</Label>
                <Textarea id="strategy" value={strategyDraft} onChange={(e) => setStrategyDraft(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approach">Abordagem, progressões e prazos</Label>
                <Textarea id="approach" value={approachDraft} onChange={(e) => setApproachDraft(e.target.value)} rows={4} />
              </div>
              <Button variant="hero" onClick={saveStrategy}>
                Salvar plano
              </Button>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base sm:text-lg">Treinos</h2>
              <Button
                size="sm"
                onClick={() => {
                  setEditingWorkout(null);
                  setEditorOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo treino
              </Button>
            </div>

            {plan.workouts.map((workout) => (
              <Card key={workout.id} className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="secondary" className="mb-1">{workout.day}</Badge>
                    <p className="font-semibold">{workout.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingWorkout(workout);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicateWorkout(workout)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteWorkout(workout.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {workout.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {ex.sets}x{ex.reps} · {ex.load} · desc. {ex.rest}
                      </span>
                    </div>
                  ))}
                </div>
                {workout.observations && (
                  <p className="text-xs text-muted-foreground italic mt-3 pt-3 border-t">{workout.observations}</p>
                )}
              </Card>
            ))}

            <WorkoutEditorDialog
              workout={editingWorkout}
              open={editorOpen}
              onOpenChange={setEditorOpen}
              onSave={saveWorkout}
            />

            {plan.versions.length > 0 && (
              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <HistoryIcon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">Versões anteriores</h3>
                </div>
                <div className="space-y-2">
                  {plan.versions.map((v) => (
                    <div key={v.timestamp} className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{v.objective}</span>
                      <span>{new Date(v.timestamp).toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="evolution">
            <Card className="p-6 sm:p-8 text-center border-dashed">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium mb-1">Evolução do cliente em breve</p>
              <p className="text-sm text-muted-foreground">Gráficos de progresso e consistência.</p>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6 sm:p-8 text-center border-dashed">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium mb-1">Histórico de atendimentos em breve</p>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Dados de treino</span>
                <Badge>Autorizado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Dados de nutrição</span>
                <Badge variant="outline">Não autorizado</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Histórico de saúde</span>
                <Badge variant="outline">Não autorizado</Badge>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientProfilePro;
