import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plan, Workout, WEEKDAY_SHORT, WorkoutExecution } from "@/lib/planStore";
import { SlotState, buildPlanWeeks, cycleWeekLabel } from "@/lib/planSchedule";

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
    {plans.map((plan) => (
      <PlanWeeksCard key={plan.id} plan={plan} executions={executions} todayISO={todayISO} pickMode={pickMode} onPick={onPick} />
    ))}
  </div>
);

const PlanWeeksCard = ({ plan, executions, todayISO, pickMode, onPick }: Omit<PlanWeeksProps, "plans"> & { plan: Plan }) => {
      const [offset, setOffset] = useState(0);
      const weeks = buildPlanWeeks(plan, executions, todayISO, offset);
      return (
        <Card className="p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{plan.title}</h3>
              <p className="text-xs text-muted-foreground">por {plan.trainerName}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOffset((o) => o - 1)} aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {offset !== 0 && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setOffset(0)}>
                  Hoje
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOffset((o) => o + 1)} aria-label="Próxima semana">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] sm:text-xs text-muted-foreground">
            {WEEKDAY_SHORT.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="space-y-2">
            {weeks.map((week) => (
              <div key={week[0].dateISO}>
                <p className="text-[11px] text-muted-foreground mb-1">
                  {cycleWeekLabel(plan, week[0].dateISO) ? `Semana ${cycleWeekLabel(plan, week[0].dateISO)} · ` : ""}
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
};
