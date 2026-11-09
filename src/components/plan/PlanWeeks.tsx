import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plan, SlotInfo, Workout, WEEKDAY_SHORT, WEEK_COLUMNS, WorkoutExecution } from "@/lib/planStore";
import { SlotState, buildPlanWeeks, cycleWeekLabel } from "@/lib/planSchedule";
import type { PlanChanges } from "@/lib/planChanges";

const SLOT_STYLES: Record<SlotState, string> = {
  done: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/60",
  late: "bg-destructive/15 text-destructive border-destructive/60",
  today: "bg-primary/15 text-primary border-primary/60",
  upcoming: "bg-muted text-muted-foreground border-border",
};

const STATE_LABEL: Record<SlotState, string> = { done: "Feito", late: "Atrasado", today: "Hoje", upcoming: "Próximo" };

export type PlansView = "weeks" | "list";

/** Alterna entre a visão em semanas (grade) e em lista de treinos. */
export const ViewToggle = ({ value, onChange }: { value: PlansView; onChange: (v: PlansView) => void }) => (
  <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Formato de visualização">
    <Button
      type="button"
      variant={value === "weeks" ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      aria-label="Por semana"
      aria-pressed={value === "weeks"}
      title="Por semana"
      onClick={() => onChange("weeks")}
    >
      <CalendarDays className="h-4 w-4" />
    </Button>
    <Button
      type="button"
      variant={value === "list" ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      aria-label="Em lista"
      aria-pressed={value === "list"}
      title="Em lista"
      onClick={() => onChange("list")}
    >
      <List className="h-4 w-4" />
    </Button>
  </div>
);

const fmtShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const dateLabel = (iso: string, todayISO: string) => {
  const diff = Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayISO}T00:00:00`).getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return `${WEEKDAY_SHORT[new Date(`${iso}T00:00:00`).getDay()]}, ${fmtShort(iso)}`;
};

interface WorkoutBlockProps {
  workout: Workout;
  dateISO: string;
  todayISO: string;
  state: SlotState;
  accompanied?: boolean;
  time?: string | null;
  onClick?: () => void;
}

/** Bloco de um treino (usado na visão em lista e na tela de adiantar treino). */
export const WorkoutBlock = ({ workout, dateISO, todayISO, state, accompanied, time, onClick }: WorkoutBlockProps) => {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium truncate">{workout.name}</p>
        <p className="text-xs text-muted-foreground">
          {dateLabel(dateISO, todayISO)}
          {time ? ` · ${time}` : ""} · {workout.exercises.length} {workout.exercises.length === 1 ? "exercício" : "exercícios"}
          {accompanied ? " · acompanhado" : ""}
        </p>
      </div>
      <span className={`shrink-0 rounded border px-2 py-0.5 text-[11px] ${SLOT_STYLES[state]}`}>
        {accompanied && <UserCheck className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
        {STATE_LABEL[state]}
      </span>
    </div>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-muted/50 transition-smooth"
    >
      {content}
    </button>
  ) : (
    <div className="w-full rounded-lg border p-3">{content}</div>
  );
};

interface PlanWeeksProps {
  plans: Plan[];
  executions: WorkoutExecution[];
  todayISO: string;
  /** Treinos movidos/cancelados por solicitações aceitas. */
  changes?: PlanChanges;
  /** Visão: grade por semana (padrão) ou lista de treinos. */
  view?: PlansView;
  /** Mostra o título e o profissional do plano no cartão. */
  showTitle?: boolean;
  /** No modo de escolha, treinos não concluídos ficam clicáveis. */
  pickMode?: boolean;
  onPick?: (workout: Workout, plan: Plan) => void;
  /** Treinos planejados da semana (ajustes "só desta vez" do aluno). */
  slots?: SlotInfo[];
  /** Toque em um treino da semana para ajustar acompanhado/horário. */
  onAdjust?: (workout: Workout, plan: Plan, slot: SlotInfo) => void;
}

export const PlanWeeks = ({ plans, ...rest }: PlanWeeksProps) => (
  <div className="space-y-4">
    {plans.map((plan) => (
      <PlanWeeksCard key={plan.id} plan={plan} {...rest} />
    ))}
  </div>
);

const PlanWeeksCard = ({
  plan,
  executions,
  todayISO,
  view = "weeks",
  changes,
  showTitle = true,
  pickMode,
  onPick,
  slots,
  onAdjust,
}: Omit<PlanWeeksProps, "plans"> & { plan: Plan }) => {
  const [offset, setOffset] = useState(0);
  const weeks = buildPlanWeeks(plan, executions, todayISO, offset, changes);

  const meta = (workoutId: string, dateISO: string, workout: Workout, state: SlotState) => {
    const info = slots?.find((s) => s.workoutId === workoutId && s.date === dateISO);
    const accompanied = info ? info.accompanied : workout.accompanied;
    const time = info ? info.startTime : workout.startTime;
    const adjustable = !pickMode && !!info && info.status === "pending" && !!plan.trainerId && !!onAdjust;
    const clickable = (pickMode && state !== "done") || adjustable;
    return { info, accompanied, time, adjustable, clickable };
  };

  return (
    <Card className="p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {showTitle && (
            <>
              <h3 className="font-semibold truncate">{plan.title}</h3>
              <p className="text-xs text-muted-foreground">por {plan.trainerName}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
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

      {view === "weeks" && (
        <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] sm:text-xs text-muted-foreground">
          {WEEK_COLUMNS.map((i) => (
            <span key={i}>{WEEKDAY_SHORT[i]}</span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {weeks.map((week) => (
          <div key={week[0].dateISO}>
            <p className="text-[11px] text-muted-foreground mb-1">
              {cycleWeekLabel(plan, week[0].dateISO) ? `Semana ${cycleWeekLabel(plan, week[0].dateISO)} · ` : ""}
              {fmtShort(week[0].dateISO)} – {fmtShort(week[6].dateISO)}
            </p>
            {view === "weeks" ? (
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
                      const { info, accompanied, time, adjustable, clickable } = meta(slot.workout.id, day.dateISO, slot.workout, slot.state);
                      return (
                        <button
                          key={slot.workout.id}
                          type="button"
                          disabled={!clickable}
                          title={slot.workout.name}
                          onClick={() => (adjustable && info ? onAdjust?.(slot.workout, plan, info) : onPick?.(slot.workout, plan))}
                          className={`w-full rounded border px-1 py-0.5 text-[10px] sm:text-xs leading-tight truncate text-left ${SLOT_STYLES[slot.state]} ${
                            clickable ? "cursor-pointer hover:ring-2 hover:ring-primary" : "cursor-default"
                          }`}
                        >
                          {accompanied && <UserCheck className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
                          {time && <span className="opacity-80">{time} </span>}
                          {slot.workout.name}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {week.every((d) => d.slots.length === 0) && <p className="text-sm text-muted-foreground">Sem treinos nesta semana.</p>}
                {week.flatMap((day) =>
                  day.slots.map((slot) => {
                    const { info, accompanied, time, adjustable, clickable } = meta(slot.workout.id, day.dateISO, slot.workout, slot.state);
                    return (
                      <WorkoutBlock
                        key={`${slot.workout.id}-${day.dateISO}`}
                        workout={slot.workout}
                        dateISO={day.dateISO}
                        todayISO={todayISO}
                        state={slot.state}
                        accompanied={accompanied}
                        time={time}
                        onClick={clickable ? () => (adjustable && info ? onAdjust?.(slot.workout, plan, info) : onPick?.(slot.workout, plan)) : undefined}
                      />
                    );
                  })
                )}
              </div>
            )}
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
