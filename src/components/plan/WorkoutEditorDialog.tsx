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
import { Plus, Trash2, Link2, Link2Off } from "lucide-react";
import { Exercise, Workout } from "@/lib/planStore";
import { exerciseLibrary } from "@/data/exerciseLibrary";

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

  const toggleSuperset = (index: number) => {
    if (index === 0) return;
    setDraft((prev) => {
      const exercises = [...prev.exercises];
      const current = exercises[index];
      const previous = exercises[index - 1];
      const isLinked = !!current.supersetGroup && current.supersetGroup === previous.supersetGroup;
      if (isLinked) {
        exercises[index] = { ...current, supersetGroup: undefined };
      } else {
        const groupId = previous.supersetGroup ?? crypto.randomUUID();
        exercises[index - 1] = { ...previous, supersetGroup: groupId };
        exercises[index] = { ...current, supersetGroup: groupId };
      }
      return { ...prev, exercises };
    });
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
            <p className="text-xs text-muted-foreground -mt-2">
              Use o ícone de corrente para unir um exercício ao anterior como superset (executados em sequência, sem descanso entre eles).
            </p>
            {draft.exercises.map((ex, index) => {
              const previous = index > 0 ? draft.exercises[index - 1] : null;
              const isLinked = !!ex.supersetGroup && !!previous && ex.supersetGroup === previous.supersetGroup;
              return (
                <div key={ex.id}>
                  {isLinked && (
                    <div className="text-xs font-medium text-primary mb-1 ml-1">↳ Superset</div>
                  )}
                  <div className={`p-3 border rounded-md space-y-2 ${isLinked ? "border-primary/40 bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-2">
                      <Input
                        value={ex.name}
                        onChange={(e) => updateExercise(ex.id, "name", e.target.value)}
                        placeholder="Nome do exercício"
                        className="flex-1"
                        list="exercise-library-options"
                      />
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSuperset(index)}
                          title={isLinked ? "Desfazer superset" : "Unir como superset"}
                        >
                          {isLinked ? <Link2Off className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
                        </Button>
                      )}
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
                </div>
              );
            })}
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

        <datalist id="exercise-library-options">
          {exerciseLibrary.map((ex) => (
            <option key={ex.id} value={ex.name} />
          ))}
        </datalist>
      </DialogContent>
    </Dialog>
  );
};
