import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RestTimer } from "@/components/plan/RestTimer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Repeat, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { ExerciseLog, Plan, SetLog, getActivePlan, recordExecution } from "@/lib/planStore";

const CURRENT_CLIENT_ID = "1";

const parseRestSeconds = (rest: string) => {
  const match = rest.match(/(\d+)/);
  return match ? Number(match[1]) : 60;
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
    if (willBeDone) {
      setRestSeconds(parseRestSeconds(exercise.rest));
    }
  };

  const setValue = (setNumber: number, field: "weight" | "reps", value: string) => {
    updateDraft((d) => ({ ...d, sets: d.sets.map((s) => (s.setNumber === setNumber ? { ...s, [field]: value } : s)) }));
  };

  const toggleSwap = () => {
    updateDraft((d) => ({ ...d, swapping: !d.swapping, performedName: d.swapping ? exercise.name : d.performedName }));
  };

  const finishWorkout = () => {
    const exerciseLogs: ExerciseLog[] = workout.exercises
      .map((ex) => {
        const d = drafts[ex.id];
        const completedSets = d.sets.filter((s) => s.done).map(({ done, ...rest }) => rest);
        if (completedSets.length === 0) return null;
        return {
          exerciseId: ex.id,
          plannedName: ex.name,
          performedName: d.performedName.trim() || ex.name,
          sets: completedSets,
          notes: d.notes.trim() || undefined,
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

    toast({ title: "Treino concluído!", description: `${workout.name} registrado no seu histórico.` });
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

        <Progress value={(doneSets / totalSets) * 100} className="h-1.5 mb-4" />

        <h1 className="text-lg sm:text-2xl font-bold mb-1">{workout.name}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Exercício {exerciseIndex + 1} de {workout.exercises.length}
        </p>

        <Card className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            {draft?.swapping ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  autoFocus
                  value={draft.performedName}
                  onChange={(e) => updateDraft((d) => ({ ...d, performedName: e.target.value }))}
                  placeholder="Novo exercício"
                />
                <Button variant="ghost" size="icon" onClick={toggleSwap}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold">{draft?.performedName}</h2>
                {draft && draft.performedName !== exercise.name && (
                  <p className="text-xs text-muted-foreground">no lugar de {exercise.name}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Planejado: {exercise.sets}x{exercise.reps} · {exercise.load} · descanso {exercise.rest}
                </p>
              </div>
            )}
            {!draft?.swapping && (
              <Button variant="outline" size="sm" onClick={toggleSwap} className="shrink-0">
                <Repeat className="h-3.5 w-3.5 mr-1" />
                Trocar
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {draft?.sets.map((set) => (
              <div
                key={set.setNumber}
                className={`flex items-center gap-2 p-2 rounded-md border ${set.done ? "bg-primary/5 border-primary/30" : "border-border"}`}
              >
                <Checkbox checked={set.done} onCheckedChange={() => toggleSetDone(set.setNumber)} />
                <span className="text-sm text-muted-foreground w-14 shrink-0">Série {set.setNumber}</span>
                <Input
                  value={set.weight}
                  onChange={(e) => setValue(set.setNumber, "weight", e.target.value)}
                  placeholder="Peso"
                  className="h-9 text-sm"
                />
                <Input
                  value={set.reps}
                  onChange={(e) => setValue(set.setNumber, "reps", e.target.value)}
                  placeholder="Reps"
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ex-notes" className="text-sm">Sensações / desconforto</Label>
            <Textarea
              id="ex-notes"
              value={draft?.notes ?? ""}
              onChange={(e) => updateDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Como esse exercício se sentiu hoje?"
              rows={2}
            />
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
