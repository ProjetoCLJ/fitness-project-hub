import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Coluna nova ainda não está no arquivo de tipos gerado.
const db = supabase as unknown as SupabaseClient;

/** Chave geral: o professor só aparece na busca de profissionais quando liga e cumpre os requisitos. */
export const SearchVisibilityCard = ({ trainerId }: { trainerId: string }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [listed, setListed] = useState(false);
  const [hasPrice, setHasPrice] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db.from("trainer_profiles")
      .select("listed_in_search, base_price")
      .eq("id", trainerId)
      .maybeSingle()
      .then(({ data }) => {
        setListed(Boolean(data?.listed_in_search));
        setHasPrice(Number(data?.base_price ?? 0) > 0);
        setLoaded(true);
      });
  }, [trainerId]);

  const toggle = async (next: boolean) => {
    if (next && !hasPrice) {
      toast({ title: "Defina o preço da aula primeiro", description: "Financeiro > Definir preços.", variant: "destructive" });
      return;
    }
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

  if (!loaded) return null;

  const Req = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
      <span className={ok ? "" : "text-muted-foreground"}>{children}</span>
    </li>
  );

  return (
    <Card className="p-4 sm:p-6 mb-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Search className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h2 className="font-semibold text-base sm:text-lg">Aparecer na busca de profissionais</h2>
            <p className="text-sm text-muted-foreground">
              Desligado, novos alunos não encontram você. Seus alunos continuam vendo seus horários normalmente.
            </p>
          </div>
        </div>
        <Switch checked={listed} disabled={busy} onCheckedChange={toggle} aria-label="Aparecer na busca de profissionais" />
      </div>

      <ul className="space-y-1.5">
        <Req ok={hasPrice}>Preço da aula definido</Req>
        <Req ok={false}>Local de atendimento cadastrado (em breve)</Req>
      </ul>
      {!hasPrice && (
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/trainer/financial")}>
          Definir preço da aula
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Escolha quais horários os novos alunos podem pedir: em cada expediente, use "Visível na busca de profissionais"; para um horário específico, toque nele na agenda e desligue "Mostrar este horário na busca".
      </p>
    </Card>
  );
};
