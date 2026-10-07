import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { PlanInput, WEEKDAY_SHORT } from "@/lib/planStore";
import { toLocalISO } from "@/lib/agendaStore";

interface NewPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: PlanInput) => void | Promise<void>;
}

/** Prévia do ciclo: uma linha por semana, de domingo a sábado. */
export const CyclePreview = ({ weeks }: { weeks: number }) => (
  <div className="space-y-2">
    {Array.from({ length: weeks }, (_, week) => (
      <div key={week} className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-16 shrink-0">Semana {week + 1}</span>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {WEEKDAY_SHORT.map((day) => (
            <div key={day} className="rounded-md border bg-muted/30 py-2 text-center text-xs font-medium">
              {day}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const NewPlanDialog = ({ open, onOpenChange, onCreate }: NewPlanDialogProps) => {
  const today = toLocalISO(new Date());
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [cycleWeeks, setCycleWeeks] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  const canCreate = title.trim().length > 0 && !!startDate && (!endDate || endDate >= startDate);

  const reset = () => {
    setTitle("");
    setObjective("");
    setDescription("");
    setStartDate(today);
    setEndDate("");
    setCycleWeeks(0);
  };

  const handleCreate = async () => {
    setIsBusy(true);
    try {
      await onCreate({
        title: title.trim(),
        objective: objective.trim(),
        description: description.trim(),
        startDate,
        endDate: endDate || null,
        cycleWeeks: cycleWeeks > 0 ? cycleWeeks : null,
      });
      reset();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo plano</DialogTitle>
          <DialogDescription>Defina o plano e, se quiser, o ciclo de semanas em que a rotina de treinos se repete.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-title">Título</Label>
            <Input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Hipertrofia — Out/2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-objective">Objetivo</Label>
            <Textarea id="plan-objective" value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-description">Descrição</Label>
            <Textarea id="plan-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-start">Data de início</Label>
              <Input id="plan-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-end">Data de fim (opcional)</Label>
              <Input id="plan-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-cycle">Ciclo da rotina de treinos</Label>
            <select
              id="plan-cycle"
              value={cycleWeeks}
              onChange={(e) => setCycleWeeks(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={0}>Sem ciclo (treinos em datas específicas)</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "semana" : "semanas"}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              O ciclo indica de quanto em quanto tempo a rotina se repete. Ex.: ciclo de 2 semanas — na terceira semana volta o treino da primeira.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Prévia</Label>
            {cycleWeeks > 0 ? (
              <CyclePreview weeks={cycleWeeks} />
            ) : (
              <div className="flex justify-center rounded-md border">
                <Calendar
                  mode="single"
                  selected={new Date(`${startDate}T00:00:00`)}
                  month={new Date(`${startDate}T00:00:00`)}
                  locale={ptBR}
                  disableNavigation
                />
              </div>
            )}
          </div>

          <Button variant="hero" className="w-full" onClick={handleCreate} disabled={!canCreate || isBusy}>
            Criar plano
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
