import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { PhoneFrame } from "@/components/landing/PhoneFrame";
import { WaveDivider } from "@/components/landing/WaveDivider";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Apple,
  Target,
  ShieldAlert,
  Users,
  Search,
  ArrowRight,
  ArrowUpRight,
  Check,
  Trophy,
  Flame,
  TrendingUp,
  Lock,
  Wallet,
  CalendarCheck,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

const carouselCards = [
  {
    title: "Meu Plano",
    description: "Objetivos, estratégia e histórico organizados em um só lugar.",
    icon: Target,
  },
  {
    title: "Treinos",
    description: "Séries, cargas, descanso e progressões — sempre à mão.",
    icon: Dumbbell,
  },
  {
    title: "Nutrição",
    description: "Plano alimentar conectado ao seu treinamento.",
    icon: Apple,
  },
  {
    title: "Profissionais",
    description: "Encontre, conheça e agende personal trainers e nutricionistas.",
    icon: Users,
  },
];

const pinnedFeatures = [
  {
    title: "Treinos",
    description: "Acompanhe o treino do dia, registre cada série e veja sua progressão de carga ao longo do tempo.",
  },
  {
    title: "Nutrição",
    description: "Visualize o plano alimentar definido pelo seu nutricionista, conectado ao mesmo plano do treino.",
  },
  {
    title: "Continuidade",
    description: "Autorize um novo profissional a acessar seu histórico — sem começar do zero.",
  },
];

const statTiles = [
  { value: "1", label: "Plano centralizado para toda a jornada" },
  { value: "2+", label: "Tipos de profissionais conectados ao mesmo plano" },
  { value: "100%", label: "Controle do que cada profissional acessa" },
];

const Index = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => setLoginOpen(true)} transparentOnTop />

      {/* 1. HERO — vídeo de fundo */}
      <section className="relative h-[100svh] min-h-[560px] flex items-end overflow-hidden bg-secondary">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/hero-background.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/70 to-secondary/20" />
        <div className="container mx-auto px-4 relative z-10 pb-20 sm:pb-28">
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold uppercase leading-[0.95] text-white mb-6">
              Sua vida mais
              <br />
              <span className="text-primary">organizada.</span>
            </h1>
            <p className="text-lg text-white/80 max-w-lg mb-8">
              Plano, treinos, nutrição e evolução em um só lugar — conectado aos profissionais da sua jornada.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button variant="hero" size="lg" onClick={() => navigate("/register/student")}>
                Quero conhecer o FIT
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-white/40 text-white hover:bg-white/10"
                onClick={() => navigate("/register/trainer")}
              >
                Sou profissional
              </Button>
            </div>
            <button
              onClick={() => navigate("/trainers")}
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-3 px-5 text-white/90 hover:bg-white/20 transition-smooth max-w-sm w-full"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="text-sm">Buscar um profissional perto de você</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. CARROSSEL DE RECURSOS */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="container mx-auto px-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold">Tudo que faz parte da sua jornada.</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-4 scrollbar-hide">
          {carouselCards.map((card) => (
            <div
              key={card.title}
              className="relative shrink-0 w-[80vw] sm:w-[22rem] h-72 rounded-2xl overflow-hidden snap-start bg-secondary group cursor-pointer"
              onClick={() => navigate("/register/student")}
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
          ))}
        </div>
      </section>

      {/* 3. BLOCO SÓLIDO — GAMIFICAÇÃO */}
      <section className="py-16 sm:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-4 max-w-2xl mx-auto">
            Consistência também merece reconhecimento.
          </h2>
          <p className="opacity-90 max-w-xl mx-auto mb-8">
            FIT Score, níveis, ranking e desafios — construídos em torno da sua aderência ao plano, não do excesso de treino.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { icon: Trophy, label: "FIT Score" },
              { icon: TrendingUp, label: "Ranking" },
              { icon: Flame, label: "Desafios" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-full bg-primary-foreground/15 flex items-center justify-center">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SEÇÃO PINNED — MEU PLANO */}
      <section className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-14 lg:py-12">
              {pinnedFeatures.map((f) => (
                <div key={f.title}>
                  <h3 className="text-3xl sm:text-4xl font-bold mb-3">{f.title}</h3>
                  <p className="opacity-70 max-w-sm">{f.description}</p>
                </div>
              ))}
            </div>
            <div className="lg:sticky lg:top-24 h-fit">
              <PhoneFrame label="Meu Plano">
                {[
                  { icon: Target, label: "Objetivos" },
                  { icon: Dumbbell, label: "Treinos" },
                  { icon: Apple, label: "Nutrição" },
                  { icon: ShieldAlert, label: "Restrições" },
                  { icon: Users, label: "Profissionais vinculados" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                ))}
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* 5. NÚMEROS */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold max-w-2xl mx-auto mb-12">
            Sua jornada não precisa estar espalhada.
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
            <Lock className="h-4 w-4 text-primary" />
            Você controla o que cada profissional pode acessar.
          </p>
        </div>
      </section>

      <WaveDivider toColor="hsl(var(--secondary))" />

      {/* 6. PARA PROFISSIONAIS */}
      <section className="bg-secondary text-secondary-foreground -mt-1 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">Mais do que uma agenda. Sua operação fitness.</h2>
              <p className="opacity-80 mb-8 max-w-md">
                Carteira de clientes, agenda, planos, marketplace e financeiro — organizados em um só painel.
              </p>
              <Button variant="hero" size="lg" onClick={() => navigate("/register/trainer")}>
                Quero ser profissional FIT
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: "Carteira de clientes" },
                { icon: CalendarCheck, label: "Agenda" },
                { icon: Search, label: "Marketplace" },
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
        <span className="absolute inset-0 flex items-center justify-center text-[18rem] sm:text-[26rem] font-bold text-muted/40 select-none leading-none pointer-events-none">
          FIT
        </span>
        <div className="container mx-auto px-4 relative">
          <h2 className="text-3xl sm:text-5xl font-bold mb-4">É mais que treino.<br />É o FIT.</h2>
          <p className="text-muted-foreground mb-8">Comece a organizar sua jornada hoje.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="hero" size="lg" onClick={() => navigate("/register/student")}>
              Quero conhecer o FIT
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/register/trainer")}>
              Sou profissional
            </Button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-secondary text-secondary-foreground pt-12 pb-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {[Facebook, Instagram, Linkedin, Youtube].map((Icon, i) => (
              <div key={i} className="h-10 w-10 rounded-full border border-secondary-foreground/20 flex items-center justify-center hover:bg-secondary-foreground/10 transition-smooth cursor-pointer">
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-6 border-t border-secondary-foreground/10 pt-8 text-sm opacity-70">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-primary rounded-md">
                <Dumbbell className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">FIT</span>
              <span className="hidden sm:inline">— Seu fitness. Organizado em um só lugar.</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <span>Sobre</span>
              <span>Para clientes</span>
              <span>Para profissionais</span>
              <span>Privacidade</span>
              <span>Termos de uso</span>
              <span>Contato</span>
            </div>
          </div>
        </div>
      </footer>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
};

export default Index;
