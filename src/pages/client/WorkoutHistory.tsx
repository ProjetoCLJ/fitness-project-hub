import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, History, Trophy } from "lucide-react";
import { getPlans } from "@/lib/planStore";

const CURRENT_CLIENT_ID = "1";

const WorkoutHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<ReturnType<typeof getPlans>[number]["executions"]>([]);

  useEffect(() => {
    const all = getPlans(CURRENT_CLIENT_ID).flatMap((p) => p.executions);
    setExecutions([...all].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  if (!user || user.userType !== "student") return null;

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

        {executions.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-3" />
            Nenhum treino registrado ainda.
          </Card>
        ) : (
          <div className="space-y-3">
            {executions.map((exec) => (
              <Card key={exec.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{exec.workoutName}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(exec.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="space-y-2">
                  {exec.exerciseLogs.map((log) => (
                    <div key={log.exerciseId} className="text-xs">
                      <p className="font-medium text-foreground flex items-center gap-1">
                        {log.performedName}
                        {log.performedName !== log.plannedName && (
                          <span className="text-muted-foreground font-normal"> (trocado de {log.plannedName})</span>
                        )}
                        {log.isPR && (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 font-normal">
                            <Trophy className="h-3 w-3" />
                            PR
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-muted-foreground">
                        {log.sets.map((set) => (
                          <span key={set.setNumber} className="px-2 py-0.5 rounded bg-muted/50">
                            S{set.setNumber}: {set.weight} · {set.reps}
                            {set.effort !== undefined && ` · ${set.effort} RIR`}
                          </span>
                        ))}
                      </div>
                      {log.notes && <p className="italic text-muted-foreground mt-1">"{log.notes}"</p>}
                    </div>
                  ))}
                </div>
                {exec.observations && (
                  <p className="text-xs italic text-muted-foreground mt-2 pt-2 border-t">"{exec.observations}"</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutHistory;
