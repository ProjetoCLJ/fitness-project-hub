import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentDialog } from "@/components/finance/PaymentDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Info, ArrowRight, Plus, Wallet, MoreHorizontal } from "lucide-react";
import TrainerEarnings from "@/components/dashboard/trainer/TrainerEarnings";
import TrainerPricing from "@/components/dashboard/trainer/TrainerPricing";
import { fetchLinkedStudents, fetchTrainerEvents } from "@/lib/agendaStore";
import { MonthRevenue, computeMonthRevenue, fetchBasePrice } from "@/lib/financeCalc";
import { Payment, deletePayment, fetchTrainerPayments, formatBRL, realizedThisMonth } from "@/lib/financeStore";

const Financial = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState<MonthRevenue>({ aulaSlots: 0, availableSlots: 0, previsto: 0, possivel: 0 });
  const [basePrice, setBasePrice] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | undefined>();
  const [offersKey, setOffersKey] = useState(0);

  const loadPayments = useCallback(async () => {
    if (!user) return;
    try {
      setPayments(await fetchTrainerPayments(user.id));
    } catch {
      toast({ title: "Não foi possível carregar os pagamentos", variant: "destructive" });
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    loadPayments();
    (async () => {
      try {
        const [events, students, price] = await Promise.all([
          fetchTrainerEvents(user.id),
          fetchLinkedStudents(user.id),
          fetchBasePrice(user.id),
        ]);
        setBasePrice(price);
        setRevenue(computeMonthRevenue(events, students, price));
      } catch {
        // mantém os valores zerados
      }
    })();
  }, [user, loadPayments]);

  if (!user || user.userType !== "trainer") return null;

  const realizado = realizedThisMonth(payments);

  const startNewPayment = () => {
    setNewMenuOpen(false);
    setEditing(undefined);
    setPaymentOpen(true);
  };

  const editPayment = (payment: Payment) => {
    setEditing(payment);
    setPaymentOpen(true);
  };

  const removePayment = async (payment: Payment) => {
    if (!window.confirm(`Excluir o lançamento de ${formatBRL(payment.amount)} (${payment.payerName})?`)) return;
    try {
      await deletePayment(payment.id);
      await loadPayments();
      toast({ title: "Lançamento excluído" });
    } catch {
      toast({ title: "Não foi possível excluir o lançamento", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Financeiro</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Faturamento, preços e pagamentos</p>
          </div>
          <Button variant="hero" size="sm" onClick={() => setNewMenuOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="general" className="flex-1">Geral</TabsTrigger>
            <TabsTrigger value="pricing" className="flex-1">Definir preços</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card className="p-4 sm:p-6 bg-gradient-hero text-primary-foreground">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5" />
                <h2 className="font-semibold">Faturamento do mês</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-sm sm:text-2xl font-bold leading-tight break-words">{formatBRL(realizado)}</div>
                  <div className="text-xs opacity-90">Realizado</div>
                </div>
                <div>
                  <div className="text-sm sm:text-2xl font-bold leading-tight break-words">{formatBRL(revenue.previsto)}</div>
                  <div className="text-xs opacity-90">Previsto</div>
                </div>
                <div>
                  <div className="text-sm sm:text-2xl font-bold leading-tight break-words">{formatBRL(revenue.possivel)}</div>
                  <div className="text-xs opacity-90">Possível</div>
                </div>
              </div>
            </Card>

            {revenue.availableSlots > 0 && (
              <Card className="p-4 sm:p-6">
                <p className="text-sm mb-1">
                  Você possui <strong>{revenue.availableSlots} horário{revenue.availableSlots > 1 ? "s" : ""} disponíve{revenue.availableSlots > 1 ? "is" : "l"}</strong> este mês.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Se todos forem ocupados, seu faturamento possível aumenta em {formatBRL(revenue.possivel)}.
                </p>
                <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard/trainer/profile")}>
                  Encontrar clientes para esses horários
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Card>
            )}

            <Card className="p-4 flex items-start gap-3 bg-muted/30">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Realizado</strong> é a soma dos pagamentos que você lançou neste mês.{" "}
                <strong>Previsto</strong> é calculado com base nas aulas já agendadas no mês.{" "}
                <strong>Possível</strong> é calculado com base nos horários do seu expediente que ainda estão livres
                ({basePrice > 0 ? `R$ ${basePrice.toFixed(2)} por aula` : "preço não definido no seu perfil"}).
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <TrainerPricing refreshKey={offersKey} />
          </TabsContent>

          <TabsContent value="history">
            <TrainerEarnings payments={payments} onEdit={editPayment} onDelete={removePayment} />
          </TabsContent>
        </Tabs>
      </div>

      {/* "+ Novo": escolha do tipo de lançamento */}
      <Dialog open={newMenuOpen} onOpenChange={setNewMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo</DialogTitle>
            <DialogDescription>O que você quer registrar?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={startNewPayment}
              className="flex items-start gap-3 rounded-lg border p-4 text-left hover:border-primary/50 hover:bg-muted/50 transition-smooth"
            >
              <Wallet className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">Lançar pagamento</span>
                <span className="block text-sm text-muted-foreground">Registre um pagamento recebido de um aluno.</span>
              </span>
            </button>
            <div className="flex items-start gap-3 rounded-lg border border-dashed p-4 opacity-60">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">Outro</span>
                <span className="block text-sm text-muted-foreground">Em breve.</span>
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        trainerId={user.id}
        payment={editing}
        onSaved={() => {
          loadPayments();
          setOffersKey((k) => k + 1);
        }}
      />
    </div>
  );
};

export default Financial;
