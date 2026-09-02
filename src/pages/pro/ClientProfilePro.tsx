import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Target,
  ShieldAlert,
  Sparkles,
  Plus,
  Pencil,
  Copy,
  Trash2,
  History as HistoryIcon,
  CalendarClock,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { mockClients } from "./Clients";
import { Plan, Workout, getPlans, savePlanEdits, createPlan } from "@/lib/planStore";
import { WorkoutEditorDialog } from "@/components/plan/WorkoutEditorDialog";
import { NewPlanDialog, NewPlanData } from "@/components/plan/NewPlanDialog";

const dateInputValue = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const ClientProfilePro = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [objectiveDraft, setObjectiveDraft] = useState("");
  const [strategyDraft, setStrategyDraft] = useState("");
  const [approachDraft, setApproachDraft] = useState("");
  const [nutritionDraft, setNutritionDraft] = useState("");
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [trainerDraft, setTrainerDraft] = useState("");
  const [nutritionistDraft, setNutritionistDraft] = useState("");
  const [progressDraft, setProgressDraft] = useState(0);

  const client = mockClients.find((c) => c.id === id) ?? mockClients[0];
  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status === "completed").sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  useEffect(() => {
    const loaded = getPlans(client.id);
    setPlans(loaded);
    const active = loaded.find((p) => p.status === "active");
    if (active) {
      setObjectiveDraft(active.objective);
      setStrategyDraft(active.trainingStrategy);
      setApproachDraft(active.trainingApproach);
      setNutritionDraft(active.nutritionStrategy);
      setDeadlineDraft(dateInputValue(active.deadline));
      setTrainerDraft(active.trainerName);
      setNutritionistDraft(active.nutritionistName);
      setProgressDraft(active.progress);
    }
  }, [client.id]);

  if (!user || user.userType !== "trainer" || !activePlan) return null;

  const saveStrategy = () => {
    const updated = savePlanEdits(client.id, activePlan.id, {
      objective: objectiveDraft,
      trainingStrategy: strategyDraft,
      trainingApproach: approachDraft,
      nutritionStrategy: nutritionDraft,
      deadline: new Date(deadlineDraft).toISOString(),
      trainerName: trainerDraft,
      nutritionistName: nutritionistDraft,
      progress: progressDraft,
    });
    setPlans(updated);
    toast({ title: "Plano atualizado", description: "O cliente já visualiza a nova versão." });
  };

  const saveWorkout = (workout: Workout) => {
    const exists = activePlan.workouts.some((w) => w.id === workout.id);
    const workouts = exists
      ? activePlan.workouts.map((w) => (w.id === workout.id ? workout : w))
      : [...activePlan.workouts, workout];
    const updated = savePlanEdits(client.id, activePlan.id, { workouts });
    setPlans(updated);
    toast({ title: exists ? "Treino atualizado" : "Treino criado", description: `${workout.name} salvo com sucesso.` });
  };

  const duplicateWorkout = (workout: Workout) => {
    const copy: Workout = {
      ...workout,
      id: crypto.randomUUID(),
      name: `${workout.name} (cópia)`,
      exercises: workout.exercises.map((ex) => ({ ...ex, id: crypto.randomUUID() })),
    };
    const updated = savePlanEdits(client.id, activePlan.id, { workouts: [...activePlan.workouts, copy] });
    setPlans(updated);
    toast({ title: "Treino duplicado" });
  };

  const deleteWorkout = (workoutId: string) => {
    const updated = savePlanEdits(client.id, activePlan.id, { workouts: activePlan.workouts.filter((w) => w.id !== workoutId) });
    setPlans(updated);
  };

  const moveWorkout = (workoutId: string, direction: -1 | 1) => {
    const index = activePlan.workouts.findIndex((w) => w.id === workoutId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= activePlan.workouts.length) return;
    const reordered = [...activePlan.workouts];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const updated = savePlanEdits(client.id, activePlan.id, { workouts: reordered });
    setPlans(updated);
  };

  const handleCreatePlan = (data: NewPlanData) => {
    const updated = createPlan(client.id, data);
    setPlans(updated);
    toast({ title: "Novo plano criado", description: "O plano anterior foi movido para o histórico." });
  };

  const allExecutions = plans.flatMap((p) => p.executions.map((exec) => ({ ...exec, planTitle: p.title })));
  const recentExecutions = [...allExecutions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

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
            <p className="text-sm text-muted-foreground">{activePlan.objective}</p>
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
                  <p className="font-medium">{activePlan.objective}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={activePlan.progress} className="h-2 flex-1" />
                <span className="text-sm font-medium">{activePlan.progress}%</span>
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
                  <p className="text-sm text-muted-foreground">Prazo do plano</p>
                  <p className="font-medium">{formatDate(activePlan.deadline)}</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="plan" className="space-y-4">
            <Card className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{activePlan.title}</p>
                <Button variant="outline" size="sm" onClick={() => setNewPlanOpen(true)}>
                  Iniciar novo plano
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Textarea id="objective" value={objectiveDraft} onChange={(e) => setObjectiveDraft(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Prazo (meta)</Label>
                  <Input id="deadline" type="date" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progress">Progresso (%)</Label>
                  <Input
                    id="progress"
                    type="number"
                    min={0}
                    max={100}
                    value={progressDraft}
                    onChange={(e) => setProgressDraft(Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="trainer-name">Personal Trainer</Label>
                  <Input id="trainer-name" value={trainerDraft} onChange={(e) => setTrainerDraft(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nutritionist-name">Nutricionista</Label>
                  <Input id="nutritionist-name" value={nutritionistDraft} onChange={(e) => setNutritionistDraft(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="strategy">Estratégia de treinamento</Label>
                <Textarea id="strategy" value={strategyDraft} onChange={(e) => setStrategyDraft(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approach">Abordagem, progressões e prazos</Label>
                <Textarea id="approach" value={approachDraft} onChange={(e) => setApproachDraft(e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nutrition">Estratégia nutricional</Label>
                <Textarea id="nutrition" value={nutritionDraft} onChange={(e) => setNutritionDraft(e.target.value)} rows={2} />
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

            {activePlan.workouts.map((workout, index) => (
              <Card key={workout.id} className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge variant="secondary" className="mb-1">{workout.day}</Badge>
                    <p className="font-semibold">{workout.name}</p>
                  </div>
                  <div className="flex gap-1">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-8"
                        disabled={index === 0}
                        onClick={() => moveWorkout(workout.id, -1)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-8"
                        disabled={index === activePlan.workouts.length - 1}
                        onClick={() => moveWorkout(workout.id, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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

            <NewPlanDialog
              open={newPlanOpen}
              onOpenChange={setNewPlanOpen}
              defaultTrainerName={activePlan.trainerName}
              defaultNutritionistName={activePlan.nutritionistName}
              onCreate={handleCreatePlan}
            />

            {activePlan.versions.length > 0 && (
              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <HistoryIcon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm">Versões anteriores deste plano</h3>
                </div>
                <div className="space-y-2">
                  {activePlan.versions.map((v) => (
                    <div key={v.timestamp} className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{v.objective}</span>
                      <span>{new Date(v.timestamp).toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </Card>
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
                    {exec.exerciseLogs.map((log) => (
                      <div key={log.exerciseId} className="text-xs p-2 rounded-md bg-muted/30">
                        <p className="font-medium text-foreground flex items-center gap-1">
                          {log.performedName}
                          {log.performedName !== log.plannedName && (
                            <span className="text-muted-foreground font-normal"> (trocado de {log.plannedName})</span>
                          )}
                          {log.isPR && <span className="text-primary">🏆 PR</span>}
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
                  {exec.observations && (
                    <p className="text-xs italic text-muted-foreground mt-2 pt-2 border-t">"{exec.observations}"</p>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {pastPlans.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center border-dashed">
                <HistoryIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">Nenhum plano concluído ainda</p>
              </Card>
            ) : (
              pastPlans.map((p) => (
                <Card key={p.id} className="p-4 sm:p-6 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.objective}</p>
                    </div>
                    <Badge variant="secondary">Concluído</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDate(p.startDate)} — {formatDate(p.endDate ?? p.deadline)} · progresso final {p.progress}%
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
