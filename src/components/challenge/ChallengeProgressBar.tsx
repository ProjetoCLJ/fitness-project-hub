import { Progress } from "@/components/ui/progress";
import { Challenge, challengeProgress } from "@/lib/challengeStore";

export const ChallengeProgressBar = ({ challenge }: { challenge: Challenge }) => {
  const p = challengeProgress(challenge);
  if (!p.started) {
    return (
      <div className="mb-4 text-sm text-muted-foreground">
        O desafio começa em {p.daysToStart} {p.daysToStart === 1 ? "dia" : "dias"}.
      </div>
    );
  }
  return (
    <div className="mb-4">
      {p.total !== null ? <Progress value={p.pct} className="h-2 mb-1.5" /> : null}
      <p className="text-sm text-muted-foreground">
        {p.total !== null
          ? `${p.elapsed} ${p.elapsed === 1 ? "dia passou" : "dias já passaram"} · ${p.remaining} ${p.remaining === 1 ? "dia restante" : "dias restantes"}`
          : `${p.elapsed} ${p.elapsed === 1 ? "dia" : "dias"} de desafio`}
      </p>
    </div>
  );
};
