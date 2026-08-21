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

const ProHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.userType !== "trainer") return null;

  const indicators = [
    { label: "Clientes ativos", value: "18", icon: Users },
    { label: "Atendimentos na semana", value: "12", icon: Calendar },
    { label: "Solicitações pendentes", value: "3", icon: Bell },
    { label: "Horários disponíveis", value: "8h", icon: Clock },
    { label: "Faturamento atual", value: "R$ 4.800", icon: DollarSign },
    { label: "Potencial de faturamento", value: "R$ 800", icon: TrendingUp },
  ];

  const upcomingAppointments = [
    { client: "Maria Fernanda", time: "Hoje, 14:00", type: "Musculação" },
    { client: "João Pedro", time: "Hoje, 16:00", type: "Avaliação física" },
    { client: "Beatriz Lima", time: "Amanhã, 09:00", type: "Musculação" },
  ];

  const pendingRequests = [
    { client: "Lucas Rodrigues", requestedTime: "Sexta, 10:00" },
    { client: "Ana Costa", requestedTime: "Sexta, 15:00" },
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

        {/* Solicitações pendentes */}
        {pendingRequests.length > 0 && (
          <Card className="p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-base sm:text-lg">Solicitações pendentes</h2>
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.client} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/30">
                  <span className="font-medium">{req.client}</span>
                  <span className="text-muted-foreground">{req.requestedTime}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Próximos atendimentos */}
        <Card className="p-4 sm:p-6 mb-4">
          <h2 className="font-semibold text-base sm:text-lg mb-3">Próximos atendimentos</h2>
          <div className="space-y-3">
            {upcomingAppointments.map((appt) => (
              <div key={`${appt.client}-${appt.time}`} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/30">
                <div>
                  <p className="font-medium">{appt.client}</p>
                  <p className="text-xs text-muted-foreground">{appt.type}</p>
                </div>
                <span className="text-muted-foreground text-xs">{appt.time}</span>
              </div>
            ))}
          </div>
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
