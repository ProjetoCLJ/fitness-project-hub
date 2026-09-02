import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import TrainerProfile from "@/components/dashboard/trainer/TrainerProfile";
import { ThemeToggle } from "@/components/ThemeToggle";

const ProfessionalProfilePage = () => {
  const { user } = useAuth();

  if (!user || user.userType !== "trainer") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Perfil</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Seu perfil público no marketplace</p>
        </div>
        <ThemeToggle />
        <TrainerProfile />
      </div>
    </div>
  );
};

export default ProfessionalProfilePage;
