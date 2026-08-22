import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Info, ArrowRight } from "lucide-react";
import TrainerEarnings from "@/components/dashboard/trainer/TrainerEarnings";
import TrainerPricing from "@/components/dashboard/trainer/TrainerPricing";
import { getAvailableSlotsCount } from "@/lib/agendaStore";
import { getBasePrice } from "@/lib/financeStore";

// Mesmo valor mockado usado em TrainerEarnings — nesta fase ainda não
// há uma fonte única de faturamento real, apenas a agenda e o preço
// são cruzados de fato.
const CURRENT_MONTH_EARNINGS = 4800;

const Financial = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [availableSlotsWeek, setAvailableSlotsWeek] = useState(0);
  const [basePrice, setBasePrice] = useState(0);

  useEffect(() => {
    setAvailableSlotsWeek(getAvailableSlotsCount(7));
    setBasePrice(getBasePrice());
  }, []);

  if (!user || user.userType !== "trainer") return null;

  const potentialWeekly = availableSlotsWeek * basePrice;
  const potentialMonthly = potentialWeekly * 4;
  const potentialTotal = CURRENT_MONTH_EARNINGS + potentialMonthly;

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
            <h2 className="font-semibold">Potencial de faturamento da sua agenda</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-xl sm:text-2xl font-bold">R$ {CURRENT_MONTH_EARNINGS.toLocaleString("pt-BR")}</div>
              <div className="text-xs opacity-90">Faturamento atual/mês</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold">R$ {potentialMonthly.toLocaleString("pt-BR")}</div>
              <div className="text-xs opacity-90">Potencial adicional/mês</div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/20">
            <div className="text-2xl sm:text-3xl font-bold">R$ {potentialTotal.toLocaleString("pt-BR")}</div>
            <div className="text-xs opacity-90">Potencial total estimado/mês</div>
          </div>
        </Card>

        {availableSlotsWeek > 0 && (
          <Card className="p-4 sm:p-6 mb-4">
            <p className="text-sm mb-1">
              Você possui <strong>{availableSlotsWeek} horário{availableSlotsWeek > 1 ? "s" : ""} disponíve{availableSlotsWeek > 1 ? "is" : "l"}</strong> esta semana.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Se todos forem ocupados, seu faturamento potencial será de R$ {potentialWeekly.toLocaleString("pt-BR")} adicionais nesta semana.
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
            O potencial é uma <strong>estimativa</strong>, não faturamento garantido. O cálculo considera
            apenas horários que você marcou como disponíveis, não estão ocupados nem bloqueados, e têm
            duração suficiente para uma aula ({basePrice > 0 ? `R$ ${basePrice.toFixed(2)} por aula` : "preço não definido"}).
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
