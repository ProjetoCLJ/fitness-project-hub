import { Navigate, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";

/** Página de login única, para aluno e profissional. */
const Login = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to={user.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student"} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => undefined} hideLogin />
      <div className="container mx-auto px-4 pt-28 pb-12 max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Bem-vindo ao <span className="bg-gradient-hero bg-clip-text text-transparent">MyJourn</span>
          </h1>
          <p className="text-muted-foreground">Entre com sua conta para continuar</p>
        </div>
        <Card className="p-6 sm:p-8 shadow-medium">
          <LoginForm onSignup={() => navigate("/cadastro")} />
        </Card>
      </div>
    </div>
  );
};

export default Login;
