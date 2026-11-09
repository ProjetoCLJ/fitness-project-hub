import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, Shuffle } from "lucide-react";
import { Plan, Workout, WorkoutExecution } from "@/lib/planStore";
import { buildPlanWeeks } from "@/lib/planSchedule";
import { PlanWeeks, PlansView, ViewToggle } from "@/components/plan/PlanWeeks";
import { AdvanceWorkouts } from "@/components/plan/AdvanceWorkouts";

interface PlanWorkoutsViewProps {
  plan: Plan;
  executions: WorkoutExecution[];
  todayISO: string;
  onStart: (workout: Workout) => void;
  /** Professor: inicia o treino junto com o aluno e preenche cargas/repetições por ele. */
  trainerView?: boolean;
}

/** Aba "Treinos" do plano (visão do aluno): treino de hoje, adiantar treino e semanas/lista. */
export const PlanWorkoutsView = ({ plan, executions, todayISO, onStart, trainerView = false }: PlanWorkoutsViewProps) => {
  const [view, setView] = useState<PlansView>("weeks");
  const [advancing, setAdvancing] = useState(false);

  const todaySlots = buildPlanWeeks(plan, executions, todayISO)
    .flat()
    .filter((d) => d.dateISO === todayISO)
    .flatMap((d) => d.slots);
  const pendingToday = todaySlots.filter((s) => s.state !== "done");

  if (advancing) {
    return (
      <AdvanceWorkouts
        plans={[plan]}
        executions={executions}
        todayISO={todayISO}
        onPick={(workout) => onStart(workout)}
        onCancel={() => setAdvancing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5 space-y-3">
        <h3 className="font-semibold">Treino de hoje</h3>
        {todaySlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem treino programado para hoje neste plano.</p>
        ) : (
          todaySlots.map(({ workout, state }) => (
            <div key={workout.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{workout.name}</p>
                <p className="text-xs text-muted-foreground">{workout.exercises.length} exercícios</p>
              </div>
              {state === "done" ? (
                <span className="flex items-center gap-1 text-sm font-medium text-green-600 shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                  Concluído
                </span>
              ) : (
                <Button variant="hero" size="sm" className="shrink-0" onClick={() => onStart(workout)}>
                  <Play className="h-4 w-4 mr-1" />
                  {trainerView ? "Iniciar com o aluno" : "Iniciar"}
                </Button>
              )}
            </div>
          ))
        )}
        {pendingToday.length === 0 && (
          <Button variant="outline" className="w-full" onClick={() => setAdvancing(true)}>
            <Shuffle className="h-4 w-4 mr-2" />
            {trainerView ? "Iniciar outro treino" : "Adiantar treino"}
          </Button>
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-base sm:text-lg">Treinos do plano</h3>
        <ViewToggle value={view} onChange={setView} />
      </div>
      <PlanWeeks plans={[plan]} executions={executions} todayISO={todayISO} view={view} showTitle={false} />
    </div>
  );
};
