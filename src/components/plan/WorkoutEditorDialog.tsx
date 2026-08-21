import { useEffect, useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { Exercise, Workout } from "@/lib/planStore";

interface WorkoutEditorDialogProps {
  workout: Workout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (workout: Workout) => void;
}

const emptyExercise = (): Exercise => ({
  id: crypto.randomUUID(),
  name: "",
  sets: 3,
  reps: "10",
  load: "",
  rest: "60s",
});

const emptyWorkout = (): Workout => ({
  id: crypto.randomUUID(),
  day: "Segunda",
  name: "",
  exercises: [emptyExercise()],
  observations: "",
});

export const WorkoutEditorDialog = ({ workout, open, onOpenChange, onSave }: WorkoutEditorDialogProps) => {
  const [draft, setDraft] = useState<Workout>(emptyWorkout());

  useEffect(() => {
    if (open) {
      setDraft(workout ? { ...workout, exercises: workout.exercises.map((e) => ({ ...e })) } : emptyWorkout());
    }
  }, [open, workout]);

  const updateExercise = (id: string, field: keyof Exercise, value: string | number) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)),
    }));
  };

  const addExercise = () => {
    setDraft((prev) => ({ ...prev, exercises: [...prev.exercises, emptyExercise()] }));
  };

  const removeExercise = (id: string) => {
    setDraft((prev) => ({ ...prev, exercises: prev.exercises.filter((ex) => ex.id !== id) }));
  };

  const canSave = draft.name.trim().length > 0 && draft.exercises.every((ex) => ex.name.trim().length > 0);

  const handleSave = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workout ? "Editar treino" : "Novo treino"}</DialogTitle>
          <DialogDescription>Defina os exercícios, séries, repetições, carga e descanso.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="workout-name">Nome do treino</Label>
              <Input
                id="workout-name"
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Treino A - Inferiores"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workout-day">Dia da semana</Label>
              <Input
                id="workout-day"
                value={draft.day}
                onChange={(e) => setDraft((prev) => ({ ...prev, day: e.target.value }))}
                placeholder="Ex: Segunda"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Exercícios</Label>
            {draft.exercises.map((ex) => (
              <div key={ex.id} className="p-3 border rounded-md space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={ex.name}
                    onChange={(e) => updateExercise(ex.id, "name", e.target.value)}
                    placeholder="Nome do exercício"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(ex.id)}
                    disabled={draft.exercises.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Séries</Label>
                    <Input
                      type="number"
                      min={1}
                      value={ex.sets}
                      onChange={(e) => updateExercise(ex.id, "sets", Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reps</Label>
                    <Input
                      value={ex.reps}
                      onChange={(e) => updateExercise(ex.id, "reps", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Carga</Label>
                    <Input
                      value={ex.load}
                      onChange={(e) => updateExercise(ex.id, "load", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Descanso</Label>
                    <Input
                      value={ex.rest}
                      onChange={(e) => updateExercise(ex.id, "rest", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={addExercise}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar exercício
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-observations">Observações</Label>
            <Textarea
              id="workout-observations"
              value={draft.observations}
              onChange={(e) => setDraft((prev) => ({ ...prev, observations: e.target.value }))}
              rows={3}
              placeholder="Progressões, cuidados, adaptações..."
            />
          </div>

          <Button variant="hero" className="w-full" onClick={handleSave} disabled={!canSave}>
            Salvar treino
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
