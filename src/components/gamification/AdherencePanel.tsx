import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, ChevronRight } from "lucide-react";
import { fetchTrainerAdherence } from "@/lib/gamification";

/** Adesão da semana dos alunos do profissional: Foco, treinos feitos/planejados e quem está em risco. */
export const AdherencePanel = () => {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["trainer-adherence"], queryFn: fetchTrainerAdherence, retry: false });
  const rows = (data ?? []).filter((r) => r.has_plan);
  if (!data || rows.length === 0) return null;

  const risk = (r: (typeof rows)[number]) => r.week_late > 0 || (r.tracking && r.foco_days === 0 && r.week_planned > 0);
  const sorted = [...rows].sort((a, b) => Number(risk(b)) - Number(risk(a)) || a.name.localeCompare(b.name));
  const atRisk = rows.filter(risk).length;

  return (
    <Card className="p-4 sm:p-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-base sm:text-lg">Adesão dos alunos</h2>
        {atRisk > 0 && <Badge variant="destructive">{atRisk} em risco</Badge>}
      </div>
      <div className="space-y-3">
        {sorted.map((r) => {
          const pct = r.week_planned > 0 ? Math.round((r.week_done / r.week_planned) * 100) : 0;
          return (
            <button
              key={r.student_id}
              type="button"
              onClick={() => navigate(`/dashboard/trainer/clients/${r.student_id}`)}
              className="w-full text-left space-y-1.5 hover:bg-muted/40 rounded-md p-2 -mx-2 transition-smooth"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{r.name}</span>
                <span className="flex items-center gap-2 shrink-0 text-sm">
                  <span className="flex items-center gap-1">
                    <Flame className={`h-4 w-4 ${r.foco_days > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                    {r.foco_days}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground w-24 text-right">
                  {r.week_done}/{r.week_planned} na semana{r.week_late > 0 ? ` · ${r.week_late} atrasado${r.week_late > 1 ? "s" : ""}` : ""}
                </span>
              </div>
              {!r.tracking && <p className="text-xs text-muted-foreground">Ainda não começou a usar o Foco.</p>}
            </button>
          );
        })}
      </div>
    </Card>
  );
};
