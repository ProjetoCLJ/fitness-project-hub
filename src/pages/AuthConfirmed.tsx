import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { takePendingInvitePath } from "@/lib/challengeStore";

/** Destino do link de confirmação de e-mail: o Supabase abre a sessão e levamos a pessoa ao painel. */
const AuthConfirmed = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(takePendingInvitePath() ?? (user.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student"), { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => navigate("/")} />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-md">
        <Card className="p-6 sm:p-8 text-center space-y-4">
          {isLoading || user ? (
            <p className="text-sm text-muted-foreground">Confirmando seu e-mail...</p>
          ) : (
            <>
              <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">
                Se você já confirmou seu e-mail, é só entrar com sua senha. Caso contrário, peça um novo e-mail de confirmação no cadastro.
              </p>
              <Button variant="hero" className="w-full" onClick={() => navigate("/")}>
                Ir para o início
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AuthConfirmed;
