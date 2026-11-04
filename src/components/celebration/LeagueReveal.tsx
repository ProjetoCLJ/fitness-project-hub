import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rays, Celebration } from "@/components/celebration/CelebrationDialog";
import { LeagueTrophy } from "@/components/gamification/LeagueTrophy";
import { LeagueResult, leagueName } from "@/lib/gamification";
import { prefersReducedMotion, useCountUp } from "@/hooks/useCountUp";

/** Fases da revelação: 0 apurando, 1 contando, 2 mistério, 3 clarão, 4 resultado. */
const PHASE_ENDS = [1700, 3100, 4300, 4750];

/**
 * Revelação do resultado do mês, com suspense: a tela escurece, o troféu atual treme, a posição e o XP giram
 * como um contador, o novo troféu aparece como silhueta com "?", vem um clarão e então o resultado.
 */
export const LeagueReveal = ({ result, onDone }: { result: LeagueResult; onDone: () => void }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(prefersReducedMotion() ? 4 : 0);

  useEffect(() => {
    if (phase >= 4) return;
    const timers = PHASE_ENDS.map((ms, i) => setTimeout(() => setPhase((p) => Math.max(p, i + 1)), ms));
    return () => timers.forEach(clearTimeout);
  }, [phase >= 4]); // eslint-disable-line react-hooks/exhaustive-deps

  const position = result.position ?? 0;
  const shownPosition = useCountUp(position, { from: position + 9, duration: 1200, enabled: phase === 1 });
  const shownXp = useCountUp(result.xp, { from: 0, duration: 1200, enabled: phase === 1 });

  if (phase === 4) {
    const old = leagueName(result.league);
    const next = leagueName(result.new_league);
    const base = { art: <LeagueTrophy league={result.new_league} className="w-full h-auto" />, rays: "#E5B422", cta: "Continuar", onCta: onDone };
    if (result.outcome === "promoted") {
      return (
        <Celebration
          {...base}
          banner={{ text: "Subiu de liga!", color: "#16A34A" }}
          title={`Bem-vindo à liga ${next}`}
          subtitle={`Você terminou em ${position}º lugar na liga ${old}.`}
          stats={[{ value: `${position}º`, label: "lugar" }, { value: String(result.xp), label: "XP" }]}
        />
      );
    }
    if (result.outcome === "stayed") {
      return (
        <Celebration
          {...base}
          rays={undefined}
          banner={{ text: "Ficou na liga", color: "#64748B" }}
          title={`Você segue na liga ${old}`}
          subtitle={`Você terminou em ${position}º lugar. No próximo mês você chega lá.`}
          stats={[{ value: `${position}º`, label: "lugar" }, { value: String(result.xp), label: "XP" }]}
        />
      );
    }
    return (
      <Celebration
        {...base}
        rays={undefined}
        banner={{ text: "Nova liga", color: "#F59E0B" }}
        title={`Sua nova liga: ${next}`}
        subtitle={
          result.outcome === "inactive"
            ? "Você ficou sem treinos no mês. Retome hoje e volte a subir."
            : "Bora recuperar: cada treino de 25 minutos soma XP para voltar a subir."
        }
        stats={result.outcome === "inactive" ? undefined : [{ value: `${position}º`, label: "lugar" }, { value: String(result.xp), label: "XP" }]}
        cta={result.outcome === "inactive" ? "Ver meu plano" : "Vamos lá"}
        onCta={() => {
          onDone();
          if (result.outcome === "inactive") navigate("/dashboard/student/workouts");
        }}
      />
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Resultado da liga" className="fixed inset-0 z-[100] bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden">
      <button type="button" onClick={() => setPhase(4)} className="absolute top-4 right-4 text-sm text-slate-300 hover:text-white px-3 py-1">
        Pular
      </button>

      {phase === 0 && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-32">
            <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-2xl mj-glow" />
            <LeagueTrophy league={result.league} className="relative w-full h-auto mj-shake" />
          </div>
          <p className="text-slate-200">Apurando seu resultado...</p>
        </div>
      )}

      {phase === 1 && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-slate-300 text-sm">Sua posição no mês</p>
          <p className="text-7xl font-bold tabular-nums">
            {shownPosition}
            <span className="text-3xl">º</span>
          </p>
          <p className="text-xl text-amber-300 tabular-nums">{shownXp} XP</p>
        </div>
      )}

      {phase === 2 && (
        <div className="relative flex items-center justify-center w-72 h-72">
          <Rays color="#FDE68A" opacity={0.28} />
          <div className="relative w-32 mj-glow">
            <LeagueTrophy league={result.new_league} mystery className="w-full h-auto" />
          </div>
        </div>
      )}

      {phase === 3 && <div className="absolute inset-0 bg-white mj-flash" />}
    </div>
  );
};
