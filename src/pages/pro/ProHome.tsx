import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Clock,
  Bell,
  DollarSign,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { ScheduleEvent, countAvailableSlots, eventTitle, fetchLinkedStudents, fetchTrainerEvents, upcomingOccurrences } from "@/lib/agendaStore";
import { fetchRequestsForTrainer } from "@/lib/requestsStore";
import { computeMonthRevenue, fetchBasePrice } from "@/lib/financeCalc";

const formatDate = (dateISO: string) =>
  new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const money = (value: number) => `R$ ${value.toLocaleString("pt-BR")}`;

interface Summary {
  activeClients: number;
  pendingRequests: number;
  availableSlotsWeek: number;
  previsto: number;
  possivel: number;
  upcoming: { event: ScheduleEvent; date: string }[];
}

const emptySummary: Summary = {
  activeClients: 0,
  pendingRequests: 0,
  availableSlotsWeek: 0,
  previsto: 0,
  possivel: 0,
  upcoming: [],
};

const ProHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary>(emptySummary);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [events, students, requests, basePrice] = await Promise.all([
          fetchTrainerEvents(user.id),
          fetchLinkedStudents(user.id),
          fetchRequestsForTrainer(user.id),
          fetchBasePrice(user.id),
        ]);
        const revenue = computeMonthRevenue(events, students, basePrice);
        setSummary({
          activeClients: students.length,
          pendingRequests: requests.length,
          availableSlotsWeek: countAvailableSlots(events, 7),
          previsto: revenue.previsto,
          possivel: revenue.possivel,
          upcoming: upcomingOccurrences(events, 30),
        });
      } catch {
        setSummary(emptySummary);
      }
    })();
  }, [user]);

  if (!user || user.userType !== "trainer") return null;

  const weekLimit = new Date();
  weekLimit.setDate(weekLimit.getDate() + 7);
  const appointmentsThisWeek = summary.upcoming.filter((o) => new Date(`${o.date}T00:00:00`) <= weekLimit).length;

  const indicators = [
    { label: "Clientes ativos", value: String(summary.activeClients), icon: Users },
    { label: "Atendimentos na semana", value: String(appointmentsThisWeek), icon: Calendar },
    { label: "Solicitações pendentes", value: String(summary.pendingRequests), icon: Bell },
    { label: "Horários disponíveis", value: String(summary.availableSlotsWeek), icon: Clock },
    { label: "Faturamento previsto", value: money(summary.previsto), icon: DollarSign },
    { label: "Faturamento possível", value: money(summary.possivel), icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Olá, {user.profile.fullName.split(" ")[0]}!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Resumo do seu dia</p>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {indicators.map((ind) => (
            <Card key={ind.label} className="p-3 sm:p-4">
              <ind.icon className="h-4 w-4 text-primary mb-2" />
              <div className="text-lg sm:text-2xl font-bold">{ind.value}</div>
              <div className="text-xs text-muted-foreground">{ind.label}</div>
            </Card>
          ))}
        </div>

        {summary.pendingRequests > 0 && (
          <Card
            className="p-4 sm:p-6 mb-4 flex items-center justify-between cursor-pointer hover:shadow-medium transition-smooth"
            onClick={() => navigate("/dashboard/trainer/requests")}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <p className="font-medium">Você tem solicitações aguardando resposta</p>
            </div>
            <Badge variant="secondary">{summary.pendingRequests}</Badge>
          </Card>
        )}

        {/* Próximos atendimentos */}
        <Card className="p-4 sm:p-6 mb-4">
          <h2 className="font-semibold text-base sm:text-lg mb-3">Próximos atendimentos</h2>
          {summary.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum atendimento agendado ainda.</p>
          ) : (
            <div className="space-y-3">
              {summary.upcoming.slice(0, 5).map((o) => (
                <div key={`${o.event.id}-${o.date}`} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/30">
                  <p className="font-medium">{eventTitle(o.event)}</p>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(o.date)} · {o.event.startTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Atalho para clientes */}
        <Card
          className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:shadow-medium transition-smooth"
          onClick={() => navigate("/dashboard/trainer/clients")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Ver carteira de clientes</p>
              <p className="text-sm text-muted-foreground">Planos, treinos e evolução</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Card>
      </div>
    </div>
  );
};

export default ProHome;
