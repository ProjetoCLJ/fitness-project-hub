import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Dumbbell, CalendarCheck, Flame, ChevronRight, Trophy, Scale, Target } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { WorkoutExecution, getPlans } from "@/lib/planStore";
import { WeightEntry, addWeightEntry, getWeightEntries, getWeightGoal, setWeightGoal } from "@/lib/bodyWeightStore";
import { exerciseLibrary } from "@/data/exerciseLibrary";

const CURRENT_CLIENT_ID = "1";

const parseWeight = (weight: string) => {
  const match = weight.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const isoWeekKey = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
};

const computeWeekStreak = (executions: WorkoutExecution[]) => {
  if (executions.length === 0) return 0;
  const weeks = new Set(executions.map((e) => isoWeekKey(new Date(e.date))));
  let streak = 0;
  const cursor = new Date();
  while (weeks.has(isoWeekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
};

const MUSCLE_GROUP_BY_NAME = new Map(exerciseLibrary.map((ex) => [ex.name.toLowerCase(), ex.muscleGroup]));

const Stats = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weightGoal, setWeightGoalState] = useState<number | undefined>();
  const [logOpen, setLogOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    const all = getPlans(CURRENT_CLIENT_ID).flatMap((p) => p.executions);
    const sorted = [...all].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setExecutions(sorted);
    setWeightEntries(getWeightEntries(CURRENT_CLIENT_ID));
    setWeightGoalState(getWeightGoal(CURRENT_CLIENT_ID));
  }, []);

  const logWeight = () => {
    const value = Number(weightInput.replace(",", "."));
    if (!value || value <= 0) return;
    setWeightEntries(addWeightEntry(CURRENT_CLIENT_ID, value));
    setWeightInput("");
    setLogOpen(false);
  };

  const saveGoal = () => {
    const value = Number(goalInput.replace(",", "."));
    if (!value || value <= 0) return;
    setWeightGoal(CURRENT_CLIENT_ID, value);
    setWeightGoalState(value);
    setGoalInput("");
    setGoalOpen(false);
  };

  const weightChartData = weightEntries.map((e) => ({
    date: new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    weight: e.weight,
  }));
  const currentWeight = weightEntries[weightEntries.length - 1]?.weight;
  const previousWeight = weightEntries[weightEntries.length - 2]?.weight;
  const weightDelta = currentWeight !== undefined && previousWeight !== undefined ? currentWeight - previousWeight : null;

  const prCount = useMemo(
    () => executions.reduce((sum, e) => sum + e.exerciseLogs.filter((l) => l.isPR).length, 0),
    [executions]
  );

  const muscleBalance = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const counts = new Map<string, number>();
    executions
      .filter((e) => new Date(e.date).getTime() >= thirtyDaysAgo)
      .forEach((e) =>
        e.exerciseLogs.forEach((log) => {
          const group = MUSCLE_GROUP_BY_NAME.get(log.performedName.toLowerCase());
          if (!group) return;
          counts.set(group, (counts.get(group) ?? 0) + log.sets.length);
        })
      );
    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] ?? 0;
    return { entries, max };
  }, [executions]);

  const activityDays = useMemo(() => {
    const trained = new Set(executions.map((e) => new Date(e.date).toDateString()));
    const days: { date: Date; trained: boolean }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ date: d, trained: trained.has(d.toDateString()) });
    }
    return days;
  }, [executions]);

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    executions.forEach((e) => e.exerciseLogs.forEach((log) => names.add(log.performedName)));
    return Array.from(names).sort();
  }, [executions]);

  useEffect(() => {
    if (!selectedExercise && exerciseNames.length > 0) setSelectedExercise(exerciseNames[0]);
  }, [exerciseNames, selectedExercise]);

  const progressData = useMemo(() => {
    if (!selectedExercise) return [];
    return executions
      .filter((e) => e.exerciseLogs.some((log) => log.performedName === selectedExercise))
      .map((e) => {
        const log = e.exerciseLogs.find((l) => l.performedName === selectedExercise)!;
        const topWeight = Math.max(...log.sets.map((s) => parseWeight(s.weight)), 0);
        return {
          date: new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          weight: topWeight,
        };
      });
  }, [executions, selectedExercise]);

  if (!user || user.userType !== "student") return null;

  const now = new Date();
  const thisMonth = executions.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const streak = computeWeekStreak(executions);
  const recent = [...executions].reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Estatísticas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Sua evolução ao longo do tempo</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="p-3 sm:p-4 text-center">
            <Dumbbell className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold">{executions.length}</div>
            <div className="text-xs text-muted-foreground">Treinos totais</div>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <CalendarCheck className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold">{thisMonth}</div>
            <div className="text-xs text-muted-foreground">Este mês</div>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <Flame className="h-4 w-4 text-primary mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold">{streak}</div>
            <div className="text-xs text-muted-foreground">Semanas seguidas</div>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <Trophy className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <div className="text-lg sm:text-2xl font-bold">{prCount}</div>
            <div className="text-xs text-muted-foreground">Recordes</div>
          </Card>
        </div>

        <Card className="p-4 sm:p-6 mb-6">
          <h2 className="font-semibold mb-4">Atividade — últimos 84 dias</h2>
          <div className="grid grid-cols-12 gap-1">
            {activityDays.map((day) => (
              <div
                key={day.date.toISOString()}
                title={day.date.toLocaleDateString("pt-BR")}
                className={`aspect-square rounded-sm ${day.trained ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </Card>

        {muscleBalance.entries.length > 0 && (
          <Card className="p-4 sm:p-6 mb-6">
            <h2 className="font-semibold mb-4">Grupos musculares — últimos 30 dias</h2>
            <div className="space-y-2">
              {muscleBalance.entries.map(([group, count]) => (
                <div key={group}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{group}</span>
                    <span className="text-muted-foreground">{count} séries</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(count / muscleBalance.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Peso corporal
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
                <Target className="h-3.5 w-3.5 mr-1" />
                Meta
              </Button>
              <Button size="sm" onClick={() => setLogOpen(true)}>Registrar</Button>
            </div>
          </div>

          {currentWeight !== undefined && (
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold">{currentWeight} kg</span>
              {weightDelta !== null && (
                <span className={`text-sm ${weightDelta <= 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg
                </span>
              )}
              {weightGoal && <span className="text-xs text-muted-foreground">· meta {weightGoal} kg</span>}
            </div>
          )}

          {weightChartData.length > 0 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pesagem registrada ainda.</p>
          )}
        </Card>

        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar peso</DialogTitle>
              <DialogDescription>Adicione sua pesagem de hoje.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="weight-input">Peso (kg)</Label>
                <Input id="weight-input" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} placeholder="Ex: 65.5" />
              </div>
              <Button variant="hero" className="w-full" onClick={logWeight}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Meta de peso</DialogTitle>
              <DialogDescription>Defina seu peso-alvo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="goal-input">Peso-alvo (kg)</Label>
                <Input id="goal-input" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} placeholder="Ex: 63" />
              </div>
              <Button variant="hero" className="w-full" onClick={saveGoal}>Salvar meta</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="font-semibold">Progressão de carga</h2>
            {exerciseNames.length > 0 && (
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Exercício" />
                </SelectTrigger>
                <SelectContent>
                  {exerciseNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {progressData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Registre treinos para ver sua progressão de carga aqui.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base sm:text-lg">Treinos recentes</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/student/workouts/history")}>
            Ver todos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum treino ainda.</Card>
          )}
          {recent.map((exec) => (
            <Card key={exec.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{exec.workoutName}</p>
                <p className="text-xs text-muted-foreground">{exec.exerciseLogs.length} exercícios</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(exec.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stats;
