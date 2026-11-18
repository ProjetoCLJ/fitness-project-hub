import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Mail, UserPlus, Users } from "lucide-react";
import { fetchLinkedStudents, fetchTrainerEvents, upcomingOccurrences } from "@/lib/agendaStore";
import { SentInvite, fetchPendingInvitesSent, inviteStudent } from "@/lib/requestsStore";
import { supabase } from "@/integrations/supabase/client";

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  objective: string;
  status: "active";
  nextAppointment: string;
}

/** Carteira de clientes: alunos vinculados ao profissional (convite aceito ou agendamento confirmado). */
export const fetchClientRows = async (trainerId: string): Promise<ClientRow[]> => {
  const [students, events, plansRes] = await Promise.all([
    fetchLinkedStudents(trainerId),
    fetchTrainerEvents(trainerId),
    supabase.from("plans").select("student_id, objective, title").eq("trainer_id", trainerId).eq("status", "active").order("created_at", { ascending: false }),
  ]);
  const upcoming = upcomingOccurrences(events, 90);
  const activePlanByStudent = new Map<string, { objective: string | null; title: string }>();
  (plansRes.data ?? []).forEach((p) => {
    if (!activePlanByStudent.has(p.student_id)) activePlanByStudent.set(p.student_id, { objective: p.objective, title: p.title });
  });

  return students.map((student) => {
    const next = upcoming.find((o) => o.event.studentIds.includes(student.studentId));
    const nextLabel = next
      ? `${new Date(`${next.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${next.event.startTime}`
      : "Sem agendamento";

    return {
      id: student.studentId,
      name: student.name,
      email: student.email,
      objective: activePlanByStudent.get(student.studentId)?.objective || activePlanByStudent.get(student.studentId)?.title || "Sem plano ativo",
      status: "active" as const,
      nextAppointment: nextLabel,
    };
  });
};

const Clients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [invites, setInvites] = useState<SentInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [rows, sent] = await Promise.all([fetchClientRows(user.id), fetchPendingInvitesSent(user.id)]);
      setClients(rows);
      setInvites(sent);
    } catch {
      toast({ title: "Não foi possível carregar seus clientes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || user.userType !== "trainer") return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const { registered } = await inviteStudent(inviteEmail);
      toast({
        title: "Convite enviado",
        description: registered
          ? "O aluno já tem conta e vai ver o convite na aba Solicitações."
          : "O aluno ainda não tem conta. Quando se cadastrar com esse e-mail, já entra como seu aluno.",
      });
      setInviteEmail("");
      setInviteOpen(false);
      await load();
    } catch (error) {
      toast({
        title: "Não foi possível convidar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Clientes</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {clients.length} {clients.length === 1 ? "cliente" : "clientes"} na sua carteira
            </p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar aluno
          </Button>
        </div>

        {!isLoading && clients.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3" />
            Nenhum cliente ainda. Convide um aluno pelo e-mail ou aguarde um pedido de aula.
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
                    <Badge variant="secondary" className="text-xs shrink-0">Ativo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{client.objective}</p>
                  <p className="text-xs text-muted-foreground mt-1">Próximo: {client.nextAppointment}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </Card>
            ))}
          </div>
        )}

        {invites.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold text-base sm:text-lg mb-3">Convites pendentes</h2>
            <div className="space-y-2">
              {invites.map((invite) => (
                <Card key={invite.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{invite.email}</span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {invite.registered ? "Aguardando aceite" : "Aguardando cadastro"}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar aluno</DialogTitle>
            <DialogDescription>
              Digite o e-mail do aluno. Se ele já tiver conta, recebe o convite na aba Solicitações; se não tiver, já entra como seu aluno ao se cadastrar com esse e-mail.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail do aluno</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="aluno@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={isInviting}>
              {isInviting ? "Enviando..." : "Enviar convite"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
