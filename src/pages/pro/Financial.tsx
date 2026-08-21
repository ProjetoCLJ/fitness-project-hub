import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";
import TrainerEarnings from "@/components/dashboard/trainer/TrainerEarnings";
import TrainerPricing from "@/components/dashboard/trainer/TrainerPricing";

const Financial = () => {
  const { user } = useAuth();

  if (!user || user.userType !== "trainer") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Financeiro</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Faturamento e valores da sua aula</p>
        </div>

        <Card className="p-4 mb-4 flex items-start gap-3 bg-muted/30 border-dashed">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            O cálculo de potencial de faturamento com base nos horários vagos da agenda chega na
            próxima fase. Por enquanto, veja seu faturamento atual e configure seus preços.
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
