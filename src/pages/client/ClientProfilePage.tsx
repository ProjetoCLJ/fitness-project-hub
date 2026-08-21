import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import StudentProfile from "@/components/dashboard/student/StudentProfile";

const ClientProfilePage = () => {
  const { user } = useAuth();

  if (!user || user.userType !== "student") return null;

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => {}} />

      <div className="container mx-auto px-4 pt-20 pb-24 sm:pt-24 sm:pb-12 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl sm:text-3xl font-bold">Perfil</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Suas informações e preferências</p>
        </div>
        <StudentProfile />
      </div>
    </div>
  );
};

export default ClientProfilePage;
