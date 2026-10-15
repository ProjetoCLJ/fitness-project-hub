import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { PhoneFrame } from "@/components/landing/PhoneFrame";
import { WaveDivider } from "@/components/landing/WaveDivider";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo/logo-header.png";
import {
  Dumbbell,
  Target,
  ShieldAlert,
  Users,
  Search,
  ArrowRight,
  ArrowUpRight,
  Flame,
  TrendingUp,
  Link2,
  Smartphone,
  Wallet,
  CalendarCheck,
  CalendarHeart,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

const carouselCards = [
  {
    title: "Treinos",
    description: "O treino do dia, as semanas do plano e o registro de cada série.",
    icon: Dumbbell,
  },
  {
    title: "Evolução",
    description: "Peso, cargas e histórico para ver o seu avanço de verdade.",
    icon: TrendingUp,
  },
  {
    title: "Desafios",
    description: "Entre em desafios com os amigos e registre seus treinos.",
    icon: Flame,
  },
  {
    title: "Eventos",
    description: "Corridas, aulas em grupo e encontros para treinar junto.",
    icon: CalendarHeart,
  },
  {
    title: "Profissionais",
    description: "Encontre, agende e treine com quem acompanha a sua evolução.",
    icon: Users,
  },
];

const pinnedFeatures = [
  {
    title: "Treinos",
    description: "Acompanhe o treino do dia, registre cada série e veja sua progressão de carga ao longo do tempo.",
  },
  {
    title: "Evolução",
    description: "Seu peso, seu histórico de treinos e o avanço em cada plano, à vista de você e do seu profissional.",
  },
  {
    title: "Acompanhamento",
    description: "Seu profissional monta o plano, acompanha a execução e ajusta conforme você evolui.",
  },
];

const statTiles = [
  { value: "1", label: "Plano organizado para toda a sua jornada" },
  { value: "3", label: "Jeitos de evoluir: treinos, desafios e eventos" },
  { value: "1:1", label: "Acompanhamento direto do seu profissional" },
];

const Index = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => setLoginOpen(true)} transparentOnTop />

      {/* 1. HERO — vídeo de fundo */}
      <section className="relative min-h-[100svh] flex items-end overflow-hidden bg-secondary">
        {/* O vídeo aparece com um fade assim que começa a tocar; até lá o fundo escuro do hero fica visível. */}
        <video
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
          src="/videos/hero-background.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setVideoReady(true)}
          onPlaying={() => setVideoReady(true)}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="container mx-auto px-4 relative z-10 pt-28 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-bold uppercase leading-[1] text-white mb-6">
              Treine com quem importa.
              <br />
              <span className="text-primary">Evolua com quem acompanha.</span>
            </h1>
            <p className="text-lg text-white/80 max-w-lg mb-8">
              Treine e evolua junto com os amigos, e tenha o acompanhamento do seu profissional — tudo em um só lugar.
            </p>
            <div className="flex flex-col items-start sm:flex-row gap-3 mb-8">
              <Button variant="hero" className="h-10 px-5 text-sm" onClick={() => navigate("/register/student")}>
                Fazer cadastro
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
            Treinar junto motiva mais.
          </h2>
          <p className="opacity-90 max-w-xl mx-auto mb-8">
            Crie desafios com os amigos, participe de eventos e convide quem você quiser por link.
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { icon: Flame, label: "Desafios" },
              { icon: CalendarHeart, label: "Eventos" },
              { icon: Link2, label: "Convite por link" },
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
                  { icon: TrendingUp, label: "Evolução" },
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
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">Mais do que uma agenda. Sua operação fitness.</h2>
              <p className="opacity-80 mb-8 max-w-md">
                Carteira de clientes, agenda, planos de treino, eventos e financeiro — organizados em um só painel.
              </p>
              <Button variant="hero" size="lg" onClick={() => navigate("/register/trainer")}>
                Quero ser profissional no MyJourn
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Users, label: "Carteira de clientes" },
                { icon: CalendarCheck, label: "Agenda" },
                { icon: CalendarHeart, label: "Eventos" },
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
          <h2 className="text-3xl sm:text-5xl font-bold mb-4">É mais que treino.<br />É a sua jornada.</h2>
          <p className="text-muted-foreground mb-8">Comece a organizar sua jornada hoje.</p>
          <div className="flex flex-col items-center sm:flex-row gap-3 justify-center">
            <Button variant="hero" className="h-10 px-5 text-sm" onClick={() => navigate("/register/student")}>
              Fazer cadastro
            </Button>
            <Button variant="outline" className="h-10 px-5 text-sm" onClick={() => navigate("/register/trainer")}>
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
              <img src={logo} alt="MyJourn" className="h-6 w-auto object-contain" />
              <span className="hidden sm:inline">— Treine com quem importa.</span>
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
