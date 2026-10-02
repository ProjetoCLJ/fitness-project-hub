import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Info, ArrowRight } from "lucide-react";
import TrainerEarnings from "@/components/dashboard/trainer/TrainerEarnings";
import TrainerPricing from "@/components/dashboard/trainer/TrainerPricing";
import { getScheduleEvents, getSlotsForDate } from "@/lib/agendaStore";
import { supabase } from "@/integrations/supabase/client";

/** Conta, dentro do mês atual, quantos horários caem em cada status (aula agendada / disponível). */
const countThisMonth = (trainerId: string) => {
  // Enquanto o profissional não configurou nada na agenda, o dia inteiro aparece "livre" por padrão —
  // contar isso como potencial de faturamento seria enganoso, então começa zerado.
  if (getScheduleEvents(trainerId).length === 0) return { aulaCount: 0, availableCount: 0 };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let aulaCount = 0;
  let availableCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const slots = getSlotsForDate(dateISO, trainerId);
    slots.forEach((slot) => {
      if (slot.status === "aula") aulaCount++;
      else if (slot.status === "available" && !slot.isPast) availableCount++;
    });
  }

  return { aulaCount, availableCount };
};

const Financial = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aulaCount, setAulaCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [basePrice, setBasePrice] = useState(0);

  useEffect(() => {
    if (!user) return;
    const { aulaCount, availableCount } = countThisMonth(user.id);
    setAulaCount(aulaCount);
    setAvailableCount(availableCount);
    supabase
      .from("trainer_profiles")
      .select("base_price")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setBasePrice(Number(data?.base_price ?? 0)));
  }, [user]);

  if (!user || user.userType !== "trainer") return null;

  // Realizado: lançado manualmente pelo profissional — ainda não há tela de lançamento, então começa zerado.
  const realizado = 0;
  const previsto = aulaCount * basePrice;
  const possivel = availableCount * basePrice;

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
              <div className="text-lg sm:text-2xl font-bold">R$ {previsto.toLocaleString("pt-BR")}</div>
              <div className="text-xs opacity-90">Previsto</div>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold">R$ {possivel.toLocaleString("pt-BR")}</div>
              <div className="text-xs opacity-90">Possível</div>
            </div>
          </div>
        </Card>

        {availableCount > 0 && (
          <Card className="p-4 sm:p-6 mb-4">
            <p className="text-sm mb-1">
              Você possui <strong>{availableCount} horário{availableCount > 1 ? "s" : ""} disponíve{availableCount > 1 ? "is" : "l"}</strong> este mês.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Se todos forem ocupados, seu faturamento possível aumenta em R$ {possivel.toLocaleString("pt-BR")}.
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
            <strong>Possível</strong> é calculado com base nos horários ainda disponíveis
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
