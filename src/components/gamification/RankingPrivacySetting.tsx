import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthUid } from "@/hooks/useAuthUid";
import { useToast } from "@/hooks/use-toast";
import { fetchRankingPublic, setRankingPublic } from "@/lib/gamification";

/** Configuração: aparecer (ou não) nos rankings por esporte abertos a todos. Desligado por padrão. */
export const RankingPrivacySetting = () => {
  const uid = useAuthUid();
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (uid) fetchRankingPublic(uid).then(setIsPublic).catch(() => undefined);
  }, [uid]);

  const toggle = async (value: boolean) => {
    setIsPublic(value);
    try {
      await setRankingPublic(value);
    } catch {
      setIsPublic(!value);
      toast({ title: "Não foi possível salvar a preferência", variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 flex items-center justify-between gap-3">
      <div>
        <Label htmlFor="ranking-public" className="font-medium">
          Aparecer nos rankings por esporte
        </Label>
        <p className="text-xs text-muted-foreground">Seu nome (primeiro nome e inicial) fica visível para todos. Desligado por padrão.</p>
      </div>
      <Switch id="ranking-public" checked={isPublic} onCheckedChange={toggle} />
    </Card>
  );
};
