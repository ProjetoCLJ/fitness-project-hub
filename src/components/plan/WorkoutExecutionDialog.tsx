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
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { Workout } from "@/lib/planStore";

interface WorkoutExecutionDialogProps {
  workout: Workout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (result: {
    completedExercises: { name: string; sets: number; reps: string; load: string }[];
    observations?: string;
  }) => void;
}

export const WorkoutExecutionDialog = ({ workout, open, onOpenChange, onComplete }: WorkoutExecutionDialogProps) => {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loads, setLoads] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState("");

  if (!workout) return null;

  const toggleDone = (id: string) => setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  const setLoad = (id: string, value: string) => setLoads((prev) => ({ ...prev, [id]: value }));

  const handleFinish = () => {
    const completedExercises = workout.exercises
      .filter((ex) => done[ex.id])
      .map((ex) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        load: loads[ex.id]?.trim() || ex.load,
      }));

    onComplete({ completedExercises, observations: observations.trim() || undefined });
    setDone({});
    setLoads({});
    setObservations("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workout.name}</DialogTitle>
          <DialogDescription>Marque os exercícios concluídos e ajuste a carga utilizada, se necessário.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {workout.exercises.map((ex) => (
            <div key={ex.id} className="flex items-start gap-3 p-3 rounded-md border">
              <Checkbox
                id={`ex-${ex.id}`}
                checked={!!done[ex.id]}
                onCheckedChange={() => toggleDone(ex.id)}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor={`ex-${ex.id}`} className="font-medium cursor-pointer">
                  {ex.name}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {ex.sets}x{ex.reps} · descanso {ex.rest}
                </p>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`load-${ex.id}`} className="text-xs shrink-0">Carga usada</Label>
                  <Input
                    id={`load-${ex.id}`}
                    defaultValue={ex.load}
                    onChange={(e) => setLoad(ex.id, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="workout-observations" className="text-sm">Observações</Label>
            <Textarea
              id="workout-observations"
              placeholder="Como foi o treino hoje?"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <Button variant="hero" className="w-full" onClick={handleFinish}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluir treino
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
