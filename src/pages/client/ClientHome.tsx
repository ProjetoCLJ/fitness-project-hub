import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { AthleteSummary } from "@/components/athlete/AthleteSummary";

const ClientHome = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Olá, {user.profile.fullName.split(" ")[0]}!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Aqui está o resumo do seu dia</p>
        </div>

        <AthleteSummary />
      </div>
    </div>
  );
};

export default ClientHome;
