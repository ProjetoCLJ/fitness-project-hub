import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Clock, User, Target, Play, ChevronRight, CalendarClock } from "lucide-react";
import { Booking, fetchBookingsForStudent, toLocalISO } from "@/lib/agendaStore";
import { Plan, WorkoutExecution, fetchExecutions, fetchPlansForStudent, workoutsOnDate } from "@/lib/planStore";
import { FocoCard } from "@/components/gamification/FocoCard";
import { CelebrationHost } from "@/components/celebration/CelebrationHost";
import { flushPending } from "@/lib/offlineQueue";
import { useGmOverview, useRefreshGamification } from "@/hooks/useGamification";

const formatBookingDate = (dateISO: string, startTime: string) =>
  `${new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${startTime}`;

/**
 * Resumo do usuário como atleta: Foco, próximo treino, progresso da semana e atalho do plano.
 * Usado na Início do aluno e na Início do profissional (que também treina).
 */
export const AthleteSummary = () => {
  const { user } = useAuth();
  const clientId = user?.studentId ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const refreshGm = useRefreshGamification();
  const { data: gm } = useGmOverview();

  // Treinos feitos offline sobem quando houver internet (ao abrir o app e quando a conexão volta).
  useEffect(() => {
    if (!clientId) return;
    const sync = () =>
      flushPending(clientId)
        .then(({ synced }) => {
          if (synced > 0) {
            toast({ title: "Treinos sincronizados", description: `${synced} ${synced === 1 ? "treino registrado offline foi enviado" : "treinos registrados offline foram enviados"}.` });
            refreshGm();
          }
        })
        .catch(() => undefined);
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const [loadedBookings, loadedPlans, loadedExecutions] = await Promise.all([
          fetchBookingsForStudent(clientId),
          fetchPlansForStudent(clientId),
          fetchExecutions(clientId),
        ]);
        setBookings(loadedBookings);
        setPlans(loadedPlans.filter((p) => p.status === "active"));
        setExecutions(loadedExecutions);
      } catch {
        toast({ title: "Não foi possível carregar seus atendimentos", variant: "destructive" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!user) return null;

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const suggestions = bookings.filter((b) => b.status === "suggested");

  // Próximo treino programado (hoje ou o mais próximo dos próximos 60 dias).
  const nextEntry = (() => {
    for (let i = 0; i < 60; i++) {
      const day = new Date();
      day.setDate(day.getDate() + i);
      const iso = toLocalISO(day);
      const found = plans.flatMap((p) => workoutsOnDate(p, iso).map((w) => ({ workout: w, plan: p })));
      if (found.length > 0) return { ...found[0], daysAhead: i, date: day };
    }
    return null;
  })();
  const nextWorkout = nextEntry
    ? {
        name: nextEntry.workout.name,
        when: nextEntry.daysAhead === 0 ? "Hoje" : nextEntry.daysAhead === 1 ? "Amanhã" : `Em ${nextEntry.daysAhead} dias`,
        dateLabel: nextEntry.date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }),
        time: nextEntry.workout.startTime,
        objective: nextEntry.plan.objective || nextEntry.plan.title,
        trainerName: nextEntry.plan.trainerName,
        isToday: nextEntry.daysAhead === 0,
      }
    : null;

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)); // semana de segunda a domingo
  startOfWeek.setHours(0, 0, 0, 0);
  const completedThisWeek = executions.filter((exec) => new Date(exec.date) >= startOfWeek).length;
  let plannedThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    const iso = toLocalISO(day);
    plannedThisWeek += plans.reduce((sum, p) => sum + workoutsOnDate(p, iso).length, 0);
  }
  // Com a gamificação ativa, a semana vem do servidor (treinos planejados x feitos, sem contar treino extra).
  const serverWeek = gm && gm.week.planned > 0 ? gm.week : null;
  const completed = serverWeek ? serverWeek.done : completedThisWeek;
  const planned = serverWeek ? serverWeek.planned : plannedThisWeek;
  const weekProgress = {
    completed,
    planned,
    completionRate: planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0,
  };

  return (
    <>
      <CelebrationHost />

      {/* Seu Foco: dias, meta, XP e liga */}
      <FocoCard autoOpenGoal />

      {/* Próximo treino */}
      <Card className="p-4 sm:p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base sm:text-lg">Próximo treino</h2>
          {nextWorkout && <Badge variant="secondary" className="text-xs">{nextWorkout.objective}</Badge>}
        </div>
        {nextWorkout ? (
          <>
            <div className="space-y-2 mb-4">
              <p className="font-medium">
                {nextWorkout.when}: {nextWorkout.name}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="first-letter:uppercase">{nextWorkout.dateLabel}</span>
                {nextWorkout.time ? ` · ${nextWorkout.time}` : ""}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {nextWorkout.trainerName}
              </div>
            </div>
            <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard/student/workouts")}>
              <Play className="h-4 w-4 mr-2" />
              {nextWorkout.isToday ? "Iniciar treino" : "Ver treinos"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum treino programado nos próximos dias.</p>
        )}
      </Card>

      {/* Solicitações de agendamento */}
      {(pendingBookings.length > 0 || suggestions.length > 0) && (
        <Card className="p-4 sm:p-6 mb-4">
          <h2 className="font-semibold text-base sm:text-lg mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Solicitações de agendamento
          </h2>
          <div className="space-y-3">
            {pendingBookings.map((b) => (
              <div key={b.id} className="p-3 rounded-md bg-muted/30 flex items-center justify-between text-sm">
                <span>Aguardando resposta de {b.trainerName}</span>
                <Badge variant="outline">{formatBookingDate(b.date, b.startTime)}</Badge>
              </div>
            ))}
            {suggestions.length > 0 && (
              <Button size="sm" className="w-full" variant="outline" onClick={() => navigate("/dashboard/student/requests")}>
                {suggestions.length} novo{suggestions.length > 1 ? "s" : ""} horário{suggestions.length > 1 ? "s" : ""} sugerido{suggestions.length > 1 ? "s" : ""} — ver em Solicitações
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Progresso semanal */}
      <Card className="p-4 sm:p-6 mb-4">
        <h2 className="font-semibold text-base sm:text-lg mb-4">Progresso da semana</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold text-primary">{weekProgress.completed}/{weekProgress.planned}</div>
            <div className="text-xs text-muted-foreground">Treinos realizados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{weekProgress.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Taxa de conclusão</div>
          </div>
        </div>
        <Progress value={weekProgress.completionRate} className="h-2" />
      </Card>

      {/* Atalho para Meu Plano */}
      <Card
        className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:shadow-medium transition-smooth"
        onClick={() => navigate("/dashboard/student/plan")}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Ver meu plano completo</p>
            <p className="text-sm text-muted-foreground">Treinos e objetivos</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Card>
    </>
  );
};
