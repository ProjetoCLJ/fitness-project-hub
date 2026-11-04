import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { MedalBadge } from "@/components/gamification/MedalBadge";
import { useAuthUid } from "@/hooks/useAuthUid";
import { useRefreshGamification } from "@/hooks/useGamification";
import { fetchMedals, markMedalsSeen } from "@/lib/gamification";
import { MEDAL_SERIES, MedalInfo, describeEventMedal, isSeriesMedal, sportXpSeries } from "@/lib/medals";
import { SPORTS } from "@/lib/sports";

const Badge = ({ info, earned, isNew }: { info: MedalInfo; earned: boolean; isNew?: boolean }) => (
  <div className="relative flex flex-col items-center text-center gap-0.5 w-24" title={info.description}>
    <MedalBadge
      glyph={info.glyph}
      color={info.color}
      value={info.value}
      ribbon={info.ribbon}
      locked={!earned}
      label={`${info.title}${earned ? "" : " (bloqueada)"}`}
      className="h-20 w-20"
    />
    {isNew && <span className="absolute top-0 right-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">NOVA</span>}
    <span className={`text-[11px] leading-tight ${earned ? "font-medium" : "text-muted-foreground"}`}>{info.title}</span>
    {info.sub && <span className="text-[11px] leading-tight text-muted-foreground">{info.sub}</span>}
  </div>
);

/** Aba Conquistas do perfil: medalhas avulsas (eventos) e conquistas em série, estilo Duolingo. */
export const AchievementsTab = () => {
  const uid = useAuthUid();
  const refresh = useRefreshGamification();
  const { data: medals } = useQuery({ queryKey: ["medals", uid], queryFn: () => fetchMedals(uid as string), enabled: !!uid, retry: false });

  const unseen = medals?.some((m) => !m.seen);
  useEffect(() => {
    if (!unseen) return;
    // Mantém a tag NOVA nesta visita; marca como vistas ao sair da aba.
    return () => {
      markMedalsSeen().then(refresh).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen]);

  if (!medals) return <Card className="p-6 text-sm text-muted-foreground text-center">As conquistas aparecem aqui assim que você concluir seus primeiros treinos.</Card>;

  const earned = new Map(medals.map((m) => [m.medalKey, m]));
  const eventMedals = medals
    .filter((m) => !isSeriesMedal(m.medalKey))
    .map((m) => ({ medal: m, info: describeEventMedal(m) }))
    .filter((x): x is { medal: typeof x.medal; info: MedalInfo } => !!x.info);

  const sportSeries = SPORTS.filter((s) => medals.some((m) => m.medalKey.startsWith(`xp_esporte_${s.code}_`))).map((s) => sportXpSeries(s.code));

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold text-base sm:text-lg mb-3">Medalhas</h2>
        {eventMedals.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Pódios nas ligas, primeiros treinos de cada esporte e outros momentos especiais aparecem aqui.</Card>
        ) : (
          <Card className="p-4 flex flex-wrap gap-4">
            {eventMedals.map(({ medal, info }) => (
              <Badge key={info.key} info={info} earned isNew={!medal.seen} />
            ))}
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-base sm:text-lg">Conquistas</h2>
        {[...MEDAL_SERIES, ...sportSeries].map((series) => {
          const done = series.steps.filter((s) => earned.has(s.key)).length;
          return (
            <Card key={series.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{series.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {done}/{series.steps.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {series.steps.map((step) => (
                  <Badge key={step.key} info={step} earned={earned.has(step.key)} isNew={earned.has(step.key) && !earned.get(step.key)?.seen} />
                ))}
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
};
