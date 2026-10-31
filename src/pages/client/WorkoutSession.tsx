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
import { ChevronLeft, ChevronRight, Repeat, X, CheckCircle2, AlertTriangle, Link2, Dumbbell, Check, Play, Timer, Flame, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchGmOverview } from "@/lib/gamification";
import { useRefreshGamification } from "@/hooks/useGamification";
import { isNetworkError, queueExecution } from "@/lib/offlineQueue";
import { ExerciseLog, Plan, SetLog, WorkoutExecution, fetchExecutions, fetchPlansForStudent, recordExecution } from "@/lib/planStore";
import { NumberStepper } from "@/components/ui/number-stepper";


const MIN_MINUTES = 25;
const MAX_MINUTES = 240;
const timerKey = (workoutId: string | undefined) => `workout-timer:${workoutId}`;

const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

interface FinishResult {
  valid: boolean;
  minutes: number;
  xpGained: number;
  focoDays: number | null;
  offline: boolean;
}

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
  const clientId = user?.studentId ?? "";
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workoutId } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [observations, setObservations] = useState("");
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [priorExecutions, setPriorExecutions] = useState<WorkoutExecution[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const refreshGm = useRefreshGamification();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [finishOpen, setFinishOpen] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [result, setResult] = useState<FinishResult | null>(null);

  // Cronômetro: guarda o início no aparelho (sobrevive a recarregar) e se encerra sozinho em 4 h.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(timerKey(workoutId)));
      if (saved && Date.now() - saved < MAX_MINUTES * 60000) setStartedAt(saved);
      else localStorage.removeItem(timerKey(workoutId));
    } catch {
      /* sem storage */
    }
  }, [workoutId]);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const startTimer = () => {
    const now = Date.now();
    setStartedAt(now);
    setTick(now);
    try {
      localStorage.setItem(timerKey(workoutId), String(now));
    } catch {
      /* sem storage */
    }
  };

  const elapsedMs = startedAt ? Math.min(tick - startedAt, MAX_MINUTES * 60000) : 0;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  useEffect(() => {
    if (!clientId) return;
    fetchPlansForStudent(clientId)
      .then((all) => setPlan(all.find((p) => p.status === "active" && p.workouts.some((w) => w.id === workoutId)) ?? null))
      .catch(() => setPlan(null));
    fetchExecutions(clientId)
      .then(setPriorExecutions)
      .catch(() => setPriorExecutions([]));
  }, [clientId, workoutId]);

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

  if (!user || !plan || !workout) return null;

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

  const buildLogs = (): ExerciseLog[] =>
    workout.exercises
      .map((ex): ExerciseLog | null => {
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

  const openFinish = () => {
    if (!startedAt) {
      toast({ title: "Inicie o treino primeiro", description: "Toque em Iniciar treino para ligar o cronômetro.", variant: "destructive" });
      return;
    }
    if (buildLogs().length === 0) {
      toast({ title: "Nenhuma série registrada", description: "Marque ao menos uma série antes de concluir.", variant: "destructive" });
      return;
    }
    setMinutes(String(Math.max(1, elapsedMinutes)));
    setFinishOpen(true);
  };

  const confirmFinish = async () => {
    const exerciseLogs = buildLogs();
    const mins = Math.min(MAX_MINUTES, Math.max(1, Math.round(Number(minutes) || 1)));
    const finishedAtDate = new Date();
    const payload = {
      planId: plan.id,
      workoutId: workout.id,
      workoutName: workout.name,
      exerciseLogs,
      observations: observations.trim() || undefined,
      startedAt: new Date(finishedAtDate.getTime() - mins * 60000).toISOString(),
      finishedAt: finishedAtDate.toISOString(),
    };

    setIsSaving(true);
    const before = await fetchGmOverview().catch(() => null);
    let offline = false;
    let valid = mins >= MIN_MINUTES;
    try {
      const saved = await recordExecution(clientId, payload);
      valid = saved.isValid;
    } catch (error) {
      if (isNetworkError(error)) {
        queueExecution(clientId, payload);
        offline = true;
      } else {
        toast({ title: "Não foi possível salvar o treino", description: "Tente novamente.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
    }

    try {
      localStorage.removeItem(timerKey(workoutId));
    } catch {
      /* sem storage */
    }
    const after = offline ? null : await fetchGmOverview().catch(() => null);
    refreshGm();
    setIsSaving(false);
    setFinishOpen(false);
    setResult({
      valid,
      minutes: mins,
      xpGained: before && after ? Math.max(0, after.xp_total - before.xp_total) : 0,
      focoDays: after?.foco.active ? after.foco.days : null,
      offline,
    });
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

        {startedAt ? (
          <Card className="p-3 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold tabular-nums">{formatElapsed(elapsedMs)}</span>
            </div>
            <span className={`text-xs text-right ${elapsedMinutes >= MIN_MINUTES ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
              {elapsedMinutes >= MIN_MINUTES ? "Treino válido para XP e Foco" : `Faltam ${MIN_MINUTES - elapsedMinutes} min para valer XP e Foco`}
            </span>
          </Card>
        ) : (
          <Card className="p-4 mb-4 border-primary/40 space-y-3">
            <p className="text-sm">
              Ligue o cronômetro ao começar. Para valer <strong>XP e Foco</strong>, o treino precisa ter pelo menos <strong>{MIN_MINUTES} minutos</strong>.
            </p>
            <Button variant="hero" className="w-full" onClick={startTimer}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar treino
            </Button>
          </Card>
        )}

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
            <Button variant="hero" className="flex-1" onClick={openFinish} disabled={isSaving}>
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

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Concluir treino</DialogTitle>
            <DialogDescription>Confira a duração. Você pode ajustar se esqueceu de parar o cronômetro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="duration-min">Duração (minutos)</Label>
              <Input id="duration-min" type="number" min={1} max={MAX_MINUTES} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>
            {Number(minutes) < MIN_MINUTES ? (
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                Com menos de {MIN_MINUTES} minutos o treino fica no histórico, mas não vale XP nem Foco.
              </p>
            ) : (
              <p className="text-sm text-green-600">Treino válido: vai render XP e contar no seu Foco.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setFinishOpen(false)} disabled={isSaving}>
                Voltar
              </Button>
              <Button variant="hero" className="flex-1" onClick={confirmFinish} disabled={isSaving}>
                Concluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!result}
        onOpenChange={(open) => {
          if (!open) navigate("/dashboard/student/workouts");
        }}
      >
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{result?.offline ? "Treino registrado offline" : "Treino concluído!"}</DialogTitle>
            <DialogDescription>
              {result?.offline
                ? "Ele fica guardado no aparelho e sincroniza quando a internet voltar (até 24 h)."
                : result?.valid
                  ? `${workout.name} · ${result.minutes} min`
                  : `${workout.name} foi registrado, mas com menos de ${MIN_MINUTES} minutos não vale XP nem Foco.`}
            </DialogDescription>
          </DialogHeader>
          {result && !result.offline && result.valid && (
            <div className="flex justify-center gap-6 py-2">
              <div>
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  <Zap className="h-5 w-5 text-yellow-500" />+{result.xpGained}
                </p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
              {result.focoDays !== null && (
                <div>
                  <p className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Flame className="h-5 w-5 text-orange-500" />
                    {result.focoDays}
                  </p>
                  <p className="text-xs text-muted-foreground">dias de Foco</p>
                </div>
              )}
            </div>
          )}
          <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard/student/workouts")}>
            Continuar
          </Button>
        </DialogContent>
      </Dialog>

      {restSeconds !== null && (
        <RestTimer seconds={restSeconds} onDone={() => setRestSeconds(null)} />
      )}
    </div>
  );
};

export default WorkoutSession;
