import { useMemo, useState } from "react";
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
import { getAvailableSlots } from "@/lib/agendaStore";

interface BookingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainerName: string;
  onSubmit: (date: string, startTime: string, endTime: string) => void;
}

export const BookingRequestDialog = ({ open, onOpenChange, trainerName, onSubmit }: BookingRequestDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [sent, setSent] = useState(false);

  const dateISO = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const slots = useMemo(() => (dateISO ? getAvailableSlots(dateISO) : []), [dateISO]);

  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSubmit = () => {
    if (!selectedSlot || !dateISO) return;
    onSubmit(dateISO, selectedSlot.start, selectedSlot.end);
    setSent(true);
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
                {slots.length === 0 ? (
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
