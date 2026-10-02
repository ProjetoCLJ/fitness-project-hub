import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Sparkles } from "lucide-react";

const Challenges = () => {
  const { user } = useAuth();

  if (!user || user.userType !== "student") return null;

  // Pontuação e ranking ainda não têm backend — ficam zerados até existirem.
  const fitScore = 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Desafios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Consistência gera resultado — acompanhe sua jornada
          </p>
        </div>

        <Card className="p-4 sm:p-6 mb-4 bg-gradient-hero text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">Seu FIT Score</span>
            </div>
            <span className="text-2xl font-bold">{fitScore}</span>
          </div>
          <p className="text-sm opacity-90 mt-1">Você ainda não aparece no ranking geral</p>
        </Card>

        <Card className="p-4 sm:p-6 mb-4 text-center text-sm text-muted-foreground">
          Nenhum desafio ativo no momento.
        </Card>

        <Card className="p-6 sm:p-8 text-center border-dashed">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="font-medium mb-1">Ranking completo e mais desafios em breve</p>
          <p className="text-sm text-muted-foreground">
            Estamos preparando o ranking por grupos, academias e comunidades.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Challenges;
