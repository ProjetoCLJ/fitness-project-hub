import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { LeagueTable, Row } from "@/components/gamification/LeagueTable";
import { LeagueTrophy } from "@/components/gamification/LeagueTrophy";
import { SportIcon } from "@/components/gamification/SportIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useLeagueOverview } from "@/hooks/useGamification";
import { LEAGUE_NAMES, fetchSportRanking, leagueName } from "@/lib/gamification";
import { SPORTS } from "@/lib/sports";

/** Faixa com as 10 ligas: rola para os lados e abre centralizada na liga atual. */
const LeagueTrail = ({ current }: { current: number }) => {
  const scroller = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scroller.current;
    const el = currentRef.current;
    if (!box || !el) return;
    box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
  }, [current]);

  return (
    <div ref={scroller} className="relative flex items-end gap-2 overflow-x-auto pb-2 snap-x" style={{ scrollbarWidth: "none" }}>
      <div className="shrink-0 w-[calc(50%-48px)]" aria-hidden="true" />
      {LEAGUE_NAMES.map((name, i) => {
        const league = i + 1;
        const isCurrent = league === current;
        const locked = league > current;
        return (
          <div
            key={name}
            ref={isCurrent ? currentRef : undefined}
            className={`flex flex-col items-center shrink-0 snap-center text-center ${isCurrent ? "w-24" : "w-[5.25rem]"}`}
          >
            <LeagueTrophy league={league} locked={locked} className="w-full h-auto" />
            <span className={`mt-1 text-xs leading-tight ${isCurrent ? "font-semibold text-foreground" : locked ? "text-muted-foreground" : "text-foreground"}`}>
              {name}
            </span>
            {isCurrent && <span className="text-[10px] text-muted-foreground">Liga atual</span>}
          </div>
        );
      })}
      <div className="shrink-0 w-[calc(50%-48px)]" aria-hidden="true" />
    </div>
  );
};

const SportRankingTab = () => {
  const [sport, setSport] = useState("musculacao");
  const [period, setPeriod] = useState<"month" | "all">("month");
  const { data } = useQuery({ queryKey: ["sport-ranking", sport, period], queryFn: () => fetchSportRanking(sport, period), retry: false });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={sport} onValueChange={setSport}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPORTS.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                <span className="flex items-center gap-2">
                  <SportIcon sport={s.code} className="h-4 w-4" />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as "month" | "all")}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="all">Geral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-2">
        {!data || data.items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Ninguém no ranking deste esporte ainda.</p>
        ) : (
          data.items.map((item) => <Row key={`${item.position}-${item.name}-${item.is_me}`} member={{ ...item, zone: "stay" }} />)
        )}
      </Card>
      {data?.me && !data.public && (
        <p className="text-xs text-muted-foreground text-center">
          Você está em {data.me.position}º lugar neste ranking, mas só você vê isso. Para os outros te verem, ative "Aparecer nos rankings por esporte" em Perfil › Ajustes (ícone de engrenagem).
        </p>
      )}
    </div>
  );
};

const Leagues = () => {
  const { user } = useAuth();
  const { data: league, isError } = useLeagueOverview();
  const navigate = useNavigate();


  if (!user) return null;


  const lastResult = league?.last_result;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />
      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Liga {league ? leagueName(league.league) : ""}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Treine, some XP e suba de liga</p>
          </div>
          {league && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium shrink-0">
              <Clock className="h-4 w-4" />
              {league.days_left} {league.days_left === 1 ? "dia" : "dias"}
            </span>
          )}
        </div>

        <LeagueTrail current={league?.league ?? 1} />

        <Tabs defaultValue="liga">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="liga">Minha liga</TabsTrigger>
            <TabsTrigger value="esporte">Por esporte</TabsTrigger>
          </TabsList>

          <TabsContent value="liga" className="space-y-3">
            {isError && <Card className="p-6 text-center text-sm text-muted-foreground">As ligas ainda estão sendo preparadas.</Card>}

            {league && (!league.joined || !league.in_group) && (
              <Card className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
                <LeagueTrophy league={league.league} locked className="w-20 h-auto" />
                <p className="font-medium text-foreground">
                  {league.joined ? `Sua disputa na liga ${leagueName(league.league)} começa no próximo treino` : "Sua liga começa no primeiro treino"}
                </p>
                <p>Conclua um treino de 25 minutos ou mais para entrar na disputa do mês.</p>
                <Button variant="hero" onClick={() => navigate("/dashboard/student/workouts")}>
                  Ver meus treinos
                </Button>
              </Card>
            )}

            {league?.in_group && <LeagueTable league={league} />}

            {lastResult && (
              <Card className="p-4 text-sm">
                <p className="font-medium mb-1">Mês passado</p>
                <p className="text-muted-foreground">
                  {lastResult.outcome === "inactive"
                    ? `Sem treinos no mês: você foi para a liga ${leagueName(lastResult.new_league)}.`
                    : `${lastResult.position}º lugar com ${lastResult.xp} XP — ${
                        lastResult.outcome === "promoted" ? "subiu" : lastResult.outcome === "relegated" ? "foi para" : "ficou na"
                      } liga ${leagueName(lastResult.new_league)}.`}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="esporte">
            <SportRankingTab />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
};

export default Leagues;
