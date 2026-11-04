import { ReactNode, useEffect, useMemo, useState } from "react";
import { Celebration } from "@/components/celebration/CelebrationDialog";
import { FocoFlame, XpBolt } from "@/components/gamification/FocoFlame";
import { LeagueTable } from "@/components/gamification/LeagueTable";
import { LeagueTrophy } from "@/components/gamification/LeagueTrophy";
import { MedalBadge } from "@/components/gamification/MedalBadge";
import { useCountUp } from "@/hooks/useCountUp";
import { FocoGoal, GmOverview, LeagueOverview, UserMedal, leagueName } from "@/lib/gamification";
import { findMedalInfo } from "@/lib/medals";
import { markCelebrated } from "@/lib/celebrations";

export interface FlowData {
  workoutName: string;
  minutes: number;
  xpGained: number;
  before: GmOverview | null;
  after: GmOverview;
  leagueBefore: LeagueOverview | null;
  leagueAfter: LeagueOverview | null;
  newMedals: UserMedal[];
  /** Meta de Foco conquistada com este treino. */
  conqueredGoal: FocoGoal | null;
  /** Só o primeiro treino do dia mostra a tela de Foco (os demais não mudam nada nele). */
  firstOfDay: boolean;
  /** Datas (AAAA-MM-DD) dos treinos válidos desta semana. */
  trainedDays: string[];
  todayISO: string;
  weekStartISO: string;
}

type Step = { key: string; render: (p: { progress: { index: number; total: number }; cta: string; next: () => void }) => ReactNode };

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const XpStep = ({ data, progress, cta, next }: { data: FlowData } & Parameters<Step["render"]>[0]) => {
  const xp = useCountUp(data.xpGained, { duration: 1100, delay: 350 });
  const w = data.after.week;
  return (
    <Celebration
      rays="#FACC15"
      art={<XpBolt className="w-full h-auto" />}
      artSize={96}
      title="Treino concluído!"
      subtitle={`${data.workoutName} · ${data.minutes} min`}
      progress={progress}
      cta={cta}
      onCta={next}
    >
      <p className="text-5xl font-bold text-yellow-500 tabular-nums">+{xp} XP</p>
      {w.planned > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Semana: <strong className="text-foreground">{Math.min(w.done, w.planned)} de {w.planned}</strong> {w.planned === 1 ? "treino" : "treinos"}
        </p>
      )}
    </Celebration>
  );
};

const GoalStep = ({ goal, progress, cta, next }: { goal: FocoGoal } & Parameters<Step["render"]>[0]) => (
  <Celebration
    rays="#F97316"
    art={<FocoFlame state="goal" className="w-full h-auto" />}
    artSize={104}
    banner={{ text: "Meta conquistada!", color: "#F97316" }}
    title={`${goal.days} dias de Foco`}
    subtitle="Você ganhou XP e uma medalha."
    stats={[{ value: `+${goal.xp}`, label: "XP" }]}
    progress={progress}
    cta={cta}
    onCta={next}
  />
);

const MedalStep = ({ medal, progress, cta, next }: { medal: UserMedal } & Parameters<Step["render"]>[0]) => {
  const info = findMedalInfo(medal);
  if (!info) return null;
  return (
    <Celebration
      rays={info.color}
      art={<MedalBadge glyph={info.glyph} color={info.color} value={info.value} ribbon={info.ribbon} sport={info.sport} label={info.title} className="w-full h-auto" />}
      artSize={132}
      banner={{ text: "Nova conquista!", color: info.color }}
      title={info.title}
      subtitle={info.sub ? `${info.sub} · ${info.description}` : info.description}
      progress={progress}
      cta={cta}
      onCta={next}
    />
  );
};

const FocoStep = ({ data, progress, cta, next }: { data: FlowData } & Parameters<Step["render"]>[0]) => {
  const { foco } = data.after;
  const days = useCountUp(foco.days, { from: Math.max(0, foco.days - 1), duration: 700, delay: 400 });
  const labels = ["S", "T", "Q", "Q", "S", "S", "D"];
  const goal = foco.goal;
  return (
    <Celebration
      rays="#F97316"
      art={<FocoFlame state="on" className="w-full h-auto" />}
      artSize={96}
      title={`${days} ${days === 1 ? "dia" : "dias"} no Foco`}
      subtitle="O Foco de hoje está garantido."
      progress={progress}
      cta={cta}
      onCta={next}
    >
      <div className="flex justify-center gap-2 mt-2">
        {labels.map((l, i) => {
          const date = addDays(data.weekStartISO, i);
          const trained = data.trainedDays.includes(date) || date === data.todayISO;
          return (
            <div key={i} className="text-center">
              <div className="text-[10px] text-muted-foreground">{l}</div>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs text-white ${trained ? "bg-orange-500" : "bg-muted"} ${date === data.todayISO ? "ring-2 ring-orange-300" : ""}`}>
                {trained ? "✓" : ""}
              </div>
            </div>
          );
        })}
      </div>
      {goal && (
        <div className="mt-4 text-sm">
          <div className="flex justify-between text-muted-foreground mb-1">
            <span>Meta de {goal.days} dias</span>
            <span>faltam {Math.max(0, goal.days - foco.days)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min(100, (foco.days / goal.days) * 100)}%` }} />
          </div>
        </div>
      )}
    </Celebration>
  );
};

const LeagueStep = ({ data, progress, cta, next }: { data: FlowData } & Parameters<Step["render"]>[0]) => (
  <Celebration
    art={<LeagueTrophy league={data.leagueAfter?.league ?? 1} className="w-full h-auto" />}
    artSize={72}
    title={`Liga ${leagueName(data.leagueAfter?.league ?? 1)}`}
    progress={progress}
    cta={cta}
    onCta={next}
  >
    <div className="text-left space-y-3">{data.leagueAfter && <LeagueTable league={data.leagueAfter} before={data.leagueBefore} />}</div>
  </Celebration>
);

/**
 * Sequência de telas depois de concluir um treino (estilo Duolingo): XP, meta conquistada e medalhas novas,
 * dias no Foco (só no 1º treino do dia) e a liga com a sua linha subindo ou descendo na tabela.
 */
export const PostWorkoutFlow = ({ data, onDone }: { data: FlowData; onDone: () => void }) => {
  const [index, setIndex] = useState(0);

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [{ key: "xp", render: (p) => <XpStep data={data} {...p} /> }];
    if (data.conqueredGoal) {
      const goal = data.conqueredGoal;
      list.push({ key: "goal", render: (p) => <GoalStep goal={goal} {...p} /> });
    }
    data.newMedals.forEach((m) => {
      if (findMedalInfo(m)) list.push({ key: `medal-${m.medalKey}`, render: (p) => <MedalStep medal={m} {...p} /> });
    });
    if (data.firstOfDay && data.after.foco.active) list.push({ key: "foco", render: (p) => <FocoStep data={data} {...p} /> });
    if (data.leagueAfter?.in_group) list.push({ key: "league", render: (p) => <LeagueStep data={data} {...p} /> });
    return list;
  }, [data]);

  // O que aparece aqui não precisa ser comemorado de novo na Início.
  useEffect(() => {
    data.newMedals.forEach((m) => markCelebrated(`medal:${m.medalKey}`));
    if (data.conqueredGoal) markCelebrated(`goal:${data.conqueredGoal.id}`);
  }, [data]);

  const step = steps[index];
  const last = index === steps.length - 1;
  return (
    <>
      {step.render({
        progress: { index, total: steps.length },
        cta: last ? "Concluir" : "Continuar",
        next: () => (last ? onDone() : setIndex((i) => i + 1)),
      })}
    </>
  );
};
