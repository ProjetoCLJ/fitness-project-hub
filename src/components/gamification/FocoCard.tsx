import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Flame, Zap, ChevronRight } from "lucide-react";
import { LeagueTrophy } from "@/components/gamification/LeagueTrophy";
import { GoalDialog } from "@/components/gamification/GoalDialog";
import { useGmOverview, useLeagueOverview } from "@/hooks/useGamification";
import { leagueName } from "@/lib/gamification";
import { toLocalISO } from "@/lib/agendaStore";

/** Cartão "Seu Foco": dias no Foco, meta atual, XP total e liga. Some em silêncio se o banco ainda não tem a gamificação. */
export const FocoCard = ({ autoOpenGoal = false }: { autoOpenGoal?: boolean }) => {
  const navigate = useNavigate();
  const { data: overview } = useGmOverview();
  const { data: league } = useLeagueOverview();
  const [goalOpen, setGoalOpen] = useState(false);

  // O menu abre sozinho quando precisa de uma escolha (meta conquistada, Foco quebrado ou volta) — uma vez por dia.
  useEffect(() => {
    if (!autoOpenGoal || !overview || overview.foco.goal) return;
    const needs = overview.foco.goal_status === "conquered" || overview.foco.goal_status === "broken" || overview.foco.active;
    if (!needs) return;
    const key = `goal-menu-dismissed-${toLocalISO(new Date())}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sem storage: só abre */
    }
    setGoalOpen(true);
  }, [autoOpenGoal, overview]);

  if (!overview) return null;
  const { foco } = overview;
  const goal = foco.goal;
  const progress = goal ? Math.min(100, Math.round((foco.days / goal.days) * 100)) : 0;

  return (
    <>
      <Card className="p-4 sm:p-6 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Seu Foco</p>
            <div className="flex items-center gap-2">
              <Flame className={`h-7 w-7 ${foco.active ? "text-orange-500" : "text-muted-foreground"}`} />
              <span className="text-3xl font-bold">{foco.days}</span>
              <span className="text-sm text-muted-foreground">{foco.days === 1 ? "dia" : "dias"} no Foco</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">XP total</p>
            <p className="text-xl font-bold flex items-center justify-end gap-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              {overview.xp_total.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {goal ? (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Meta: {goal.days} dias</span>
              <span className="text-primary font-medium">+{goal.xp} XP</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <Button variant="hero" size="sm" className="w-full mb-3" onClick={() => setGoalOpen(true)}>
            Escolher meta do Foco
          </Button>
        )}

        {!foco.active && (
          <p className="text-sm text-muted-foreground mb-3">Conclua um treino do seu plano para começar o Foco.</p>
        )}

        {league && league.joined && (
          <button
            type="button"
            onClick={() => navigate("/dashboard/student/leagues")}
            className="w-full flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-left hover:bg-muted/70 transition-smooth"
          >
            <span className="flex items-center gap-2 text-sm">
              <LeagueTrophy league={league.league} className="h-7 w-7" />
              Liga {leagueName(league.league)}
              {league.in_group && league.my_position ? ` · ${league.my_position}º lugar` : ""}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {league.days_left} {league.days_left === 1 ? "dia" : "dias"}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        )}
      </Card>
      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} overview={overview} />
    </>
  );
};
