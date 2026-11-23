import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/components/LoginDialog";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo/logo-header.png";

/**
 * Tela inicial do app instalado no celular (PWA): o mesmo vídeo de fundo e a mesma frase/botão de login da
 * página principal do site. Quem já está logado vai direto para o painel.
 */
const PwaWelcome = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // O login em modal já abre com a tela (e "/?login=1" também leva até ele). Fica visível inclusive enquanto a sessão é
  // conferida ou o login é feito; quem fecha pode reabrir pelo botão "Fazer Login".
  const [loginOpen, setLoginOpen] = useState(true);
  useEffect(() => {
    if (searchParams.get("login") === "1") setLoginOpen(true);
  }, [searchParams]);
  const handleLoginOpenChange = (open: boolean) => {
    setLoginOpen(open);
    if (!open && searchParams.has("login")) {
      const next = new URLSearchParams(searchParams);
      next.delete("login");
      setSearchParams(next, { replace: true });
    }
  };

  if (isAuthenticated && user) {
    return <Navigate to={user.userType === "trainer" ? "/dashboard/trainer" : "/dashboard/student"} replace />;
  }

  return (
    <div className="relative min-h-[100svh] flex items-end overflow-hidden bg-secondary">
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

      <header className="absolute inset-x-0 top-0 z-10 flex justify-center px-4" style={{ paddingTop: "max(1.75rem, env(safe-area-inset-top))" }}>
        <img src={logo} alt="MyJourn" className="h-10 w-auto object-contain" />
      </header>

      <div
        className="container mx-auto px-4 relative z-10 pt-28 sm:pt-24"
        style={{ paddingBottom: "max(5rem, calc(env(safe-area-inset-bottom) + 3rem))" }}
      >
        <div className="max-w-3xl">
          <p className="text-sm sm:text-base font-semibold uppercase tracking-widest text-white/85 mb-3">Seja bem-vindo</p>
          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-bold uppercase leading-[1] text-white mb-6">
            Treine com quem importa.
            <br />
            <span className="text-primary">Evolua com quem acompanha.</span>
          </h1>
          <div className="flex flex-col items-start sm:flex-row gap-3 mt-8">
            <Button variant="hero" className="h-10 px-5 text-sm" onClick={() => setLoginOpen(true)}>
              Fazer Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* O login fica em modal sobre o vídeo; ao entrar, a pessoa vai para o painel. */}
      <LoginDialog open={loginOpen} onOpenChange={handleLoginOpenChange} />

      {/* Conferindo a sessão ou entrando: carregamento no centro, escurecendo o fundo (o modal continua por trás). */}
      {isLoading && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/60 text-white">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-sm font-medium">Carregando...</p>
        </div>
      )}
    </div>
  );
};

export default PwaWelcome;
