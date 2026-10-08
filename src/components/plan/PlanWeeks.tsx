import { Card } from "@/components/ui/card";
import { Plan, Workout, WEEKDAY_SHORT, WorkoutExecution } from "@/lib/planStore";
import { SlotState, buildPlanWeeks } from "@/lib/planSchedule";

const SLOT_STYLES: Record<SlotState, string> = {
  done: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/60",
  late: "bg-destructive/15 text-destructive border-destructive/60",
  today: "bg-primary/15 text-primary border-primary/60",
  upcoming: "bg-muted text-muted-foreground border-border",
};

interface PlanWeeksProps {
  plans: Plan[];
  executions: WorkoutExecution[];
  todayISO: string;
  /** No modo de escolha, treinos não concluídos ficam clicáveis. */
  pickMode?: boolean;
  onPick?: (workout: Workout, plan: Plan) => void;
}

const fmtShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export const PlanWeeks = ({ plans, executions, todayISO, pickMode = false, onPick }: PlanWeeksProps) => (
  <div className="space-y-4">
    {plans.map((plan) => {
      const weeks = buildPlanWeeks(plan, executions, todayISO);
      return (
        <Card key={plan.id} className="p-3 sm:p-5">
          <div className="mb-3">
            <h3 className="font-semibold">{plan.title}</h3>
            <p className="text-xs text-muted-foreground">por {plan.trainerName}</p>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] sm:text-xs text-muted-foreground">
            {WEEKDAY_SHORT.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="space-y-2">
            {weeks.map((week, weekIndex) => (
              <div key={week[0].dateISO}>
                <p className="text-[11px] text-muted-foreground mb-1">
                  {plan.cycleWeeks ? `Semana ${weekIndex + 1} · ` : ""}
                  {fmtShort(week[0].dateISO)} – {fmtShort(week[6].dateISO)}
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {week.map((day) => (
                    <div
                      key={day.dateISO}
                      className={`min-h-[3.5rem] rounded-md border p-1 flex flex-col gap-1 ${
                        day.dateISO === todayISO ? "border-primary" : "border-border"
                      }`}
                    >
                      <span className="text-[10px] text-muted-foreground">{day.day}</span>
                      {day.slots.map((slot) => {
                        const clickable = pickMode && slot.state !== "done";
                        return (
                          <button
                            key={slot.workout.id}
                            type="button"
                            disabled={!clickable}
                            title={slot.workout.name}
                            onClick={() => onPick?.(slot.workout, plan)}
                            className={`w-full rounded border px-1 py-0.5 text-[10px] sm:text-xs leading-tight truncate text-left ${SLOT_STYLES[slot.state]} ${
                              clickable ? "cursor-pointer hover:ring-2 hover:ring-primary" : "cursor-default"
                            }`}
                          >
                            {slot.workout.name}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-500/60" />Feito</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/60" />Atrasado</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary/60" />Hoje</span>
          </div>
        </Card>
      );
    })}
  </div>
);
