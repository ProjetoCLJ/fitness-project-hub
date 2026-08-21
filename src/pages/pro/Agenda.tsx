import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";
import TrainerSchedule from "@/components/dashboard/trainer/TrainerSchedule";

const Agenda = () => {
  const { user } = useAuth();

  if (!user || user.userType !== "trainer") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Agenda</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Sua disponibilidade e atendimentos</p>
        </div>

        <Card className="p-4 mb-4 flex items-start gap-3 bg-muted/30 border-dashed">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Visualização por dia/semana/mês e o cruzamento automático de disponibilidade com o cliente
            chegam na próxima fase. Por enquanto, gerencie seus horários abaixo.
          </p>
        </Card>

        <TrainerSchedule />
      </div>
    </div>
  );
};

export default Agenda;
