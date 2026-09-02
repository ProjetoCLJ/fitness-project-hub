import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { LoginDialog } from "@/components/LoginDialog";
import { PhoneFrame } from "@/components/landing/PhoneFrame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Apple,
  Target,
  TrendingUp as StrategyIcon,
  ShieldAlert,
  History,
  ClipboardList,
  Smartphone,
  MessageCircle,
  FileSpreadsheet,
  UserCog,
  CalendarClock,
  Plane,
  ArrowRight,
  Search,
  MapPin,
  Star,
  Users,
  CalendarCheck,
  Check,
  Trophy,
  Flame,
  Award,
  Wallet,
  TrendingUp,
  Clock,
  Ban,
  Sparkles,
  Lock,
  ShieldCheck,
} from "lucide-react";

const problemItems = [
  { icon: Smartphone, text: "Treino salvo em um aplicativo" },
  { icon: MessageCircle, text: "Dieta enviada pelo WhatsApp" },
  { icon: FileSpreadsheet, text: "Histórico em planilhas" },
  { icon: UserCog, text: "Personal com suas informações em um sistema" },
  { icon: Apple, text: "Nutricionista com outras informações" },
  { icon: CalendarClock, text: "Agenda separada" },
];

const meuPlanoItems = [
  { icon: Target, label: "Objetivos" },
  { icon: StrategyIcon, label: "Estratégia atual" },
  { icon: Dumbbell, label: "Treinos" },
  { icon: Apple, label: "Nutrição" },
  { icon: ShieldAlert, label: "Restrições" },
  { icon: Users, label: "Profissionais vinculados" },
  { icon: History, label: "Histórico" },
];

const howItWorks = [
  { step: "01", title: "Crie seu perfil" },
  { step: "02", title: "Organize seu plano" },
  { step: "03", title: "Conecte-se aos profissionais" },
  { step: "04", title: "Acompanhe sua evolução" },
];

const differentiators = [
  "Plano centralizado",
  "Histórico",
  "Treinos",
  "Nutrição",
  "Profissionais",
  "Agendamento",
  "Permissões",
  "Evolução",
  "Gamificação",
];

const Index = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header onLoginClick={() => setLoginOpen(true)} />

      {/* 1. HERO */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] bg-gradient-hero opacity-[0.07] rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left space-y-6">
              <Badge variant="secondary" className="inline-flex">Plataforma de jornada fitness</Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Seu fitness.{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">Organizado</span>
                {" "}em um só lugar.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Tenha seu plano, treinos, nutrição e evolução organizados em uma única plataforma —
                e conecte-se aos profissionais que acompanham sua jornada.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button variant="hero" size="lg" onClick={() => navigate("/register/student")}>
                  Quero conhecer o FIT
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/register/trainer")}>
                  Sou profissional
                </Button>
              </div>
            </div>
            <PhoneFrame label="Início">
              <div className="rounded-xl bg-gradient-hero p-4 text-primary-foreground">
                <p className="text-xs opacity-80">Olá, Maria!</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div><p className="text-lg font-bold">1850</p><p className="text-[10px] opacity-80">FIT Score</p></div>
                  <div><p className="text-lg font-bold">#18</p><p className="text-[10px] opacity-80">Ranking</p></div>
                  <div><p className="text-lg font-bold">6</p><p className="text-[10px] opacity-80">Dias seguidos</p></div>
                </div>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Próximo treino</p>
                <p className="text-sm font-semibold">Treino B — Superiores</p>
                <p className="text-xs text-muted-foreground">Hoje, 18:00 · Carlos Silva</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Progresso do plano</p>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full w-3/5 bg-primary rounded-full" /></div>
              </div>
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* 2. PROBLEMA */}
      <section className="py-16 sm:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold">Sua jornada fitness está espalhada.</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
            {problemItems.map((item) => (
              <Card key={item.text} className="p-4 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </Card>
            ))}
          </div>
          <p className="text-center text-lg sm:text-xl font-medium max-w-2xl mx-auto">
            "Quando diferentes profissionais acompanham você, suas informações não deveriam ficar separadas."
          </p>
        </div>
      </section>

      {/* 3. SOLUÇÃO */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Uma única jornada. Diferentes profissionais.</h2>
            <p className="text-muted-foreground">O FIT coloca o cliente no centro de tudo.</p>
          </div>
          <div className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
            <Card className="px-6 py-4 bg-gradient-hero text-primary-foreground font-semibold">Cliente</Card>
            <div className="h-8 w-px bg-border" />
            <Card className="p-6 w-full">
              <p className="font-semibold mb-4 text-center">Meu Plano</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {meuPlanoItems.slice(1).map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1 text-center">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Badge variant="outline" className="px-4 py-2">Personal Trainer</Badge>
              <Badge variant="outline" className="px-4 py-2">Nutricionista</Badge>
              <Badge variant="outline" className="px-4 py-2 text-muted-foreground">Outros profissionais, em breve</Badge>
            </div>
          </div>
          <p className="text-center text-lg font-medium mt-10 max-w-xl mx-auto">
            "Seu histórico acompanha você — não importa qual profissional esteja te atendendo."
          </p>
        </div>
      </section>

      {/* 4. MEU PLANO */}
      <section className="py-16 sm:py-24 bg-surface">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <PhoneFrame label="Meu Plano" className="lg:order-2">
              {meuPlanoItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </PhoneFrame>
            <div className="lg:order-1 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">Seu plano, de verdade.</h2>
              <p className="text-muted-foreground">
                O FIT reúne as informações que fazem parte da sua jornada para que você entenda não apenas
                o que precisa fazer, mas também qual estratégia está sendo seguida.
              </p>
              <ul className="space-y-2">
                {meuPlanoItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TREINOS */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">Treine sabendo exatamente o que fazer.</h2>
              <p className="text-muted-foreground">Registre seus treinos e acompanhe sua evolução ao longo do tempo.</p>
              <div className="flex flex-wrap gap-2">
                {["Treino da semana", "Exercícios", "Séries", "Repetições", "Cargas", "Descanso", "Progressões", "Histórico"].map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
            <PhoneFrame label="Treino B">
              <div className="rounded-xl bg-gradient-hero p-4 text-primary-foreground">
                <p className="text-sm font-semibold">Supino reto</p>
                <p className="text-xs opacity-80">4x8-10 · 50kg · descanso 90s</p>
              </div>
              {["Série 1", "Série 2", "Série 3"].map((s, i) => (
                <div key={s} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${i < 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                  <span className="text-muted-foreground">50kg · 10 reps</span>
                  {i < 2 ? <Check className="h-4 w-4 text-primary" /> : <span className="text-xs text-muted-foreground">pendente</span>}
                </div>
              ))}
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* 6. NUTRIÇÃO */}
      <section className="py-16 sm:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <PhoneFrame label="Nutrição" className="lg:order-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Estratégia nutricional</p>
                <p className="text-sm font-medium">Reeducação alimentar com déficit calórico moderado</p>
              </div>
              {["Café da manhã · 07:00", "Almoço · 12:30", "Lanche · 16:00", "Jantar · 20:00"].map((meal) => (
                <div key={meal} className="flex items-center gap-2 text-sm rounded-lg border border-border p-2.5">
                  <Apple className="h-4 w-4 text-primary" />
                  {meal}
                </div>
              ))}
            </PhoneFrame>
            <div className="lg:order-1 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">Treinamento e nutrição conectados.</h2>
              <p className="text-muted-foreground">Seu planejamento de treinamento e nutrição fazem parte da mesma jornada.</p>
              <div className="flex flex-wrap gap-2">
                {["Plano alimentar", "Refeições", "Horários", "Restrições", "Objetivos"].map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic">
                O FIT organiza as informações definidas pelos profissionais e não substitui o acompanhamento profissional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PROFISSIONAIS */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Encontre o profissional certo para sua jornada.</h2>
            <p className="text-muted-foreground">Precisa de um profissional? Encontre, conheça e agende diretamente pelo FIT.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-center">
            <div className="space-y-3">
              {[
                { name: "Carlos Silva", spec: "Personal Trainer · Hipertrofia", rating: 4.8 },
                { name: "Maria Santos", spec: "Nutricionista · Emagrecimento", rating: 4.9 },
              ].map((pro) => (
                <Card key={pro.name} className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
                    {pro.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{pro.name}</p>
                    <p className="text-xs text-muted-foreground">{pro.spec}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    {pro.rating}
                  </div>
                </Card>
              ))}
              <Card className="p-4 flex items-center gap-3 text-muted-foreground">
                <Search className="h-5 w-5" />
                <span className="text-sm">Buscar por especialidade, avaliação, localização e preço...</span>
              </Card>
            </div>
            <Card className="p-6 bg-secondary text-secondary-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Plane className="h-5 w-5" />
                <p className="font-semibold">Está viajando?</p>
              </div>
              <p className="text-sm opacity-90">
                Encontre um profissional disponível na cidade onde você está e continue seu planejamento.
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm opacity-90">
                <MapPin className="h-4 w-4" />
                Busca por localização
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 8. CONTINUIDADE */}
      <section className="py-16 sm:py-24 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Seu plano não para quando você troca de profissional.</h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto mb-10">
            {["Aluno", "Personal atual", "Viagem", "Novo Personal", "Continuidade"].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-3">
                <Badge variant="secondary" className="px-4 py-2 text-sm">{step}</Badge>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 opacity-70" />}
              </div>
            ))}
          </div>
          <div className="max-w-xl mx-auto text-center space-y-3">
            <p className="text-lg">
              "Em vez de começar do zero, o profissional autorizado pode entender o contexto da sua jornada e dar continuidade ao planejamento."
            </p>
            <p className="font-semibold flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              Você controla o que cada profissional pode acessar.
            </p>
          </div>
        </div>
      </section>

      {/* 9. AGENDA E AGENDAMENTO */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Agende quando fizer sentido para você.</h2>
            <p className="text-muted-foreground">
              O FIT cruza a disponibilidade do cliente e do profissional para encontrar horários compatíveis.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
            {["Escolha o profissional", "Escolha a data", "Veja horários disponíveis", "Envie a proposta", "Profissional confirma", "Atendimento agendado"].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-3">
                <Card className="px-4 py-3 text-sm font-medium">{step}</Card>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. GAMIFICAÇÃO */}
      <section className="py-16 sm:py-24 bg-surface">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold">Consistência também merece reconhecimento.</h2>
              <p className="text-muted-foreground">
                Você ganha pontos principalmente pela aderência ao planejamento definido pelo seu profissional.
              </p>
              <Card className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Plano: 4 treinos na semana</p>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  4 treinos realizados → pontuação completa
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Ban className="h-4 w-4" />
                  3 treinos realizados → pontuação correspondente à execução
                </div>
              </Card>
              <p className="font-semibold">Mais do que treinar mais. Treinar com consistência.</p>
            </div>
            <PhoneFrame label="Desafios">
              <div className="rounded-xl bg-gradient-hero p-4 text-primary-foreground flex items-center justify-between">
                <div className="flex items-center gap-2"><Trophy className="h-5 w-5" /><span className="font-semibold text-sm">FIT Score</span></div>
                <span className="text-xl font-bold">1850</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[{ icon: Award, label: "Nível" }, { icon: TrendingUp, label: "Ranking" }, { icon: Flame, label: "Desafios" }].map((m) => (
                  <div key={m.label} className="rounded-lg border border-border p-2.5">
                    <m.icon className="h-4 w-4 text-primary mx-auto mb-1" />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* 11-13. PARA PROFISSIONAIS */}
      <section className="py-16 sm:py-24 bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 space-y-20">
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">Mais do que uma agenda. Sua operação fitness.</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto">
              {[
                { icon: Users, label: "Carteira de clientes" },
                { icon: CalendarCheck, label: "Agenda" },
                { icon: ClipboardList, label: "Planos dos clientes" },
                { icon: Search, label: "Marketplace" },
                { icon: Wallet, label: "Financeiro" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 text-center bg-secondary-foreground/5 rounded-xl p-4">
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl font-bold">Transforme horários vazios em oportunidades.</h3>
              <p className="opacity-90">
                Você define horários disponíveis, horários bloqueados e atendimentos. O FIT usa essas
                informações para mostrar horários disponíveis aos clientes.
              </p>
            </div>
            <Card className="p-5 bg-secondary-foreground/5 border-secondary-foreground/10">
              {["08:00 - 09:00 · Disponível", "09:00 - 10:00 · Bloqueado", "14:00 - 15:00 · Reservado"].map((slot) => (
                <div key={slot} className="flex items-center gap-2 py-2 text-sm border-b border-secondary-foreground/10 last:border-0">
                  <Clock className="h-4 w-4 shrink-0" />
                  {slot}
                </div>
              ))}
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Card className="p-6 bg-secondary-foreground/5 border-secondary-foreground/10 lg:order-2">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-xs opacity-70">Faturamento atual</p><p className="text-xl font-bold">R$ 5.200/mês</p></div>
                <div><p className="text-xs opacity-70">Horários disponíveis</p><p className="text-xl font-bold">24h</p></div>
                <div><p className="text-xs opacity-70">Potencial adicional</p><p className="text-xl font-bold">R$ 2.400/mês</p></div>
                <div><p className="text-xs opacity-70">Potencial total</p><p className="text-xl font-bold">R$ 7.600/mês</p></div>
              </div>
              <p className="text-xs opacity-70">*Estimativa com base na sua agenda — não é faturamento garantido.</p>
            </Card>
            <div className="lg:order-1 space-y-3">
              <h3 className="text-2xl sm:text-3xl font-bold">Veja quanto sua agenda está valendo.</h3>
              <p className="opacity-90">Entenda quanto você fatura hoje e quanto sua agenda ainda pode gerar.</p>
              <Button variant="secondary" size="lg" onClick={() => navigate("/register/trainer")}>
                Quero ser profissional FIT
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 14. COMO FUNCIONA */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center space-y-2">
                <span className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">{item.step}</span>
                <p className="font-medium">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 15. DIFERENCIAL */}
      <section className="py-16 sm:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Não é só mais um app de treino.</h2>
          </div>
          <div className="grid sm:grid-cols-4 gap-4 max-w-4xl mx-auto mb-10">
            {[
              { label: "Aplicativo tradicional", value: "\"Treino\"" },
              { label: "Marketplace", value: "\"Encontre um profissional\"" },
              { label: "Agenda", value: "\"Marque uma aula\"" },
            ].map((c) => (
              <Card key={c.label} className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                <p className="font-medium text-sm">{c.value}</p>
              </Card>
            ))}
            <Card className="p-4 text-center bg-gradient-hero text-primary-foreground">
              <p className="text-xs opacity-80 mb-1">FIT</p>
              <p className="font-semibold text-sm">"Organize sua jornada inteira."</p>
            </Card>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {differentiators.map((d) => (
              <Badge key={d} variant="secondary" className="px-3 py-1.5">
                <Check className="h-3.5 w-3.5 mr-1.5 text-primary" />
                {d}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* 16. PRIVACIDADE E CONTROLE */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-primary" />
                Seus dados. Seu controle.
              </h2>
              <p className="text-muted-foreground">
                O cliente decide quais informações compartilhar e com quais profissionais.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="font-semibold text-sm mb-3">Personal Trainer</p>
                {["Objetivos", "Treinos", "Histórico", "Restrições físicas"].map((p) => (
                  <div key={p} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {p}
                  </div>
                ))}
              </Card>
              <Card className="p-4">
                <p className="font-semibold text-sm mb-3">Nutricionista</p>
                {["Objetivos", "Nutrição", "Restrições alimentares"].map((p) => (
                  <div key={p} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {p}
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 17. CTA FINAL */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto text-center space-y-6 p-10 sm:p-14 bg-gradient-hero text-primary-foreground shadow-strong border-0">
            <Sparkles className="h-8 w-8 mx-auto opacity-90" />
            <h2 className="text-3xl sm:text-4xl font-bold">Comece a organizar sua jornada.</h2>
            <p className="opacity-90 max-w-md mx-auto">Seu plano, seus profissionais e sua evolução em um só lugar.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" size="lg" onClick={() => navigate("/register/student")}>
                Quero conhecer o FIT
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => navigate("/register/trainer")}
              >
                Sou profissional
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 18. FOOTER */}
      <footer className="bg-secondary text-secondary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-gradient-primary rounded-lg">
                  <Dumbbell className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">FIT</span>
              </div>
              <p className="text-sm opacity-80 max-w-xs">Seu fitness. Organizado em um só lugar.</p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm opacity-80">
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
