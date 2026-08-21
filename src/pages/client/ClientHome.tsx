import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Trophy,
  TrendingUp,
  Calendar,
  Clock,
  User,
  Target,
  Play,
  ChevronRight,
} from "lucide-react";

const ClientHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.userType !== "student") return null;

  // Mock data - dados virão do backend em fase futura
  const fitScore = 1850;
  const level = { name: "Dedicado", min: 1000, max: 1999 };
  const levelProgress = ((fitScore - level.min) / (level.max - level.min)) * 100;
  const rankingPosition = 18;
  const streak = 6;

  const nextWorkout = {
    name: "Treino B - Superiores",
    time: "Hoje, 18:00",
    objective: "Hipertrofia",
    trainerName: "Carlos Silva",
  };

  const nextAppointment = {
    professional: "Carlos Silva",
    role: "Personal Trainer",
    date: "Hoje, 18:00",
  };

  const weekProgress = {
    completed: 3,
    planned: 4,
    completionRate: 75,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Olá, {user.profile.fullName.split(" ")[0]}!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Aqui está o resumo do seu dia</p>
        </div>

        {/* Resumo do dia: pontuação, nível, ranking */}
        <Card className="p-4 sm:p-6 mb-4 bg-gradient-hero text-primary-foreground">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-4 w-4" />
                <span className="text-xl sm:text-2xl font-bold">{fitScore}</span>
              </div>
              <div className="text-xs opacity-90">FIT Score</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xl sm:text-2xl font-bold">#{rankingPosition}</span>
              </div>
              <div className="text-xs opacity-90">No ranking</div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="h-4 w-4" />
                <span className="text-xl sm:text-2xl font-bold">{streak}</span>
              </div>
              <div className="text-xs opacity-90">Dias seguidos</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1 opacity-90">
              <span>Nível {level.name}</span>
              <span>{fitScore}/{level.max}</span>
            </div>
            <Progress value={levelProgress} className="h-2 bg-white/20" />
          </div>
        </Card>

        {/* Próximo treino */}
        <Card className="p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base sm:text-lg">Próximo treino</h2>
            <Badge variant="secondary" className="text-xs">{nextWorkout.objective}</Badge>
          </div>
          <div className="space-y-2 mb-4">
            <p className="font-medium">{nextWorkout.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {nextWorkout.time}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {nextWorkout.trainerName}
            </div>
          </div>
          <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard/student/plan")}>
            <Play className="h-4 w-4 mr-2" />
            Iniciar treino
          </Button>
        </Card>

        {/* Próximo atendimento */}
        <Card className="p-4 sm:p-6 mb-4">
          <h2 className="font-semibold text-base sm:text-lg mb-3">Próximo atendimento</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{nextAppointment.professional}</p>
              <p className="text-sm text-muted-foreground">{nextAppointment.role}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{nextAppointment.date}</p>
            </div>
          </div>
        </Card>

        {/* Progresso semanal */}
        <Card className="p-4 sm:p-6 mb-4">
          <h2 className="font-semibold text-base sm:text-lg mb-4">Progresso da semana</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold text-primary">{weekProgress.completed}/{weekProgress.planned}</div>
              <div className="text-xs text-muted-foreground">Treinos realizados</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{weekProgress.completionRate}%</div>
              <div className="text-xs text-muted-foreground">Taxa de conclusão</div>
            </div>
          </div>
          <Progress value={weekProgress.completionRate} className="h-2" />
        </Card>

        {/* Atalho para Meu Plano */}
        <Card
          className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:shadow-medium transition-smooth"
          onClick={() => navigate("/dashboard/student/plan")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Ver meu plano completo</p>
              <p className="text-sm text-muted-foreground">Treinos, nutrição e objetivos</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Card>
      </div>
    </div>
  );
};

export default ClientHome;
