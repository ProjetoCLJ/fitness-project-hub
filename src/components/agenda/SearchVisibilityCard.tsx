import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ScheduleEvent,
  clearHiddenSlots,
  fetchHiddenSlots,
  fetchTrainerEvents,
  setExpedientesVisible,
} from "@/lib/agendaStore";

// Coluna nova ainda não está no arquivo de tipos gerado.
const db = supabase as unknown as SupabaseClient;

type Mode = "all" | "series" | "specific";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const describeExpediente = (e: ScheduleEvent) => {
  const when =
    e.recurrence === "weekly"
      ? (e.weekdays ?? []).map((d) => WEEKDAY_SHORT[d]).join(", ")
      : new Date(`${e.date ?? e.startDate}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${when} · ${e.startTime}–${e.endTime}`;
};

interface Props {
  trainerId: string;
  /** Avisa a agenda para recarregar quando a visibilidade dos horários muda. */
  onChanged?: () => void;
}

/** Chave geral da busca + escolha de quais horários novos alunos podem pedir. */
export const SearchVisibilityCard = ({ trainerId, onChanged }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [listed, setListed] = useState(false);
  const [hasPrice, setHasPrice] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("all");
  const [expedientes, setExpedientes] = useState<ScheduleEvent[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);

  const loadSchedule = useCallback(async () => {
    try {
      const [events, hidden] = await Promise.all([fetchTrainerEvents(trainerId), fetchHiddenSlots(trainerId)]);
      const exp = events.filter((e) => e.type === "expediente");
      setExpedientes(exp);
      setHiddenCount(hidden.size);
      return { exp, hidden: hidden.size };
    } catch {
      return { exp: [] as ScheduleEvent[], hidden: 0 };
    }
  }, [trainerId]);

  useEffect(() => {
    (async () => {
      const [{ data }, schedule] = await Promise.all([
        db.from("trainer_profiles").select("listed_in_search, base_price").eq("id", trainerId).maybeSingle(),
        loadSchedule(),
      ]);
      setListed(Boolean(data?.listed_in_search));
      setHasPrice(Number(data?.base_price ?? 0) > 0);
      setMode(schedule.exp.some((e) => !e.publicVisible) ? "series" : schedule.hidden > 0 ? "specific" : "all");
      setLoaded(true);
    })();
  }, [trainerId, loadSchedule]);

  const toggle = async (next: boolean) => {
    if (next && !hasPrice) return;
    setBusy(true);
    const { error } = await db.from("trainer_profiles").update({ listed_in_search: next }).eq("id", trainerId);
    setBusy(false);
    if (error) {
      toast({ title: "Não foi possível atualizar", description: "Confira os requisitos e tente de novo.", variant: "destructive" });
      return;
    }
    setListed(next);
    toast({ title: next ? "Você aparece na busca de profissionais" : "Você não aparece mais na busca" });
  };

  const changeMode = async (next: Mode) => {
    setMode(next);
    if (next !== "all") return;
    // "Todos os horários livres": libera todos os expedientes e remove as exceções.
    setBusy(true);
    try {
      await setExpedientesVisible(
        expedientes.filter((e) => !e.publicVisible).map((e) => e.id),
        true
      );
      await clearHiddenSlots(trainerId);
      await loadSchedule();
      onChanged?.();
    } catch {
      toast({ title: "Não foi possível liberar os horários", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggleExpediente = async (expediente: ScheduleEvent, visible: boolean) => {
    try {
      await setExpedientesVisible([expediente.id], visible);
      await loadSchedule();
      onChanged?.();
    } catch {
      toast({ title: "Não foi possível atualizar o expediente", variant: "destructive" });
    }
  };

  const clearHidden = async () => {
    try {
      await clearHiddenSlots(trainerId);
      await loadSchedule();
      onChanged?.();
    } catch {
      toast({ title: "Não foi possível limpar os horários ocultos", variant: "destructive" });
    }
  };

  if (!loaded) return null;

  const blocked = !hasPrice;

  return (
    <Card className="p-3 sm:p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {blocked ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : <Search className="h-4 w-4 text-primary shrink-0" />}
          <h2 className="font-semibold text-sm sm:text-base truncate">Aparecer na busca de profissionais</h2>
        </div>
        <Switch checked={listed} disabled={busy || blocked} onCheckedChange={toggle} aria-label="Aparecer na busca de profissionais" />
      </div>

      {blocked && (
        <div className="space-y-1 text-xs text-destructive">
          <p>
            Defina o preço da aula para ativar.{" "}
            <button type="button" className="underline" onClick={() => navigate("/dashboard/trainer/financial")}>
              Ir para Financeiro
            </button>
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Local de atendimento: o cadastro de locais chega em breve e passará a ser exigido para ativar.</p>

      {listed && (
        <div className="space-y-3 border-t pt-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Quais horários novos alunos podem pedir</p>
            <Select value={mode} onValueChange={(v) => changeMode(v as Mode)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os horários livres</SelectItem>
                <SelectItem value="series">Somente expedientes selecionados</SelectItem>
                <SelectItem value="specific">Ocultar horários específicos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "all" && (
            <p className="text-xs text-muted-foreground">Todos os horários livres dos seus expedientes aparecem para novos alunos.</p>
          )}

          {mode === "series" && (
            <div className="space-y-2">
              {expedientes.length === 0 ? (
                <p className="text-xs text-muted-foreground">Você ainda não definiu nenhum expediente na agenda.</p>
              ) : (
                expedientes.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{describeExpediente(e)}</span>
                    <Switch checked={e.publicVisible} onCheckedChange={(v) => toggleExpediente(e, v)} aria-label={`Mostrar ${describeExpediente(e)} na busca`} />
                  </div>
                ))
              )}
            </div>
          )}

          {mode === "specific" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Toque num horário livre na agenda e desligue "Mostrar este horário na busca".{" "}
                {hiddenCount > 0 ? `Hoje há ${hiddenCount} horário(s) oculto(s).` : "Nenhum horário oculto no momento."}
              </p>
              {hiddenCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearHidden}>
                  Mostrar todos novamente
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
