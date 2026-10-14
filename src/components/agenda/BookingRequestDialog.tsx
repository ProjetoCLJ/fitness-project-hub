import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { CheckCircle2, Clock } from "lucide-react";
import { HiddenSlots, ScheduleEvent, fetchHiddenSlots, fetchTrainerEvents, getAvailableSlots, getPublicAvailableSlots } from "@/lib/agendaStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface BookingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerName: string;
  trainerId: string;
  onSubmit: (date: string, startTime: string, endTime: string) => void | Promise<void>;
}

export const BookingRequestDialog = ({ open, onOpenChange, trainerName, trainerId, onSubmit }: BookingRequestDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hidden, setHidden] = useState<HiddenSlots>(new Set());
  const [isMyTrainer, setIsMyTrainer] = useState(false);
  const { user } = useAuth();

  const dateISO = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  // Alunos da carteira enxergam todos os horários livres; novos alunos, só os liberados na busca.
  const slots = useMemo(() => {
    if (!dateISO) return [];
    return isMyTrainer ? getAvailableSlots(events, dateISO) : getPublicAvailableSlots(events, hidden, dateISO);
  }, [dateISO, events, hidden, isMyTrainer]);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    Promise.all([
      fetchTrainerEvents(trainerId),
      fetchHiddenSlots(trainerId).catch(() => new Set<string>()),
      user?.userType === "student"
        ? supabase.from("trainer_clients").select("student_id").eq("trainer_id", trainerId).eq("student_id", user.id).eq("status", "active").maybeSingle()
        : Promise.resolve({ data: null }),
    ])
      .then(([loaded, hiddenSlots, link]) => {
        setEvents(loaded);
        setHidden(hiddenSlots);
        setIsMyTrainer(!!link.data);
      })
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, [open, trainerId, user]);

  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !dateISO) return;
    try {
      await onSubmit(dateISO, selectedSlot.start, selectedSlot.end);
      setSent(true);
    } catch {
      // o chamador já mostra o erro
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSent(false);
      setSelectedSlot(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="font-medium">Proposta enviada!</p>
            <p className="text-sm text-muted-foreground">
              {trainerName} vai aceitar, recusar ou sugerir outro horário. Você será avisado.
            </p>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Fechar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Agendar aula com {trainerName}</DialogTitle>
              <DialogDescription>
                Escolha uma data e um horário dentro da disponibilidade do profissional.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleSelectDate}
                locale={ptBR}
                className="rounded-md border mx-auto"
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Horários disponíveis
                </p>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando horários...</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem horários disponíveis nesta data.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <Badge
                        key={slot.start}
                        variant={selectedSlot?.start === slot.start ? "default" : "outline"}
                        className="justify-center py-2 cursor-pointer"
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot.start}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button variant="hero" className="w-full" onClick={handleSubmit} disabled={!selectedSlot}>
                Enviar proposta
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
