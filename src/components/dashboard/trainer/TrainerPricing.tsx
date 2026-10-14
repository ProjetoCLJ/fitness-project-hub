import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Offer, createOffer, deleteOffer, fetchOffers, formatBRL, setOfferActive } from "@/lib/financeStore";

interface Props {
  /** Muda quando uma oferta é criada em outro lugar (ex.: no lançamento de pagamento). */
  refreshKey?: number;
}

const TrainerPricing = ({ refreshKey = 0 }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [basePrice, setBasePrice] = useState("0.00");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [newOffer, setNewOffer] = useState({ name: "", classesCount: "", totalPrice: "" });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("trainer_profiles")
      .select("base_price")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setBasePrice(Number(data?.base_price ?? 0).toFixed(2)));
  }, [user]);

  const loadOffers = useCallback(async () => {
    if (!user) return;
    try {
      setOffers(await fetchOffers(user.id));
    } catch {
      toast({ title: "Não foi possível carregar as ofertas", variant: "destructive" });
    }
  }, [user, toast]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers, refreshKey]);

  const addOffer = async () => {
    const classes = parseInt(newOffer.classesCount, 10);
    const total = parseFloat(newOffer.totalPrice);
    if (!user || !newOffer.name.trim() || !(classes > 0) || !Number.isFinite(total) || total < 0) {
      toast({ title: "Preencha nome, número de aulas e valor total", variant: "destructive" });
      return;
    }
    try {
      await createOffer(user.id, { name: newOffer.name, classesCount: classes, totalPrice: total });
      setNewOffer({ name: "", classesCount: "", totalPrice: "" });
      await loadOffers();
      toast({ title: "Oferta criada" });
    } catch {
      toast({ title: "Não foi possível criar a oferta", variant: "destructive" });
    }
  };

  const toggleOffer = async (offer: Offer) => {
    try {
      await setOfferActive(offer.id, !offer.isActive);
      await loadOffers();
    } catch {
      toast({ title: "Não foi possível atualizar a oferta", variant: "destructive" });
    }
  };

  const removeOffer = async (offer: Offer) => {
    if (!window.confirm(`Excluir a oferta "${offer.name}"? Os pagamentos já lançados continuam no histórico.`)) return;
    try {
      await deleteOffer(offer.id);
      await loadOffers();
    } catch {
      toast({ title: "Não foi possível excluir a oferta", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    const parsed = parseFloat(basePrice);
    if (user && Number.isFinite(parsed)) {
      const { error } = await supabase.from("trainer_profiles").update({ base_price: parsed }).eq("id", user.id);
      if (error) {
        toast({ title: "Não foi possível salvar", description: "Tente novamente.", variant: "destructive" });
        return;
      }
    }
    toast({ title: "Preço atualizado!", description: "Suas alterações foram salvas com sucesso." });
  };

  const perClass = (o: Offer) => (o.classesCount > 0 ? o.totalPrice / o.classesCount : 0);

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          Preço padrão da aula
        </h2>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="base-price">Valor por aula (R$)</Label>
          <Input id="base-price" type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="text-lg" />
          <p className="text-sm text-muted-foreground">Preço cobrado por aula avulsa.</p>
          <Button onClick={handleSave} variant="hero" className="w-full">
            Salvar preço
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Ofertas
        </h2>

        {offers.length === 0 && <p className="text-sm text-muted-foreground mb-6">Nenhuma oferta criada ainda.</p>}

        <div className="space-y-3 mb-6">
          {offers.map((offer) => (
            <div key={offer.id} className="flex items-center justify-between gap-3 p-4 border rounded-lg">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{offer.name}</h3>
                  {offer.isActive ? <Badge className="bg-primary/10 text-primary">Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {offer.classesCount} {offer.classesCount === 1 ? "aula" : "aulas"} · {formatBRL(perClass(offer))} por aula
                </p>
                <p className="text-lg font-bold text-primary">{formatBRL(offer.totalPrice)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={offer.isActive} onCheckedChange={() => toggleOffer(offer)} aria-label="Ativar ou desativar oferta" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOffer(offer)} aria-label="Excluir oferta">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Criar nova oferta</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="offer-name">Nome da oferta</Label>
              <Input id="offer-name" placeholder="Ex: Pacote 6 aulas" value={newOffer.name} onChange={(e) => setNewOffer({ ...newOffer, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-classes">Número de aulas</Label>
              <Input id="offer-classes" type="number" min={1} value={newOffer.classesCount} onChange={(e) => setNewOffer({ ...newOffer, classesCount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-total">Valor total (R$)</Label>
              <Input id="offer-total" type="number" min={0} step="0.01" value={newOffer.totalPrice} onChange={(e) => setNewOffer({ ...newOffer, totalPrice: e.target.value })} />
            </div>
          </div>
          <Button onClick={addOffer} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar oferta
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TrainerPricing;
