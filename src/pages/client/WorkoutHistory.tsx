import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { WEEKDAY_SHORT, WorkoutExecution, fetchExecutions } from "@/lib/planStore";
import { executionDay } from "@/lib/planSchedule";
import { toLocalISO } from "@/lib/agendaStore";

const WorkoutHistory = () => {
  const { user } = useAuth();
  const clientId = user?.id ?? "";
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState<WorkoutExecution | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetchExecutions(clientId).then(setExecutions).catch(() => setExecutions([]));
  }, [clientId]);

  if (!user || user.userType !== "student") return null;

  const byDay = new Map<string, WorkoutExecution[]>();
  executions.forEach((e) => byDay.set(executionDay(e), [...(byDay.get(executionDay(e)) ?? []), e]));

  const cells: (Date | null)[] = [
    ...Array.from({ length: month.getDay() }, () => null),
    ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const shiftMonth = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const todayISO = toLocalISO(new Date());

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Histórico de treinos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{executions.length} treinos registrados</p>
        </div>

        <Card className="p-3 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-semibold capitalize">{monthLabel}</p>
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] sm:text-xs text-muted-foreground">
            {WEEKDAY_SHORT.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              const iso = toLocalISO(date);
              const dayExecs = byDay.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  className={`min-h-[3.5rem] sm:min-h-[4.5rem] rounded-md border p-1 flex flex-col gap-1 ${iso === todayISO ? "border-primary" : "border-border"}`}
                >
                  <span className="text-[10px] text-muted-foreground">{date.getDate()}</span>
                  {dayExecs.map((exec) => (
                    <button
                      key={exec.id}
                      type="button"
                      title={exec.workoutName}
                      onClick={() => setSelected(exec)}
                      className="w-full rounded border border-green-500/60 bg-green-500/20 text-green-700 dark:text-green-400 px-1 py-0.5 text-[10px] sm:text-xs leading-tight truncate text-left hover:ring-2 hover:ring-primary"
                    >
                      {exec.workoutName}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>

        {executions.length === 0 && (
          <p className="text-sm text-center text-muted-foreground mt-4">Nenhum treino registrado ainda.</p>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.workoutName}</DialogTitle>
                <DialogDescription>
                  Check-in em{" "}
                  {new Date(selected.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {selected.exerciseLogs.map((log, logIndex) => (
                  <div key={`${log.exerciseId ?? log.plannedName}-${logIndex}`} className="text-sm">
                    <p className="font-medium flex items-center gap-1 flex-wrap">
                      {log.performedName}
                      {log.performedName !== log.plannedName && (
                        <span className="text-muted-foreground font-normal text-xs">(trocado de {log.plannedName})</span>
                      )}
                      {log.isPR && (
                        <span className="inline-flex items-center gap-0.5 text-primary font-normal text-xs">
                          <Trophy className="h-3 w-3" />
                          PR
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                      {log.sets.map((set) => (
                        <span key={set.setNumber} className="px-2 py-0.5 rounded bg-muted/50">
                          S{set.setNumber}: {set.weight} · {set.reps}
                          {set.effort !== undefined && ` · ${set.effort} RIR`}
                        </span>
                      ))}
                    </div>
                    {log.notes && <p className="italic text-xs text-muted-foreground mt-1">"{log.notes}"</p>}
                  </div>
                ))}
                {selected.observations && (
                  <p className="text-xs italic text-muted-foreground pt-2 border-t">"{selected.observations}"</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutHistory;
