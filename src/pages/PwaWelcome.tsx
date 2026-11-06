import { useRef } from "react";
import { Navigate } from "react-router-dom";
import { LoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo/logo-header.png";

/**
 * Tela inicial do app instalado no celular (PWA): só o vídeo de fundo, o logo no topo e o login em modal.
 * Quem já está logado vai direto para o painel.
 */
const PwaWelcome = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  // Só espera a primeira checagem da sessão (para não piscar o login de quem já está logado).
  // Depois disso o modal fica sempre na tela, inclusive enquanto o login e o painel carregam.
  const sessionChecked = useRef(false);
  if (!isLoading) sessionChecked.current = true;

  if (isAuthenticated && user) {
    return <Navigate to={user.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student"} replace />;
  }

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-secondary">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/hero-background.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="absolute inset-0 bg-black/55" />

      <header className="relative z-10 flex justify-center px-4" style={{ paddingTop: "max(1.75rem, env(safe-area-inset-top))" }}>
        <img src={logo} alt="MyJourn" className="h-10 w-auto object-contain" />
      </header>

      {/* O login é a própria tela: o modal não fecha enquanto a pessoa não entrar. */}
      {sessionChecked.current && <LoginDialog open locked onOpenChange={() => undefined} />}
    </div>
  );
};

export default PwaWelcome;
