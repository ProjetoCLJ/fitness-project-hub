import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Clock, Lock, Medal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthUid } from "@/hooks/useAuthUid";
import { useToast } from "@/hooks/use-toast";
import { useLeagueOverview } from "@/hooks/useGamification";
import { LeagueMember, LEAGUE_NAMES, fetchRankingPublic, fetchSportRanking, leagueName, setRankingPublic } from "@/lib/gamification";
import { SPORTS } from "@/lib/sports";

const LEAGUE_COLORS = [
  "from-stone-500 to-stone-400",
  "from-amber-700 to-amber-500",
  "from-orange-600 to-orange-400",
  "from-slate-500 to-slate-300",
  "from-yellow-500 to-amber-300",
  "from-emerald-600 to-emerald-400",
  "from-sky-600 to-sky-400",
  "from-violet-600 to-violet-400",
  "from-rose-600 to-rose-400",
  "from-fuchsia-600 to-amber-400",
];

const LeagueTrail = ({ current }: { current: number }) => (
  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
    {LEAGUE_NAMES.map((name, i) => {
      const league = i + 1;
      const reached = league <= current;
      const isCurrent = league === current;
      return (
        <div key={name} className={`flex flex-col items-center shrink-0 w-16 ${isCurrent ? "" : "opacity-70"}`}>
          <div
            className={`rounded-full flex items-center justify-center text-white ${
              isCurrent ? "h-16 w-16 ring-4 ring-primary/30" : "h-12 w-12"
            } ${reached ? `bg-gradient-to-br ${LEAGUE_COLORS[i]}` : "bg-muted text-muted-foreground"}`}
          >
            {reached ? <Medal className={isCurrent ? "h-8 w-8" : "h-6 w-6"} /> : <Lock className="h-5 w-5" />}
          </div>
          <span className={`mt-1 text-[11px] text-center leading-tight ${isCurrent ? "font-semibold" : "text-muted-foreground"}`}>{name}</span>
        </div>
      );
    })}
  </div>
);

const ZoneDivider = ({ kind }: { kind: "up" | "down" }) => (
  <div className={`flex items-center justify-center gap-2 py-2 text-xs font-bold tracking-wide ${kind === "up" ? "text-green-600" : "text-destructive"}`}>
    {kind === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
    {kind === "up" ? "ZONA DE PROMOÇÃO" : "ZONA DE REBAIXAMENTO"}
    {kind === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
  </div>
);

const Row = ({ member }: { member: LeagueMember }) => (
  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${member.is_me ? "bg-primary/10" : ""}`}>
    <span className={`w-6 text-center font-bold text-sm ${member.zone === "up" ? "text-green-600" : member.zone === "down" ? "text-destructive" : "text-muted-foreground"}`}>
      {member.position}
    </span>
    <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold">
      {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : member.name.slice(0, 1).toUpperCase()}
    </div>
    <span className={`flex-1 min-w-0 truncate ${member.is_me ? "font-semibold" : ""}`}>{member.is_me ? `${member.name} (você)` : member.name}</span>
    <span className="text-sm text-muted-foreground">{member.xp} XP</span>
  </div>
);

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
                {s.label}
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
          Você está em {data.me.position}º lugar neste ranking, mas só você vê isso. Ative "Aparecer nos rankings por esporte" para os outros te verem.
        </p>
      )}
    </div>
  );
};

const Leagues = () => {
  const { user } = useAuth();
  const uid = useAuthUid();
  const { toast } = useToast();
  const { data: league, isError } = useLeagueOverview();
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (uid) fetchRankingPublic(uid).then(setIsPublic).catch(() => undefined);
  }, [uid]);

  if (!user) return null;

  const togglePublic = async (value: boolean) => {
    setIsPublic(value);
    try {
      await setRankingPublic(value);
    } catch {
      setIsPublic(!value);
      toast({ title: "Não foi possível salvar a preferência", variant: "destructive" });
    }
  };

  const members = league?.members ?? [];
  const upSlots = league?.up_slots ?? 0;
  const downSlots = league?.down_slots ?? 0;
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

            {league && !league.joined && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Conclua seu primeiro treino de 25 minutos ou mais para entrar na liga e disputar com seu grupo.
              </Card>
            )}

            {league?.joined && !league.in_group && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Você ainda não tem grupo neste mês. Faça um treino para entrar na disputa da liga {leagueName(league.league)}.
              </Card>
            )}

            {league?.in_group && (
              <>
                <Card className="p-3 text-sm flex items-center justify-between gap-3">
                  <span>
                    Você está em <strong>{league.my_position}º</strong> com <strong>{league.my_xp} XP</strong>
                  </span>
                  <span className="text-muted-foreground text-xs text-right">
                    {league.xp_to_promotion
                      ? `Faltam ${league.xp_to_promotion} XP para a zona de promoção`
                      : league.xp_to_safety
                        ? `Faltam ${league.xp_to_safety} XP para sair do rebaixamento`
                        : league.is_open
                          ? "Grupo aberto: sem rebaixamento"
                          : ""}
                  </span>
                </Card>

                <Card className="p-2">
                  {members.map((m, i) => (
                    <div key={`${m.position}-${m.name}`}>
                      {m.position === upSlots + 1 && upSlots > 0 && i > 0 && <ZoneDivider kind="up" />}
                      {downSlots > 0 && m.position === members.length - downSlots + 1 && <ZoneDivider kind="down" />}
                      <Row member={m} />
                    </div>
                  ))}
                </Card>
                <p className="text-xs text-muted-foreground text-center">
                  Ranking por XP do mês (treinos e bônus semanal). O grupo é remontado a cada mês.
                </p>
              </>
            )}

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

        <Card className="p-4 flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="ranking-public" className="font-medium">
              Aparecer nos rankings por esporte
            </Label>
            <p className="text-xs text-muted-foreground">Seu nome (primeiro nome e inicial) fica visível para todos. Desligado por padrão.</p>
          </div>
          <Switch id="ranking-public" checked={isPublic} onCheckedChange={togglePublic} />
        </Card>
      </div>
    </div>
  );
};

export default Leagues;
