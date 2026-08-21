import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export const mockClients = [
  {
    id: "1",
    name: "Maria Fernanda",
    objective: "Emagrecimento",
    status: "active" as const,
    nextAppointment: "Hoje, 14:00",
    lastUpdate: "Há 2 dias",
  },
  {
    id: "2",
    name: "João Pedro",
    objective: "Hipertrofia",
    status: "active" as const,
    nextAppointment: "Hoje, 16:00",
    lastUpdate: "Há 5 dias",
  },
  {
    id: "3",
    name: "Beatriz Lima",
    objective: "Condicionamento físico",
    status: "active" as const,
    nextAppointment: "Amanhã, 09:00",
    lastUpdate: "Há 1 semana",
  },
  {
    id: "4",
    name: "Lucas Rodrigues",
    objective: "Reabilitação",
    status: "pending" as const,
    nextAppointment: "Sem agendamento",
    lastUpdate: "Há 3 semanas",
  },
];

const statusLabel: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
};

const Clients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.userType !== "trainer") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {mockClients.length} clientes na sua carteira
          </p>
        </div>

        <div className="space-y-3">
          {mockClients.map((client) => (
            <Card
              key={client.id}
              className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-medium transition-smooth"
              onClick={() => navigate(`/dashboard/trainer/clients/${client.id}`)}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {client.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{client.name}</p>
                  <Badge variant={client.status === "active" ? "secondary" : "outline"} className="text-xs shrink-0">
                    {statusLabel[client.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{client.objective}</p>
                <p className="text-xs text-muted-foreground mt-1">Próximo: {client.nextAppointment}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Clients;
