import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { WaveDivider } from "@/components/landing/WaveDivider";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo/logo-header.png";
import {
  Dumbbell,
  Users,
  ArrowRight,
  ArrowUpRight,
  Flame,
  Zap,
  Trophy,
  Medal,
  Smartphone,
  Wallet,
  CalendarCheck,
} from "lucide-react";

// Seções 2 a 7 iguais às da landing de interesse (projeto interesse-myjourn). Os botões seguem levando ao app.
const carouselCards = [
  {
    title: "Agenda",
    description: "Organize seus horários. Seus alunos solicitam agenda direto pelo app.",
    icon: CalendarCheck,
    to: "/register/trainer",
  },
  {
    title: "Alunos",
    description: "Carteira de clientes com o histórico de cada aluno, tudo num só lugar.",
    icon: Users,
    to: "/register/trainer",
  },
  {
    title: "Treinos",
    description: "Monte os planos e acompanhe a execução de cada aluno, semana a semana.",
    icon: Dumbbell,
    to: "/register/trainer",
  },
  {
    title: "Financeiro",
    description: "Acompanhe o financeiro dos seus alunos sem planilhas e sem confusão.",
    icon: Wallet,
    to: "/register/trainer",
  },
  {
    title: "Engajamento",
    description: "Gamificação nativa do app para o aluno querer voltar a treinar.",
    icon: Flame,
    to: "/register/trainer",
  },
];

const gamificationItems = [
  {
    icon: Flame,
    title: "Foco",
    description: "A chama que reconhece quem treina toda semana. Seu aluno não quer quebrar a sequência.",
  },
  {
    icon: Zap,
    title: "XP por treino",
    description: "Cada treino concluído vira XP, e cumprir a semana inteira rende bônus.",
  },
  {
    icon: Trophy,
    title: "Ligas mensais",
    description: "10 ligas, de Estreante a Lenda. Todo mês o aluno compete para subir de liga.",
  },
  {
    icon: Medal,
    title: "Medalhas",
    description: "Conquistas em bronze, prata e ouro por constância, evolução e metas batidas.",
  },
];

const pinnedFeatures = [
  {
    title: "Agenda sem vai e vem",
    description: "Seu aluno solicita o horário pelo app e você organiza tudo na agenda. Chega de combinar por mensagem.",
  },
  {
    title: "Treinos sob controle",
    description: "Monte o plano, veja o que cada aluno executou e ajuste conforme ele evolui.",
  },
  {
    title: "Financeiro em dia",
    description: "Acompanhe o financeiro dos seus alunos no mesmo painel em que você cuida do resto.",
  },
];

const statTiles = [
  { value: "1", label: "Painel para toda a sua operação" },
  { value: "4", label: "Frentes organizadas: agenda, alunos, treinos e financeiro" },
  { value: "10", label: "Ligas mensais para manter seus alunos motivados" },
];

type FeatureCardData = (typeof carouselCards)[number];

const FeatureCard = ({ card, onClick, className = "" }: { card: FeatureCardData; onClick: () => void; className?: string }) => (
  <div
    className={`relative h-72 rounded-2xl overflow-hidden bg-secondary group cursor-pointer ${className}`}
    onClick={onClick}
  >
    <div className="absolute inset-0 bg-gradient-hero opacity-90 group-hover:opacity-100 transition-smooth" />
    <card.icon className="absolute -right-4 -bottom-4 h-40 w-40 text-white/10" />
    <div className="relative h-full flex flex-col justify-end p-6 text-white">
      <p className="text-xl font-bold mb-1">{card.title}</p>
      <p className="text-sm text-white/85 mb-4">{card.description}</p>
      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-smooth">
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </div>
  </div>
);

const Index = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const pausedUntil = useRef(0);
  const touchStartX = useRef<number | null>(null);

  // Troca de cartão sozinha a cada 4,5 s (só no celular); pausa alguns segundos quando a pessoa interage.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setSlide((current) => (current + 1) % carouselCards.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const pauseCarousel = () => {
    pausedUntil.current = Date.now() + 8000;
  };

  const goToSlide = (index: number) => {
    pauseCarousel();
    setSlide((index + carouselCards.length) % carouselCards.length);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) goToSlide(slide + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => setLoginOpen(true)} transparentOnTop hideLogin />

      {/* 1. HERO — vídeo de fundo */}
      <section className="relative min-h-[100svh] flex items-end overflow-hidden bg-secondary">
        {/* Vídeo leve (~0,7 MB) com o índice no início do arquivo: começa a tocar assim que os primeiros dados chegam. */}
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
        <div className="container mx-auto px-4 relative z-10 pt-28 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-bold uppercase leading-[1] text-white mb-6">
              Treine com quem importa.
              <br />
              <span className="text-primary">Evolua com quem acompanha.</span>
            </h1>
            <div className="flex flex-col items-start sm:flex-row gap-3 mt-8">
              <Button variant="hero" className="h-10 px-5 text-sm" onClick={() => navigate("/login")}>
                Fazer Login
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="h-10 px-5 text-sm bg-transparent border-white/40 text-white hover:bg-white/10"
                onClick={() => navigate("/register/trainer")}
              >
                Sou profissional
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CARROSSEL DE RECURSOS */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="container mx-auto px-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Tudo que você precisa para tocar o seu trabalho.</h2>
        </div>
        <div className="container mx-auto px-4">
          {/* Celular: um cartão por vez, com a largura exata do conteúdo (mesma margem do título). */}
          <div
            className="overflow-hidden rounded-2xl sm:hidden"
            onTouchStart={(e) => {
              pauseCarousel();
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {carouselCards.map((card) => (
                <FeatureCard key={card.title} card={card} onClick={() => navigate(card.to)} className="w-full shrink-0" />
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-2 mt-4 sm:hidden">
            {carouselCards.map((card, i) => (
              <button
                key={card.title}
                type="button"
                aria-label={`Ir para ${card.title}`}
                onClick={() => goToSlide(i)}
                className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
              />
            ))}
          </div>

          {/* Computador: todos os cartões lado a lado. */}
          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {carouselCards.map((card) => (
              <FeatureCard key={card.title} card={card} onClick={() => navigate(card.to)} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. BLOCO SÓLIDO — GAMIFICAÇÃO */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-primary text-primary-foreground">
        {/* Verde da plataforma com uma sombra leve em degradê (o mesmo gradiente dos cartões verdes). */}
        <div aria-hidden className="absolute inset-0 bg-gradient-hero opacity-50 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center">
            <h2 className="text-3xl sm:text-5xl font-bold mb-4 max-w-2xl mx-auto">
              Aluno engajado não abandona o treino.
            </h2>
            <p className="opacity-90 max-w-2xl mx-auto mb-12">
              O MyJourn tem gamificação nativa: seus alunos ganham XP, mantêm o Foco, sobem de liga e colecionam
              medalhas. Você não precisa montar nada, o app já motiva por você.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {gamificationItems.map((item) => (
              <div key={item.title} className="rounded-2xl bg-primary-foreground/10 p-6 text-left">
                <div className="h-12 w-12 rounded-full bg-primary-foreground/15 flex items-center justify-center mb-4">
                  <item.icon className="h-6 w-6" />
                </div>
                <p className="text-lg font-bold mb-1">{item.title}</p>
                <p className="text-sm opacity-90">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="text-center opacity-90 max-w-2xl mx-auto mt-10 font-medium">
            E você acompanha tudo de perto: veja o Foco e os treinos da semana de cada aluno e saiba quem precisa de um
            incentivo. Crie também desafios e eventos para movimentar sua turma.
          </p>
        </div>
      </section>

      {/* 4. COMO FUNCIONA */}
      <section className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="grid md:grid-cols-3 gap-10">
            {pinnedFeatures.map((f) => (
              <div key={f.title}>
                <h3 className="text-3xl sm:text-4xl font-bold mb-3">{f.title}</h3>
                <p className="opacity-70 max-w-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. NÚMEROS */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold max-w-2xl mx-auto mb-12">
            Sua operação não precisa estar espalhada.
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {statTiles.map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl sm:text-5xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="flex items-center justify-center gap-2 font-medium mt-10">
            <Smartphone className="h-4 w-4 text-primary" />
            No celular ou no computador, sempre com você.
          </p>
        </div>
      </section>

      <WaveDivider toColor="hsl(var(--secondary))" />

      {/* 6. PARA PROFISSIONAIS */}
      <section className="bg-secondary text-secondary-foreground -mt-1 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Para profissionais</p>
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">Mais do que uma agenda. Sua operação fitness.</h2>
              <p className="opacity-80 mb-8 max-w-md">
                Agenda, alunos, treinos, financeiro e engajamento com gamificação — organizados em um só painel.
              </p>
              <Button variant="hero" size="lg" onClick={() => navigate("/register/trainer")}>
                Quero ser profissional no MyJourn
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: "Alunos" },
                { icon: CalendarCheck, label: "Agenda" },
                { icon: Dumbbell, label: "Treinos" },
                { icon: Wallet, label: "Financeiro" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 text-center bg-secondary-foreground/5 rounded-xl p-6">
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. FECHAMENTO */}
      <section className="relative py-24 sm:py-32 bg-background overflow-hidden text-center">
        <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-6xl sm:text-[9rem] lg:text-[14rem] font-bold text-muted/50 select-none leading-none pointer-events-none">
          MyJourn
        </span>
        <div className="container mx-auto px-4 relative">
          <h2 className="text-3xl sm:text-5xl font-bold mb-4">Organize sua operação.<br />Engaje seus alunos.</h2>
          <p className="text-muted-foreground mb-8">Comece a organizar sua operação hoje.</p>
          <div className="flex flex-col items-center sm:flex-row gap-3 justify-center">
            <Button variant="hero" className="h-10 px-5 text-sm" onClick={() => navigate("/cadastro")}>
              Fazer cadastro
            </Button>
            <Button variant="outline" className="h-10 px-5 text-sm" onClick={() => navigate("/register/trainer")}>
              Sou profissional
            </Button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-secondary text-secondary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm opacity-70">
            <img src={logo} alt="MyJourn" className="h-6 w-auto object-contain" />
            <span>© {new Date().getFullYear()} MyJourn. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default Index;
