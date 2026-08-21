import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Flame, Users, Sparkles } from "lucide-react";

const Challenges = () => {
  const { user } = useAuth();

  if (!user || user.userType !== "student") return null;

  const fitScore = 1850;
  const rankingPosition = 18;

  const activeChallenge = {
    name: "Consistência - Academia FIT",
    description: "Complete os treinos planejados durante 4 semanas",
    participants: 124,
    progressWeeks: 2,
    totalWeeks: 4,
  };

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
          <p className="text-sm opacity-90 mt-1">Você está em #{rankingPosition} no ranking geral</p>
        </Card>

        <Card className="p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base sm:text-lg">{activeChallenge.name}</h2>
            <Badge variant="secondary">Ativo</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{activeChallenge.description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            {activeChallenge.participants} participantes
          </div>
          <Progress value={(activeChallenge.progressWeeks / activeChallenge.totalWeeks) * 100} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">
            Semana {activeChallenge.progressWeeks} de {activeChallenge.totalWeeks}
          </p>
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
