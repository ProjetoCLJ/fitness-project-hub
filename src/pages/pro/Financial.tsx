import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Info, ArrowRight } from "lucide-react";
import TrainerEarnings from "@/components/dashboard/trainer/TrainerEarnings";
import TrainerPricing from "@/components/dashboard/trainer/TrainerPricing";
import { fetchLinkedStudents, fetchTrainerEvents } from "@/lib/agendaStore";
import { MonthRevenue, computeMonthRevenue, fetchBasePrice } from "@/lib/financeCalc";

const Financial = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState<MonthRevenue>({ aulaSlots: 0, availableSlots: 0, previsto: 0, possivel: 0 });
  const [basePrice, setBasePrice] = useState(0);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  if (!user || user.userType !== "trainer") return null;

  // Realizado: lançado manualmente pelo profissional — ainda não há tela de lançamento, então começa zerado.
  const realizado = 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Financeiro</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Faturamento e valores da sua aula</p>
        </div>

        <Card className="p-4 sm:p-6 mb-4 bg-gradient-hero text-primary-foreground">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5" />
            <h2 className="font-semibold">Faturamento do mês</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-lg sm:text-2xl font-bold">R$ {realizado.toLocaleString("pt-BR")}</div>
              <div className="text-xs opacity-90">Realizado</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold">R$ {revenue.previsto.toLocaleString("pt-BR")}</div>
              <div className="text-xs opacity-90">Previsto</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold">R$ {revenue.possivel.toLocaleString("pt-BR")}</div>
              <div className="text-xs opacity-90">Possível</div>
            </div>
          </div>
        </Card>

        {revenue.availableSlots > 0 && (
          <Card className="p-4 sm:p-6 mb-4">
            <p className="text-sm mb-1">
              Você possui <strong>{revenue.availableSlots} horário{revenue.availableSlots > 1 ? "s" : ""} disponíve{revenue.availableSlots > 1 ? "is" : "l"}</strong> este mês.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Se todos forem ocupados, seu faturamento possível aumenta em R$ {revenue.possivel.toLocaleString("pt-BR")}.
            </p>
            <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard/trainer/profile")}>
              Encontrar clientes para esses horários
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        )}

        <Card className="p-4 mb-6 flex items-start gap-3 bg-muted/30">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong>Realizado</strong> é o que você lançar manualmente conforme os alunos pagam.{" "}
            <strong>Previsto</strong> é calculado com base nas aulas já agendadas no mês.{" "}
            <strong>Possível</strong> é calculado com base nos horários do seu expediente que ainda estão livres
            ({basePrice > 0 ? `R$ ${basePrice.toFixed(2)} por aula` : "preço não definido no seu perfil"}).
          </p>
        </Card>

        <div className="space-y-6">
          <TrainerEarnings />
          <TrainerPricing />
        </div>
      </div>
    </div>
  );
};

export default Financial;
