import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SlideToConfirm } from "@/components/ui/slide-to-confirm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { X, CheckCircle2, AlertTriangle, Link2, Check, Play, Pause, Timer, Flame, Zap, ChevronDown, Repeat } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GmOverview, fetchGmOverview, fetchLeagueOverview, fetchMedals } from "@/lib/gamification";
import { PostWorkoutFlow, FlowData } from "@/components/celebration/PostWorkoutFlow";
import { GoalDialog } from "@/components/gamification/GoalDialog";
import { useAuthUid } from "@/hooks/useAuthUid";
import { toLocalISO } from "@/lib/agendaStore";
import { useRefreshGamification } from "@/hooks/useGamification";
import { isNetworkError, queueExecution } from "@/lib/offlineQueue";
import { ExerciseLog, Plan, SetLog, WorkoutExecution, fetchExecutions, fetchPlansForStudent, recordExecution } from "@/lib/planStore";
import { NumberStepper } from "@/components/ui/number-stepper";
import {
  activeElapsedMs,
  clearActiveWorkout,
  pauseActiveWorkout,
  resumeActiveWorkout,
  saveActiveDrafts,
  startActiveWorkout,
  useActiveWorkout,
} from "@/lib/activeWorkout";

const MIN_MINUTES = 25;
const MAX_MINUTES = 240;
const COUNTDOWN_SECONDS = 3;

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

const parseWeight = (weight: string) => {
  const match = weight.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

/** Primeiro número de "10" ou "8-12" (repetições planejadas viram o valor inicial de cada série). */
const plannedReps = (reps: string) => {
  const match = reps.match(/\d+/);
  return match ? match[0] : "";
};

interface ExerciseDraft {
  performedName: string;
  swapping: boolean;
  /** Exercício concluído (o check é por exercício, não por série). */
  done: boolean;
  open: boolean;
  sets: SetLog[];
  notes: string;
}

type Drafts = Record<string, ExerciseDraft>;

const fmtDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");

const WorkoutSession = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workoutId, studentId } = useParams();
  // Professor conduzindo o treino do aluno (mesma tela, salva para os dois).
  const trainerMode = !!studentId;
  const clientId = trainerMode ? (studentId as string) : user?.studentId ?? "";
  const backPath = trainerMode ? `/dashboard/trainer/clients/${studentId}` : "/dashboard/student/workouts";
  const sessionPath = trainerMode ? `/dashboard/trainer/clients/${studentId}/session/${workoutId}` : `/dashboard/student/workouts/session/${workoutId}`;
  const active = useActiveWorkout();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [priorExecutions, setPriorExecutions] = useState<WorkoutExecution[]>([]);
  const [viewing, setViewing] = useState("current");
  const [isSaving, setIsSaving] = useState(false);
  const refreshGm = useRefreshGamification();
  const [tick, setTick] = useState(Date.now());
  const [countdown, setCountdown] = useState<number | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [result, setResult] = useState<FinishResult | null>(null);
  const uid = useAuthUid();
  const [flow, setFlow] = useState<FlowData | null>(null);
  const [accompanied, setAccompanied] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalOverview, setGoalOverview] = useState<GmOverview | null>(null);
  const draftsReady = useRef(false);

  const mine = !!active && active.workoutId === workoutId ? active : null;
  const started = !!mine;
  const paused = !!mine && mine.pausedAt !== null;
  const otherActive = !!active && active.workoutId !== workoutId ? active : null;

  useEffect(() => {
    if (!mine || paused) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mine, paused]);

  const elapsedMs = mine ? Math.min(activeElapsedMs(mine, tick), MAX_MINUTES * 60000) : 0;
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

  // Rascunho: retoma o que já foi preenchido (treino em andamento/pausado) ou começa com o planejado.
  useEffect(() => {
    if (!workout) return;
    const saved = getSavedDrafts(mine?.drafts);
    const initial: Drafts = {};
    workout.exercises.forEach((ex, i) => {
      initial[ex.id] = saved?.[ex.id] ?? {
        performedName: ex.name,
        swapping: false,
        done: false,
        open: i === 0,
        sets: Array.from({ length: ex.sets }, (_, k) => {
          const planned = ex.setPlan?.[k];
          const weight = planned?.weight ?? ex.load;
          const reps = planned ? plannedReps(planned.reps) : plannedReps(ex.reps);
          return { setNumber: k + 1, weight, reps, plannedWeight: weight, plannedReps: reps };
        }),
        notes: "",
      };
    });
    setDrafts(initial);
    draftsReady.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout]);

  useEffect(() => {
    if (draftsReady.current && started) saveActiveDrafts(drafts);
  }, [drafts, started]);

  // Contagem regressiva de 3 s antes de começar.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      if (workout) startActiveWorkout(workout.id, workout.name, sessionPath);
      setTick(Date.now());
      setCountdown(null);
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, workout]);

  const pastExecutions = useMemo(
    () =>
      priorExecutions
        .filter((e) => e.workoutId === workoutId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [priorExecutions, workoutId]
  );

  if (!user || !plan || !workout) return null;

  const doneCount = Object.values(drafts).filter((d) => d.done).length;
  const viewingPast = !started && viewing !== "current" ? pastExecutions.find((e) => e.id === viewing) : undefined;

  const patchDraft = (exerciseId: string, updater: (d: ExerciseDraft) => ExerciseDraft) => {
    setDrafts((prev) => ({ ...prev, [exerciseId]: updater(prev[exerciseId]) }));
  };

  const toggleDone = (exerciseId: string) => {
    if (!started) {
      toast({ title: "Inicie o treino primeiro", description: "Deslize o botão abaixo para começar.", variant: "destructive" });
      return;
    }
    patchDraft(exerciseId, (d) => ({ ...d, done: !d.done }));
  };

  const setValue = (exerciseId: string, setNumber: number, field: "weight" | "reps", value: string) => {
    patchDraft(exerciseId, (d) => ({ ...d, sets: d.sets.map((s) => (s.setNumber === setNumber ? { ...s, [field]: value } : s)) }));
  };

  const setEffort = (exerciseId: string, setNumber: number, effort: number) => {
    patchDraft(exerciseId, (d) => ({ ...d, sets: d.sets.map((s) => (s.setNumber === setNumber ? { ...s, effort } : s)) }));
  };

  const buildLogs = (): ExerciseLog[] =>
    workout.exercises
      .map((ex): ExerciseLog | null => {
        const d = drafts[ex.id];
        if (!d?.done) return null;
        const performedName = d.performedName.trim() || ex.name;
        const topWeight = Math.max(...d.sets.map((s) => parseWeight(s.weight)), 0);
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
          sets: d.sets,
          notes: d.notes.trim() || undefined,
          isPR: topWeight > 0 && topWeight > priorBest,
        };
      })
      .filter((log): log is ExerciseLog => log !== null);

  const requestStart = () => {
    if (otherActive) {
      toast({ title: "Você tem outro treino em andamento", description: `Conclua ou cancele "${otherActive.workoutName}" antes.`, variant: "destructive" });
      return;
    }
    setCountdown(COUNTDOWN_SECONDS);
  };

  const openFinish = () => {
    if (!started) return;
    if (buildLogs().length === 0) {
      toast({ title: "Nenhum exercício concluído", description: "Marque ao menos um exercício como feito antes de concluir.", variant: "destructive" });
      return;
    }
    setMinutes(String(Math.max(1, elapsedMinutes)));
    setAccompanied(workout.accompanied);
    setFinishOpen(true);
  };

  const pauseWorkout = () => {
    pauseActiveWorkout();
    setExitOpen(false);
    navigate(backPath);
  };

  const cancelWorkout = () => {
    clearActiveWorkout();
    setExitOpen(false);
    navigate(backPath);
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
      observations: undefined,
      startedAt: new Date(finishedAtDate.getTime() - mins * 60000).toISOString(),
      finishedAt: finishedAtDate.toISOString(),
      ...(plan.trainerId ? { accompanied } : {}),
    };

    setIsSaving(true);
    if (trainerMode) {
      try {
        await recordExecution(clientId, { ...payload, accompanied: true });
      } catch {
        toast({ title: "Não foi possível salvar o treino", description: "Tente novamente.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      clearActiveWorkout();
      setIsSaving(false);
      setFinishOpen(false);
      toast({ title: "Treino salvo para o aluno", description: `${workout.name} · ${mins} min. Fica no histórico de vocês dois.` });
      navigate(backPath);
      return;
    }
    const [before, leagueBefore, medalsBefore] = await Promise.all([
      fetchGmOverview().catch(() => null),
      fetchLeagueOverview().catch(() => null),
      uid ? fetchMedals(uid).catch(() => []) : Promise.resolve([]),
    ]);
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

    clearActiveWorkout();
    const [after, leagueAfter, medalsAfter, executions] = offline
      ? [null, null, [], []]
      : await Promise.all([
          fetchGmOverview().catch(() => null),
          fetchLeagueOverview().catch(() => null),
          uid ? fetchMedals(uid).catch(() => []) : Promise.resolve([]),
          fetchExecutions(clientId).catch(() => [] as WorkoutExecution[]),
        ]);
    refreshGm();
    setIsSaving(false);
    setFinishOpen(false);

    if (valid && after) {
      const todayISO = toLocalISO(new Date());
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const weekStartISO = toLocalISO(weekStart);
      const knownBefore = new Set(medalsBefore.map((m) => m.medalKey));
      setFlow({
        workoutName: workout.name,
        minutes: mins,
        xpGained: before ? Math.max(0, after.xp_total - before.xp_total) : 0,
        before,
        after,
        leagueBefore,
        leagueAfter,
        newMedals: medalsAfter.filter((m) => !knownBefore.has(m.medalKey)),
        conqueredGoal: before?.foco.goal && !after.foco.goal && after.foco.goal_status === "conquered" ? before.foco.goal : null,
        firstOfDay: before?.foco.last_workout_on !== todayISO,
        trainedDays: executions.filter((e) => e.isValid).map((e) => e.date.slice(0, 10)).filter((d) => d >= weekStartISO),
        todayISO,
        weekStartISO,
      });
      return;
    }

    setResult({
      valid,
      minutes: mins,
      xpGained: before && after ? Math.max(0, after.xp_total - before.xp_total) : 0,
      focoDays: after?.foco.active ? after.foco.days : null,
      offline,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-48">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 sm:pt-24 max-w-3xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (started ? setExitOpen(true) : navigate(backPath))}
          >
            <X className="h-4 w-4 mr-1" />
            Sair
          </Button>
          {!started && pastExecutions.length > 0 && (
            <Select value={viewing} onValueChange={setViewing}>
              <SelectTrigger className="w-[190px] h-9" aria-label="Ver treino">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Treino atual</SelectItem>
                {pastExecutions.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {fmtDate(e.date)}
                    {e.durationMinutes ? ` · ${e.durationMinutes} min` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Primeira seção: nome do treino, andamento e cronômetro */}
        <Card className="p-4 mb-4 space-y-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">{workout.name}</h1>
            {trainerMode && <Badge variant="secondary" className="mt-1">Você está conduzindo o treino do aluno</Badge>}
            <p className="text-sm text-muted-foreground">
              {started
                ? `${doneCount} de ${workout.exercises.length} exercícios concluídos`
                : `${workout.exercises.length} ${workout.exercises.length === 1 ? "exercício" : "exercícios"}`}
            </p>
          </div>
          {started && (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <div className="flex items-center gap-2">
                {paused ? <Pause className="h-5 w-5 text-amber-500" /> : <Timer className="h-5 w-5 text-primary" />}
                <span className="text-xl font-bold tabular-nums">{formatElapsed(elapsedMs)}</span>
                {paused && <Badge variant="secondary">Pausado</Badge>}
              </div>
              <span className={`text-xs text-right ${elapsedMinutes >= MIN_MINUTES ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                {elapsedMinutes >= MIN_MINUTES ? "Treino válido para XP e Foco" : `Faltam ${MIN_MINUTES - elapsedMinutes} min para valer XP e Foco`}
              </span>
            </div>
          )}
        </Card>

        {viewingPast ? (
          <PastExecutionView execution={viewingPast} />
        ) : (
          <div>
            {workout.exercises.map((ex, index) => {
              const d = drafts[ex.id];
              if (!d) return null;
              const next = workout.exercises[index + 1];
              const linkedWithNext = !!ex.supersetGroup && next?.supersetGroup === ex.supersetGroup;
              return (
                <div key={ex.id}>
                  <Card className={`overflow-hidden ${d.done ? "border-primary bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-3 p-3">
                      <button
                        type="button"
                        aria-label={d.done ? "Desmarcar exercício" : "Marcar exercício como feito"}
                        onClick={() => toggleDone(ex.id)}
                        className={`h-9 w-9 shrink-0 rounded-full border-2 flex items-center justify-center transition-smooth ${
                          d.done ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => patchDraft(ex.id, (x) => ({ ...x, open: !x.open }))}
                        aria-expanded={d.open}
                      >
                        <p className="font-semibold truncate">{d.performedName}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.sets}x{ex.reps} · {ex.load}
                          {d.performedName !== ex.name ? ` · no lugar de ${ex.name}` : ""}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label={d.open ? "Recolher" : "Expandir"}
                        onClick={() => patchDraft(ex.id, (x) => ({ ...x, open: !x.open }))}
                        className="p-1 text-muted-foreground"
                      >
                        <ChevronDown className={`h-5 w-5 transition-transform ${d.open ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {d.open && (
                      <div className="px-3 pb-4 space-y-3 border-t pt-3">
                        {linkedWithNext && (
                          <Badge variant="secondary">
                            <Link2 className="h-3 w-3 mr-1" />
                            Superset com {next?.name}
                          </Badge>
                        )}
                        {d.swapping ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              value={d.performedName}
                              onChange={(e) => patchDraft(ex.id, (x) => ({ ...x, performedName: e.target.value }))}
                              placeholder="Novo exercício"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => patchDraft(ex.id, (x) => ({ ...x, swapping: false, performedName: x.performedName.trim() || ex.name }))}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => patchDraft(ex.id, (x) => ({ ...x, swapping: true }))}>
                            <Repeat className="h-3.5 w-3.5 mr-1" />
                            Trocar exercício
                          </Button>
                        )}

                        {d.sets.map((set, k) => (
                          <div key={set.setNumber}>
                            <div className="rounded-xl border p-3">
                              <p className="font-semibold text-sm mb-2">Série {set.setNumber}</p>
                              <div className="grid grid-cols-2 gap-3 mb-2">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1 text-center">Peso</p>
                                  <NumberStepper value={set.weight} onChange={(v) => setValue(ex.id, set.setNumber, "weight", v)} suffix="kg" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1 text-center">Reps</p>
                                  <NumberStepper value={set.reps} onChange={(v) => setValue(ex.id, set.setNumber, "reps", v)} />
                                </div>
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                {[0, 1, 2, 3, 4, 5].map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setEffort(ex.id, set.setNumber, v)}
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
                            {k < d.sets.length - 1 && (
                              <p className="text-center text-xs text-muted-foreground py-1.5">Descanso entre séries: {ex.rest}</p>
                            )}
                          </div>
                        ))}

                        <div className="space-y-2 pt-1">
                          <Label htmlFor={`notes-${ex.id}`} className="text-sm">
                            Sensações / desconforto
                          </Label>
                          <Textarea
                            id={`notes-${ex.id}`}
                            value={d.notes}
                            onChange={(e) => patchDraft(ex.id, (x) => ({ ...x, notes: e.target.value }))}
                            placeholder="Como esse exercício se sentiu hoje?"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                  {next && (
                    <p className="text-center text-xs text-muted-foreground py-2">
                      {linkedWithNext ? "Superset: sem descanso entre os exercícios" : `Descanso entre exercícios: ${ex.rest}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra fixa: iniciar / concluir (arrastar para a direita) */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="container mx-auto max-w-3xl px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2">
          {!started ? (
            <>
              <p className="text-xs text-center text-muted-foreground">
                Ligue o cronômetro ao começar. Para valer <strong>XP e Foco</strong>, o treino precisa ter pelo menos <strong>{MIN_MINUTES} minutos</strong>.
              </p>
              <SlideToConfirm label="Deslize para iniciar o treino" icon={<Play className="h-5 w-5" />} onConfirm={requestStart} disabled={countdown !== null} />
            </>
          ) : paused ? (
            <Button variant="hero" className="w-full h-[52px]" onClick={resumeActiveWorkout}>
              <Play className="h-4 w-4 mr-2" />
              Retomar treino
            </Button>
          ) : (
            <SlideToConfirm label="Deslize para concluir o treino" icon={<CheckCircle2 className="h-5 w-5" />} onConfirm={openFinish} disabled={isSaving} />
          )}
        </div>
      </div>

      {/* Contagem regressiva */}
      {countdown !== null && (
        <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur flex flex-col items-center justify-center gap-6">
          <p className="text-lg font-semibold">Iniciando treino</p>
          <p className="text-8xl font-bold text-primary tabular-nums">{Math.max(1, countdown)}</p>
          <Button variant="outline" size="sm" onClick={() => setCountdown(null)}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Sair: pausar ou cancelar */}
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sair do treino</DialogTitle>
            <DialogDescription>Pausar mantém o que você já preencheu e permite navegar pela plataforma. Cancelar descarta tudo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="hero" className="w-full" onClick={pauseWorkout}>
              <Pause className="h-4 w-4 mr-2" />
              Pausar treino
            </Button>
            <Button variant="destructive" className="w-full" onClick={cancelWorkout}>
              Cancelar treino
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setExitOpen(false)}>
              Voltar ao treino
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            {plan.trainerId && !trainerMode && (
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <Label htmlFor="finish-acc" className="text-sm">
                  Foi acompanhado pelo professor?
                </Label>
                <Switch id="finish-acc" checked={accompanied} onCheckedChange={setAccompanied} />
              </div>
            )}
            {Number(minutes) < MIN_MINUTES ? (
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                Com menos de {MIN_MINUTES} minutos o treino fica no histórico, mas não vale XP nem Foco.
              </p>
            ) : (
              <p className="text-sm text-green-600">
                {trainerMode ? "Treino válido: vai render XP e contar no Foco do aluno." : "Treino válido: vai render XP e contar no seu Foco."}
              </p>
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

      {flow && (
        <PostWorkoutFlow
          data={flow}
          onDone={() => {
            const needsGoal = !!flow.conqueredGoal && !flow.after.foco.goal;
            if (needsGoal) {
              setGoalOverview(flow.after);
              setGoalOpen(true);
            } else navigate("/dashboard/student/workouts");
            setFlow(null);
          }}
        />
      )}
      {goalOverview && (
        <GoalDialog
          open={goalOpen}
          onOpenChange={(open) => {
            setGoalOpen(open);
            if (!open) navigate("/dashboard/student/workouts");
          }}
          overview={goalOverview}
        />
      )}

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
    </div>
  );
};

/** Lê o rascunho salvo no aparelho (ignora formatos inesperados). */
const getSavedDrafts = (raw: unknown): Drafts | null => {
  if (!raw || typeof raw !== "object") return null;
  return raw as Drafts;
};

/** Detalhes de um treino já feito: exercícios, cargas e repetições. */
const PastExecutionView = ({ execution }: { execution: WorkoutExecution }) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Treino de {fmtDate(execution.date)}
      {execution.durationMinutes ? ` · ${execution.durationMinutes} min` : ""}
      {execution.byTrainer ? " · lançado pelo professor" : ""}
    </p>
    {execution.exerciseLogs.length === 0 ? (
      <Card className="p-4 text-sm text-muted-foreground">Nenhum exercício registrado neste treino.</Card>
    ) : (
      execution.exerciseLogs.map((log, i) => (
        <Card key={`${log.exerciseId ?? i}-${i}`} className="p-3 space-y-2">
          <p className="font-semibold">
            {log.performedName}
            {log.isPR && <Badge className="ml-2">Recorde</Badge>}
          </p>
          {log.performedName !== log.plannedName && <p className="text-xs text-muted-foreground">no lugar de {log.plannedName}</p>}
          <div className="divide-y rounded-md border">
            {log.sets.map((s) => (
              <div key={s.setNumber} className="flex items-center justify-between px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">Série {s.setNumber}</span>
                <span className="text-right">
                  {(s.plannedWeight || s.plannedReps) && (s.plannedWeight !== s.weight || s.plannedReps !== s.reps) && (
                    <span className="text-xs text-muted-foreground mr-2">
                      planejado {s.plannedWeight || "—"} × {s.plannedReps || "—"} →
                    </span>
                  )}
                  {s.weight || "—"} × {s.reps || "—"}
                  {s.effort !== undefined ? ` · RIR ${s.effort}` : ""}
                </span>
              </div>
            ))}
          </div>
          {log.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{log.notes}</p>}
        </Card>
      ))
    )}
    {execution.observations && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{execution.observations}</p>}
  </div>
);

export default WorkoutSession;
