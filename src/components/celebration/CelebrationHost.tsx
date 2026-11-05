import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Celebration } from "@/components/celebration/CelebrationDialog";
import { LeagueReveal } from "@/components/celebration/LeagueReveal";
import { GoalDialog } from "@/components/gamification/GoalDialog";
import { FocoFlame } from "@/components/gamification/FocoFlame";
import { MedalBadge } from "@/components/gamification/MedalBadge";
import { useGmOverview, useLeagueOverview } from "@/hooks/useGamification";
import { useAuthUid } from "@/hooks/useAuthUid";
import { fetchLastConqueredGoal, fetchMedals } from "@/lib/gamification";
import { findMedalInfo } from "@/lib/medals";
import { isCelebrated, markCelebrated } from "@/lib/celebrations";
import { toLocalISO } from "@/lib/agendaStore";

const RECENT_DAYS = 7;

/**
 * Fila de comemorações ao abrir a Início: primeiro o resultado do mês (revelação), depois a meta de Foco
 * conquistada e, por fim, cada medalha nova — uma tela por vez, cada uma só uma vez.
 */
export const CelebrationHost = () => {
  const navigate = useNavigate();
  const uid = useAuthUid();
  const { data: gm } = useGmOverview();
  const { data: league } = useLeagueOverview();
  const [, force] = useState(0);
  const [goalOpen, setGoalOpen] = useState(false);

  const { data: medals } = useQuery({ queryKey: ["medals", uid], queryFn: () => fetchMedals(uid as string), enabled: !!uid, retry: false });
  const { data: goal } = useQuery({ queryKey: ["last-goal", uid], queryFn: () => fetchLastConqueredGoal(uid as string), enabled: !!uid, retry: false });

  const done = (key: string) => {
    markCelebrated(key);
    force((n) => n + 1);
  };

  const recentSince = (() => {
    const d = new Date();
    d.setDate(d.getDate() - RECENT_DAYS);
    return toLocalISO(d);
  })();

  // 1. Resultado do mês
  const result = league?.last_result;
  if (result && !isCelebrated(`league:${result.month}`)) {
    return <LeagueReveal result={result} onDone={() => done(`league:${result.month}`)} />;
  }

  // 2. Meta de Foco conquistada
  if (goal && goal.endedOn >= recentSince && !isCelebrated(`goal:${goal.id}`)) {
    return (
      <>
        <Celebration
          rays="#F97316"
          art={<FocoFlame state="goal" className="w-full h-auto" />}
          artSize={104}
          banner={{ text: "Meta conquistada!", color: "#F97316" }}
          title={`${goal.days} dias de Foco`}
          subtitle="Você ganhou XP e uma medalha. Escolha a próxima meta."
          stats={[{ value: `+${goal.xp}`, label: "XP" }]}
          cta="Escolher próxima meta"
          onCta={() => {
            done(`goal:${goal.id}`);
            if (gm?.foco && !gm.foco.goal) setGoalOpen(true);
          }}
          secondary={{ label: "Agora não", onClick: () => done(`goal:${goal.id}`) }}
        />
      </>
    );
  }

  // 3. Medalhas novas, uma por vez
  const pending = (medals ?? [])
    .filter((m) => m.achievedOn >= recentSince && !isCelebrated(`medal:${m.medalKey}`))
    .map((m) => ({ medal: m, info: findMedalInfo(m) }))
    .filter((x): x is { medal: (typeof x)["medal"]; info: NonNullable<(typeof x)["info"]> } => !!x.info);
  if (pending.length > 0) {
    const { medal, info } = pending[0];
    return (
      <Celebration
        rays={info.color}
        art={<MedalBadge glyph={info.glyph} color={info.color} value={info.value} ribbon={info.ribbon} sport={info.sport} centerFace label={info.title} className="w-full h-auto" />}
        artSize={132}
        banner={{ text: "Nova conquista!", color: info.color }}
        title={info.title}
        subtitle={info.sub ? `${info.sub} · ${info.description}` : info.description}
        cta="Continuar"
        onCta={() => done(`medal:${medal.medalKey}`)}
        secondary={{
          label: "Ver conquistas",
          onClick: () => {
            done(`medal:${medal.medalKey}`);
            navigate("/dashboard/student/profile?tab=conquistas");
          },
        }}
      />
    );
  }

  return gm ? <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} overview={gm} /> : null;
};
