import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
  // "/?login=1" abre o login em modal (é para onde "voltar" e os links de "Entrar" levam).
  const [loginOpen, setLoginOpen] = useState(searchParams.get("login") === "1");
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

      {/* Só mostra o texto e o botão depois da primeira checagem da sessão (para não piscar para quem já está logado). */}
      {!isLoading && (
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
      )}

      {/* O login abre em modal sobre o vídeo; fecha ao entrar e leva ao painel. */}
      <LoginDialog open={loginOpen} onOpenChange={handleLoginOpenChange} />
    </div>
  );
};

export default PwaWelcome;
