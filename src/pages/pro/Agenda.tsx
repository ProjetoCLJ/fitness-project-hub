import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Check, X, Clock3, CalendarClock } from "lucide-react";
import TrainerSchedule from "@/components/dashboard/trainer/TrainerSchedule";
import { Booking, getBookingsForTrainer, respondProposal } from "@/lib/agendaStore";

// Demonstração local: o profissional autenticado (mock) representa
// sempre "trainer-1", o mesmo id usado no perfil público (id "1").
const TRAINER_ID = "trainer-1";

const formatDate = (dateISO: string) =>
  new Date(`${dateISO}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const statusLabel: Record<Booking["status"], string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  rejected: "Recusado",
  suggested: "Novo horário sugerido",
};

const Agenda = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [suggestDate, setSuggestDate] = useState("");
  const [suggestStart, setSuggestStart] = useState("");
  const [suggestEnd, setSuggestEnd] = useState("");

  useEffect(() => {
    setBookings(getBookingsForTrainer(TRAINER_ID));
  }, []);

  if (!user || user.userType !== "trainer") return null;

  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  const handleRespond = (id: string, action: "accept" | "reject") => {
    const updated = respondProposal(id, action);
    setBookings(updated.filter((b) => b.trainerId === TRAINER_ID));
    toast({
      title: action === "accept" ? "Aula confirmada!" : "Proposta recusada",
      description: action === "accept" ? "O horário foi reservado na sua agenda." : "O cliente será avisado.",
    });
  };

  const openSuggest = (id: string, currentDate: string, currentStart: string, currentEnd: string) => {
    setSuggestingId(id);
    setSuggestDate(currentDate);
    setSuggestStart(currentStart);
    setSuggestEnd(currentEnd);
  };

  const confirmSuggestion = () => {
    if (!suggestingId || !suggestDate || !suggestStart || !suggestEnd) return;
    const updated = respondProposal(suggestingId, "suggest", {
      date: suggestDate,
      startTime: suggestStart,
      endTime: suggestEnd,
    });
    setBookings(updated.filter((b) => b.trainerId === TRAINER_ID));
    toast({ title: "Novo horário sugerido", description: "O cliente vai ver a sugestão e poderá aceitar." });
    setSuggestingId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Agenda</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Sua disponibilidade e atendimentos</p>
        </div>

        {pending.length > 0 && (
          <Card className="p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-base sm:text-lg">Solicitações pendentes</h2>
              <Badge variant="secondary">{pending.length}</Badge>
            </div>
            <div className="space-y-3">
              {pending.map((b) => (
                <div key={b.id} className="p-3 rounded-md border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.clientName}</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(b.date)} · {b.startTime}-{b.endTime}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => handleRespond(b.id, "accept")}>
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openSuggest(b.id, b.date, b.startTime, b.endTime)}
                    >
                      <CalendarClock className="h-4 w-4 mr-1" />
                      Sugerir
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRespond(b.id, "reject")}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {confirmed.length > 0 && (
          <Card className="p-4 sm:p-6 mb-4">
            <h2 className="font-semibold text-base sm:text-lg mb-3">Próximos atendimentos confirmados</h2>
            <div className="space-y-2">
              {confirmed.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/30">
                  <span className="font-medium">{b.clientName}</span>
                  <Badge variant="secondary">{formatDate(b.date)} · {b.startTime}-{b.endTime}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Dialog open={!!suggestingId} onOpenChange={(open) => !open && setSuggestingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sugerir outro horário</DialogTitle>
              <DialogDescription>O cliente será notificado e poderá aceitar sua sugestão.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="suggest-date">Data</Label>
                <Input id="suggest-date" type="date" value={suggestDate} onChange={(e) => setSuggestDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="suggest-start">Início</Label>
                  <Input id="suggest-start" type="time" value={suggestStart} onChange={(e) => setSuggestStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suggest-end">Fim</Label>
                  <Input id="suggest-end" type="time" value={suggestEnd} onChange={(e) => setSuggestEnd(e.target.value)} />
                </div>
              </div>
              <Button variant="hero" className="w-full" onClick={confirmSuggestion}>
                Enviar sugestão
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="p-4 mb-4 flex items-start gap-3 bg-muted/30 border-dashed">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Visualização por dia/semana/mês chega na próxima fase. Por enquanto, gerencie seus horários abaixo.
          </p>
        </Card>

        <TrainerSchedule />
      </div>
    </div>
  );
};

export default Agenda;
