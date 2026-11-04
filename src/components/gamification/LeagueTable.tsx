import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { LeagueMember, LeagueOverview } from "@/lib/gamification";
import { prefersReducedMotion, useCountUp } from "@/hooks/useCountUp";

const ROW_HEIGHT = 52;

export const ZoneDivider = ({ kind }: { kind: "up" | "down" }) => (
  <div className={`flex items-center justify-center gap-2 py-2 text-xs font-bold tracking-wide ${kind === "up" ? "text-green-600" : "text-destructive"}`}>
    {kind === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
    {kind === "up" ? "ZONA DE PROMOÇÃO" : "ZONA DE REBAIXAMENTO"}
    {kind === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
  </div>
);

export const Row = ({ member, xp, style }: { member: LeagueMember; xp?: number; style?: React.CSSProperties }) => (
  <div
    style={{ height: ROW_HEIGHT, ...style }}
    className={`relative flex items-center gap-3 px-3 rounded-lg ${member.is_me ? "bg-primary/10" : ""}`}
  >
    <span className={`w-6 text-center font-bold text-sm ${member.zone === "up" ? "text-green-600" : member.zone === "down" ? "text-destructive" : "text-muted-foreground"}`}>
      {member.position}
    </span>
    <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold">
      {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : member.name.slice(0, 1).toUpperCase()}
    </div>
    <span className={`flex-1 min-w-0 truncate ${member.is_me ? "font-semibold" : ""}`}>{member.is_me ? `${member.name} (você)` : member.name}</span>
    <span className="text-sm text-muted-foreground">{xp ?? member.xp} XP</span>
  </div>
);

/**
 * Tabela da liga (a mesma da página de Ligas). Com `before`, as linhas partem das posições antigas e
 * deslizam até as novas, como no fim de um treino: quem subiu sobe, quem foi ultrapassado desce.
 */
export const LeagueTable = ({ league, before }: { league: LeagueOverview; before?: LeagueOverview | null }) => {
  const members = league.members ?? [];
  const beforeMembers = before?.in_group ? before.members ?? [] : [];
  const animate = beforeMembers.length > 0 && !prefersReducedMotion();
  const [settled, setSettled] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(t);
  }, [animate]);

  const upSlots = league.up_slots ?? 0;
  const downSlots = league.down_slots ?? 0;
  const myXp = useCountUp(league.my_xp ?? 0, { from: before?.my_xp ?? league.my_xp ?? 0, duration: 900, delay: 500, enabled: animate });
  const myPosition = settled ? league.my_position : before?.my_position ?? league.my_position;

  const offsetOf = (m: LeagueMember, index: number) => {
    const bi = beforeMembers.findIndex((b) => b.name === m.name && b.is_me === m.is_me);
    return bi >= 0 ? (bi - index) * ROW_HEIGHT : 0;
  };

  return (
    <>
      <Card className="p-3 text-sm flex items-center justify-between gap-3">
        <span>
          Você está em <strong>{myPosition}º</strong> com <strong>{animate ? myXp : league.my_xp} XP</strong>
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

      <Card className="p-2 overflow-hidden">
        {members.map((m, i) => {
          const moving = animate && !settled ? offsetOf(m, i) : 0;
          return (
            <div key={`${m.name}-${m.is_me}`}>
              {m.position === upSlots + 1 && upSlots > 0 && i > 0 && <ZoneDivider kind="up" />}
              {downSlots > 0 && m.position === members.length - downSlots + 1 && <ZoneDivider kind="down" />}
              <Row
                member={m}
                xp={m.is_me && animate ? myXp : undefined}
                style={{
                  transform: `translateY(${moving}px)`,
                  transition: settled ? "transform 900ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
                  zIndex: m.is_me ? 2 : 1,
                  boxShadow: m.is_me && animate && !settled ? "0 6px 18px rgba(0,0,0,0.25)" : undefined,
                }}
              />
            </div>
          );
        })}
      </Card>
      <p className="text-xs text-muted-foreground text-center">Ranking por XP do mês (treinos e bônus semanal). O grupo é remontado a cada mês.</p>
    </>
  );
};
