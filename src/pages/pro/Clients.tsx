import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Users } from "lucide-react";
import { getBookingsForTrainer } from "@/lib/agendaStore";
import { getActivePlan } from "@/lib/planStore";

export interface ClientRow {
  id: string;
  name: string;
  objective: string;
  status: "active" | "pending";
  nextAppointment: string;
  lastUpdate: string;
}

const formatDateTime = (dateISO: string, time?: string) => {
  const label = new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return time ? `${label}, ${time}` : label;
};

/** Monta a carteira de clientes a partir das solicitações/agendamentos reais — ainda não existe uma lista formal de vínculo treinador↔aluno. */
export const buildClientRows = (trainerId: string): ClientRow[] => {
  const bookings = getBookingsForTrainer(trainerId);
  const today = new Date().toISOString().slice(0, 10);

  const byClient = new Map<string, typeof bookings>();
  bookings.forEach((b) => {
    if (b.status === "rejected") return;
    byClient.set(b.clientId, [...(byClient.get(b.clientId) ?? []), b]);
  });

  return Array.from(byClient.entries()).map(([clientId, clientBookings]) => {
    const hasConfirmed = clientBookings.some((b) => b.status === "confirmed");
    const sorted = [...clientBookings].sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
    const nextConfirmed = clientBookings
      .filter((b) => b.status === "confirmed" && b.date >= today)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))[0];

    const plan = getActivePlan(clientId);

    return {
      id: clientId,
      name: sorted[0]?.clientName ?? "Aluno",
      objective: plan?.objective || "Sem objetivo definido",
      status: hasConfirmed ? "active" : "pending",
      nextAppointment: nextConfirmed ? formatDateTime(nextConfirmed.date, nextConfirmed.startTime) : "Sem agendamento",
      lastUpdate: sorted[0] ? formatDateTime(sorted[0].date) : "—",
    };
  });
};

const statusLabel: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
};

const Clients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);

  useEffect(() => {
    if (!user) return;
    setClients(buildClientRows(user.id));
  }, [user]);

  if (!user || user.userType !== "trainer") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Clientes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {clients.length} {clients.length === 1 ? "cliente" : "clientes"} na sua carteira
          </p>
        </div>

        {clients.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3" />
            Nenhum cliente ainda. Quando um aluno agendar com você, ele aparece aqui.
          </Card>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
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
        )}
      </div>
    </div>
  );
};

export default Clients;
