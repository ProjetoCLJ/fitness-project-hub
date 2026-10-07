import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Trophy,
  TrendingUp,
  Clock,
  User,
  Target,
  Play,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import { Booking, ScheduleEvent, fetchBookingsForStudent, fetchStudentEvents, toLocalISO, upcomingOccurrences } from "@/lib/agendaStore";
import { RescheduleDialog } from "@/components/dashboard/trainer/TrainerSchedule";
import { Plan, WorkoutExecution, fetchExecutions, fetchPlansForStudent, workoutsOnDate } from "@/lib/planStore";


const formatBookingDate = (dateISO: string, startTime: string) =>
  `${new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${startTime}`;

const ClientHome = () => {
  const { user } = useAuth();
  const clientId = user?.id ?? "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [aulas, setAulas] = useState<{ event: ScheduleEvent & { trainerName: string }; date: string }[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const [rescheduling, setRescheduling] = useState<{ event: ScheduleEvent; date: string } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const [loadedBookings, events, loadedPlans, loadedExecutions] = await Promise.all([
          fetchBookingsForStudent(clientId),
          fetchStudentEvents(clientId),
          fetchPlansForStudent(clientId),
          fetchExecutions(clientId),
        ]);
        setBookings(loadedBookings);
        setPlans(loadedPlans.filter((p) => p.status === "active"));
        setExecutions(loadedExecutions);
        setAulas(upcomingOccurrences(events, 60) as { event: ScheduleEvent & { trainerName: string }; date: string }[]);
      } catch {
        toast({ title: "Não foi possível carregar seus atendimentos", variant: "destructive" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!user || user.userType !== "student") return null;

  const nextAulas = aulas.slice(0, 3);
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const suggestions = bookings.filter((b) => b.status === "suggested");

  // Gamificação (pontuação/ranking/sequência) ainda não tem backend — fica zerada até existir.
  const fitScore = 0;
  const level = { name: "Iniciante", min: 0, max: 999 };
  const levelProgress = ((fitScore - level.min) / (level.max - level.min)) * 100;
  const streak = 0;

  const todayISO = toLocalISO(new Date());
  const todaysWorkouts = plans.flatMap((p) => workoutsOnDate(p, todayISO).map((w) => ({ workout: w, plan: p })));
  const firstWorkout = plans.flatMap((p) => p.workouts.map((w) => ({ workout: w, plan: p })))[0];
  const nextEntry = todaysWorkouts[0] ?? firstWorkout;
  const nextWorkout = nextEntry
    ? {
        name: nextEntry.workout.name,
        day: todaysWorkouts[0] ? "Hoje" : "Quando quiser",
        objective: nextEntry.plan.objective || nextEntry.plan.title,
        trainerName: nextEntry.plan.trainerName,
      }
    : null;

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const completedThisWeek = executions.filter((exec) => new Date(exec.date) >= startOfWeek).length;
  let plannedThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(day.getDate() + i);
    const iso = toLocalISO(day);
    plannedThisWeek += plans.reduce((sum, p) => sum + workoutsOnDate(p, iso).length, 0);
  }
  const weekProgress = {
    completed: completedThisWeek,
    planned: plannedThisWeek,
    completionRate: plannedThisWeek > 0 ? Math.min(100, Math.round((completedThisWeek / plannedThisWeek) * 100)) : 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Olá, {user.profile.fullName.split(" ")[0]}!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Aqui está o resumo do seu dia</p>
        </div>

        {/* Resumo do dia: pontuação, nível, ranking */}
        <Card className="p-4 sm:p-6 mb-4 bg-gradient-hero text-primary-foreground">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-4 w-4" />
                <span className="text-xl sm:text-2xl font-bold">{fitScore}</span>
              </div>
              <div className="text-xs opacity-90">FIT Score</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xl sm:text-2xl font-bold">—</span>
              </div>
              <div className="text-xs opacity-90">No ranking</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="h-4 w-4" />
                <span className="text-xl sm:text-2xl font-bold">{streak}</span>
              </div>
              <div className="text-xs opacity-90">Dias seguidos</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1 opacity-90">
              <span>Nível {level.name}</span>
              <span>{fitScore}/{level.max}</span>
            </div>
            <Progress value={levelProgress} className="h-2 bg-white/20" />
          </div>
        </Card>

        {/* Próximo treino */}
        <Card className="p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base sm:text-lg">Próximo treino</h2>
            {nextWorkout && <Badge variant="secondary" className="text-xs">{nextWorkout.objective}</Badge>}
          </div>
          {nextWorkout ? (
            <>
              <div className="space-y-2 mb-4">
                <p className="font-medium">{nextWorkout.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {nextWorkout.day}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  {nextWorkout.trainerName}
                </div>
              </div>
              <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard/student/plan")}>
                <Play className="h-4 w-4 mr-2" />
                Iniciar treino
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum treino definido ainda.</p>
          )}
        </Card>

        {/* Próximos atendimentos */}
        <Card className="p-4 sm:p-6 mb-4">
          <h2 className="font-semibold text-base sm:text-lg mb-3">Próximos atendimentos</h2>
          {nextAulas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum atendimento confirmado ainda.</p>
          ) : (
            <div className="space-y-2">
              {nextAulas.map((o) => (
                <button
                  key={`${o.event.id}-${o.date}`}
                  className="w-full flex items-center justify-between p-3 rounded-md bg-muted/30 text-left hover:bg-muted/50 transition-smooth"
                  onClick={() => setRescheduling(o)}
                >
                  <div>
                    <p className="font-medium">{o.event.trainerName}</p>
                    <p className="text-sm text-muted-foreground">Personal Trainer</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatBookingDate(o.date, o.event.startTime)}</p>
                    <p className="text-xs text-primary">Solicitar troca</p>
                  </div>
                </button>
              ))}
            </div>
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
      </div>

      {rescheduling && (
        <RescheduleDialog
          open
          onOpenChange={(open) => !open && setRescheduling(null)}
          eventId={rescheduling.event.id}
          occurrenceDate={rescheduling.date}
          defaultStart={rescheduling.event.startTime}
          defaultEnd={rescheduling.event.endTime}
          onSent={() => {
            setRescheduling(null);
            toast({ title: "Pedido enviado", description: "O profissional vai ver o pedido na aba Solicitações." });
          }}
        />
      )}
    </div>
  );
};

export default ClientHome;
