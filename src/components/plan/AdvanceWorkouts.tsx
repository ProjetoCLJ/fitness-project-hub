import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Plan, SlotInfo, Workout, WorkoutExecution } from "@/lib/planStore";
import { buildPlanWeeks } from "@/lib/planSchedule";
import { WorkoutBlock } from "@/components/plan/PlanWeeks";

interface AdvanceWorkoutsProps {
  plans: Plan[];
  executions: WorkoutExecution[];
  todayISO: string;
  slots?: SlotInfo[];
  onPick: (workout: Workout, plan: Plan) => void;
  onCancel: () => void;
}

/** Tela de "Adiantar ou trocar treino": próximos treinos de cada plano, em blocos clicáveis. */
export const AdvanceWorkouts = ({ plans, executions, todayISO, slots, onPick, onCancel }: AdvanceWorkoutsProps) => (
  <div className="space-y-4">
    <Card className="p-4 flex items-center justify-between gap-3 border-primary/40">
      <p className="text-sm">Toque em um treino para fazê-lo agora.</p>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <X className="h-4 w-4 mr-1" />
        Cancelar
      </Button>
    </Card>

    {plans.map((plan) => {
      const upcoming = buildPlanWeeks(plan, executions, todayISO)
        .flat()
        .flatMap((day) => day.slots.map((slot) => ({ ...slot, dateISO: day.dateISO })))
        .filter((s) => s.state !== "done");
      return (
        <div key={plan.id} className="space-y-2">
          <div>
            <h3 className="font-semibold">{plan.title}</h3>
            <p className="text-xs text-muted-foreground">{plan.trainerId ? `por ${plan.trainerName}` : "plano próprio"}</p>
          </div>
          {upcoming.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground border-dashed">Nenhum treino pendente neste plano.</Card>
          ) : (
            upcoming.map((s) => {
              const info = slots?.find((x) => x.workoutId === s.workout.id && x.date === s.dateISO);
              return (
                <WorkoutBlock
                  key={`${s.workout.id}-${s.dateISO}`}
                  workout={s.workout}
                  dateISO={s.dateISO}
                  todayISO={todayISO}
                  state={s.state}
                  accompanied={info ? info.accompanied : s.workout.accompanied}
                  time={info ? info.startTime : s.workout.startTime}
                  onClick={() => onPick(s.workout, plan)}
                />
              );
            })
          )}
        </div>
      );
    })}
  </div>
);
