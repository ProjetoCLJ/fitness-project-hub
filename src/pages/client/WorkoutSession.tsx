import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RestTimer } from "@/components/plan/RestTimer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Repeat, X, CheckCircle2, AlertTriangle, Link2, Dumbbell, Check } from "lucide-react";
import { ExerciseLog, Plan, SetLog, getActivePlan, getPlans, recordExecution } from "@/lib/planStore";
import { NumberStepper } from "@/components/ui/number-stepper";

const CURRENT_CLIENT_ID = "1";

const parseRestSeconds = (rest: string) => {
  const match = rest.match(/(\d+)/);
  return match ? Number(match[1]) : 60;
};

const parseWeight = (weight: string) => {
  const match = weight.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

interface ExerciseDraft {
  performedName: string;
  swapping: boolean;
  sets: (SetLog & { done: boolean })[];
  notes: string;
}

const WorkoutSession = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workoutId } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [observations, setObservations] = useState("");
  const [restSeconds, setRestSeconds] = useState<number | null>(null);

  useEffect(() => {
    const activePlan = getActivePlan(CURRENT_CLIENT_ID);
    setPlan(activePlan ?? null);
  }, []);

  const workout = useMemo(() => plan?.workouts.find((w) => w.id === workoutId), [plan, workoutId]);

  useEffect(() => {
    if (!workout) return;
    const initial: Record<string, ExerciseDraft> = {};
    workout.exercises.forEach((ex) => {
      initial[ex.id] = {
        performedName: ex.name,
        swapping: false,
        sets: Array.from({ length: ex.sets }, (_, i) => ({ setNumber: i + 1, weight: ex.load, reps: "", done: false })),
        notes: "",
      };
    });
    setDrafts(initial);
  }, [workout]);

  if (!user || user.userType !== "student" || !plan || !workout) return null;

  const exercise = workout.exercises[exerciseIndex];
  const draft = drafts[exercise.id];
  const nextExercise = workout.exercises[exerciseIndex + 1];
  const prevExercise = workout.exercises[exerciseIndex - 1];
  const linkedWithNext = !!exercise.supersetGroup && nextExercise?.supersetGroup === exercise.supersetGroup;
  const linkedWithPrev = !!exercise.supersetGroup && prevExercise?.supersetGroup === exercise.supersetGroup;

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const doneSets = Object.values(drafts).reduce((sum, d) => sum + d.sets.filter((s) => s.done).length, 0);
  const isLastExercise = exerciseIndex === workout.exercises.length - 1;

  const updateDraft = (updater: (d: ExerciseDraft) => ExerciseDraft) => {
    setDrafts((prev) => ({ ...prev, [exercise.id]: updater(prev[exercise.id]) }));
  };

  const toggleSetDone = (setNumber: number) => {
    const set = draft.sets.find((s) => s.setNumber === setNumber);
    const willBeDone = !set?.done;
    updateDraft((d) => ({
      ...d,
      sets: d.sets.map((s) => (s.setNumber === setNumber ? { ...s, done: willBeDone } : s)),
    }));
    // Em superset, o descanso só começa depois do último exercício do grupo.
    if (willBeDone && !linkedWithNext) {
      setRestSeconds(parseRestSeconds(exercise.rest));
    }
  };

  const setValue = (setNumber: number, field: "weight" | "reps", value: string) => {
    updateDraft((d) => ({ ...d, sets: d.sets.map((s) => (s.setNumber === setNumber ? { ...s, [field]: value } : s)) }));
  };

  const setEffort = (setNumber: number, effort: number) => {
    updateDraft((d) => ({ ...d, sets: d.sets.map((s) => (s.setNumber === setNumber ? { ...s, effort } : s)) }));
  };

  const toggleSwap = () => {
    updateDraft((d) => ({ ...d, swapping: !d.swapping, performedName: d.swapping ? exercise.name : d.performedName }));
  };

  const finishWorkout = () => {
    const priorExecutions = getPlans(CURRENT_CLIENT_ID).flatMap((p) => p.executions);

    const exerciseLogs: ExerciseLog[] = workout.exercises
      .map((ex) => {
        const d = drafts[ex.id];
        const completedSets = d.sets.filter((s) => s.done).map(({ done, ...rest }) => rest);
        if (completedSets.length === 0) return null;
        const performedName = d.performedName.trim() || ex.name;
        const topWeight = Math.max(...completedSets.map((s) => parseWeight(s.weight)), 0);
        const priorBest = Math.max(
          0,
          ...priorExecutions.flatMap((exec) =>
            exec.exerciseLogs
              .filter((log) => log.performedName === performedName)
              .flatMap((log) => log.sets.map((s) => parseWeight(s.weight)))
          )
        );
        return {
          exerciseId: ex.id,
          plannedName: ex.name,
          performedName,
          sets: completedSets,
          notes: d.notes.trim() || undefined,
          isPR: topWeight > 0 && topWeight > priorBest,
        };
      })
      .filter((log): log is ExerciseLog => log !== null);

    if (exerciseLogs.length === 0) {
      toast({ title: "Nenhuma série registrada", description: "Marque ao menos uma série antes de concluir.", variant: "destructive" });
      return;
    }

    recordExecution(CURRENT_CLIENT_ID, plan.id, {
      workoutId: workout.id,
      workoutName: workout.name,
      date: new Date().toISOString(),
      exerciseLogs,
      observations: observations.trim() || undefined,
    });

    const prCount = exerciseLogs.filter((l) => l.isPR).length;
    toast({
      title: "Treino concluído!",
      description: prCount > 0
        ? `${workout.name} registrado — ${prCount} ${prCount > 1 ? "recordes pessoais" : "recorde pessoal"}! 🏆`
        : `${workout.name} registrado no seu histórico.`,
    });
    navigate("/dashboard/student/workouts");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 sm:pt-24 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student/workouts")}>
            <X className="h-4 w-4 mr-1" />
            Sair
          </Button>
          <span className="text-sm text-muted-foreground">{doneSets}/{totalSets} séries</span>
        </div>

        <Progress value={(doneSets / totalSets) * 100} className="h-2 mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">{workout.name}</h1>
            <p className="text-sm text-muted-foreground">
              Exercício {exerciseIndex + 1} de {workout.exercises.length}
            </p>
          </div>
          <div className="flex gap-1">
            {workout.exercises.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full ${i === exerciseIndex ? "bg-primary" : i < exerciseIndex ? "bg-primary/40" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {(linkedWithNext || linkedWithPrev) && (
          <Badge variant="secondary" className="mb-3">
            <Link2 className="h-3 w-3 mr-1" />
            Superset {linkedWithPrev ? `com ${prevExercise?.name}` : `com ${nextExercise?.name}`}
          </Badge>
        )}

        <Card className="overflow-hidden mb-4">
          <div className="bg-gradient-hero p-4 sm:p-6 text-primary-foreground">
            <div className="flex items-start justify-between gap-2">
              {draft?.swapping ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    autoFocus
                    value={draft.performedName}
                    onChange={(e) => updateDraft((d) => ({ ...d, performedName: e.target.value }))}
                    placeholder="Novo exercício"
                    className="bg-background text-foreground"
                  />
                  <Button variant="secondary" size="icon" onClick={toggleSwap}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                    <Dumbbell className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{draft?.performedName}</h2>
                    {draft && draft.performedName !== exercise.name && (
                      <p className="text-xs opacity-80">no lugar de {exercise.name}</p>
                    )}
                    <p className="text-sm opacity-90 mt-0.5">
                      {exercise.sets}x{exercise.reps} · {exercise.load} · descanso {exercise.rest}
                    </p>
                  </div>
                </div>
              )}
              {!draft?.swapping && (
                <Button variant="secondary" size="sm" onClick={toggleSwap} className="shrink-0">
                  <Repeat className="h-3.5 w-3.5 mr-1" />
                  Trocar
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {draft?.sets.map((set) => (
              <div
                key={`${exercise.id}-${set.setNumber}`}
                className={`rounded-xl border-2 p-3 transition-smooth ${set.done ? "bg-primary/5 border-primary" : "border-border"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${set.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {set.setNumber}
                    </span>
                    Série {set.setNumber}
                  </span>
                  <Button
                    type="button"
                    variant={set.done ? "default" : "outline"}
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => toggleSetDone(set.setNumber)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {set.done ? "Feita" : "Marcar"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 text-center">Peso</p>
                    <NumberStepper value={set.weight} onChange={(v) => setValue(set.setNumber, "weight", v)} suffix="kg" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 text-center">Reps</p>
                    <NumberStepper value={set.reps} onChange={(v) => setValue(set.setNumber, "reps", v)} />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {[0, 1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEffort(set.setNumber, v)}
                      className={`h-7 w-7 rounded-full text-xs font-medium transition-smooth ${
                        set.effort === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">RIR</span>
                </div>
              </div>
            ))}

            <div className="space-y-2 pt-2">
              <Label htmlFor="ex-notes" className="text-sm">Sensações / desconforto</Label>
              <Textarea
                id="ex-notes"
                value={draft?.notes ?? ""}
                onChange={(e) => updateDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Como esse exercício se sentiu hoje?"
                rows={2}
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            disabled={exerciseIndex === 0}
            onClick={() => setExerciseIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          {isLastExercise ? (
            <Button variant="hero" className="flex-1" onClick={finishWorkout}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Concluir treino
            </Button>
          ) : (
            <Button variant="hero" className="flex-1" onClick={() => setExerciseIndex((i) => i + 1)}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {isLastExercise && doneSets < totalSets && (
          <div className="flex items-start gap-2 mt-4 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Você pode concluir com séries pendentes — só as marcadas são registradas.
          </div>
        )}
      </div>

      {restSeconds !== null && (
        <RestTimer seconds={restSeconds} onDone={() => setRestSeconds(null)} />
      )}
    </div>
  );
};

export default WorkoutSession;
