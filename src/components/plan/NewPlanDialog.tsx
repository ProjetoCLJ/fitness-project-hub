import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface NewPlanData {
  title: string;
  objective: string;
  deadline: string;
  trainingStrategy: string;
  trainingApproach: string;
  nutritionStrategy: string;
  trainerName: string;
  nutritionistName: string;
}

interface NewPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTrainerName: string;
  defaultNutritionistName: string;
  onCreate: (data: NewPlanData) => void;
}

export const NewPlanDialog = ({ open, onOpenChange, defaultTrainerName, defaultNutritionistName, onCreate }: NewPlanDialogProps) => {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [deadline, setDeadline] = useState("");
  const [trainingStrategy, setTrainingStrategy] = useState("");
  const [trainingApproach, setTrainingApproach] = useState("");
  const [nutritionStrategy, setNutritionStrategy] = useState("");
  const [trainerName, setTrainerName] = useState(defaultTrainerName);
  const [nutritionistName, setNutritionistName] = useState(defaultNutritionistName);

  const canCreate = title.trim() && objective.trim() && deadline;

  const reset = () => {
    setTitle("");
    setObjective("");
    setDeadline("");
    setTrainingStrategy("");
    setTrainingApproach("");
    setNutritionStrategy("");
    setTrainerName(defaultTrainerName);
    setNutritionistName(defaultNutritionistName);
  };

  const handleCreate = () => {
    onCreate({
      title: title.trim(),
      objective: objective.trim(),
      deadline: new Date(deadline).toISOString(),
      trainingStrategy: trainingStrategy.trim(),
      trainingApproach: trainingApproach.trim(),
      nutritionStrategy: nutritionStrategy.trim(),
      trainerName: trainerName.trim() || defaultTrainerName,
      nutritionistName: nutritionistName.trim() || defaultNutritionistName,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo plano</DialogTitle>
          <DialogDescription>
            O plano atual será marcado como concluído e preservado no histórico do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-plan-title">Título do plano</Label>
            <Input id="new-plan-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Plano de Definição — Mar/2025" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-plan-objective">Objetivo</Label>
            <Textarea id="new-plan-objective" value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-plan-deadline">Prazo (meta)</Label>
            <Input id="new-plan-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-plan-trainer">Personal Trainer</Label>
              <Input id="new-plan-trainer" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-plan-nutritionist">Nutricionista</Label>
              <Input id="new-plan-nutritionist" value={nutritionistName} onChange={(e) => setNutritionistName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-plan-strategy">Estratégia de treinamento</Label>
            <Textarea id="new-plan-strategy" value={trainingStrategy} onChange={(e) => setTrainingStrategy(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-plan-approach">Abordagem, progressões e prazos</Label>
            <Textarea id="new-plan-approach" value={trainingApproach} onChange={(e) => setTrainingApproach(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-plan-nutrition">Estratégia nutricional</Label>
            <Textarea id="new-plan-nutrition" value={nutritionStrategy} onChange={(e) => setNutritionStrategy(e.target.value)} rows={2} />
          </div>

          <Button variant="hero" className="w-full" onClick={handleCreate} disabled={!canCreate}>
            Concluir plano atual e criar novo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
