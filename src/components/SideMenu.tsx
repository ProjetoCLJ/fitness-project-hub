import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo/logo-header.png";
import {
  Menu,
  Dumbbell,
  Home,
  Search,
  User,
  LogOut,
  Trophy,
  Users,
  CalendarDays,
  Wallet,
  CalendarHeart,
  Medal,
  Inbox,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FEATURES } from "@/lib/features";
import { fetchWorkoutRequests } from "@/lib/workoutRequests";
import { fetchRequestsForStudent, fetchRequestsForTrainer } from "@/lib/requestsStore";

interface SideMenuProps {
  onLoginClick: () => void;
  triggerClassName?: string;
}

export const SideMenu = ({ onLoginClick, triggerClassName }: SideMenuProps) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  // Biblioteca temporariamente oculta do menu (página segue disponível em /dashboard/student/library).
  const clientLinks = [
    { label: "Início", icon: Home, path: "/dashboard/student" },
    { label: "Treinos", icon: Dumbbell, path: "/dashboard/student/workouts" },
    { label: "Ligas", icon: Medal, path: "/dashboard/student/leagues" },
    ...(FEATURES.professionalSearch ? [{ label: "Profissionais", icon: Search, path: "/trainers" }] : []),
    { label: "Desafios", icon: Trophy, path: "/dashboard/student/challenges" },
    ...(FEATURES.events ? [{ label: "Eventos", icon: CalendarHeart, path: "/eventos" }] : []),
    { label: "Solicitações", icon: Inbox, path: "/dashboard/student/requests" },
  ];

  // O profissional também é atleta: seção própria com as abas de aluno (Desafios e Eventos já estão na seção profissional).
  const athleteLinksForTrainer = [
    { label: "Treinos", icon: Dumbbell, path: "/dashboard/student/workouts" },
    { label: "Ligas", icon: Medal, path: "/dashboard/student/leagues" },
    ...(FEATURES.professionalSearch ? [{ label: "Encontrar profissional", icon: Search, path: "/trainers" }] : []),
  ];

  const trainerLinks = [
    { label: "Início", icon: Home, path: "/dashboard/trainer" },
    { label: "Clientes", icon: Users, path: "/dashboard/trainer/clients" },
    { label: "Agenda", icon: CalendarDays, path: "/dashboard/trainer/agenda" },
    { label: "Financeiro", icon: Wallet, path: "/dashboard/trainer/financial" },
    { label: "Desafios", icon: Trophy, path: "/dashboard/trainer/challenges" },
    { label: "Solicitações", icon: Inbox, path: "/dashboard/trainer/requests" },
    ...(FEATURES.events ? [{ label: "Eventos", icon: CalendarHeart, path: "/eventos" }] : []),
  ];

  const isTrainer = user?.userType === "trainer";

  // Solicitações aguardando a minha resposta (só consulta quando o menu abre).
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["requests-badge", user?.id, open],
    enabled: !!user && open,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return 0;
      const [workout, asTrainer, asStudent] = await Promise.all([
        fetchWorkoutRequests().catch(() => []),
        user.trainerId ? fetchRequestsForTrainer(user.trainerId).catch(() => []) : Promise.resolve([]),
        fetchRequestsForStudent(user.studentId).catch(() => []),
      ]);
      const mine = workout.filter((r) => r.status === "pending" && r.requestedBy !== (user.trainerId && r.trainerId === user.trainerId ? "trainer" : "student"));
      return mine.length + asTrainer.length + asStudent.length;
    },
  });
  const links = isTrainer ? trainerLinks : clientLinks;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu" className={triggerClassName}>
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 flex flex-col p-0">
        <SheetHeader className="text-left bg-secondary px-6 py-4">
          <SheetTitle>
            <img src={logo} alt="MyJourn" className="h-7 w-auto object-contain" />
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col px-6 pb-6">

        {isAuthenticated && user ? (
          <>
            <nav className="flex-1 flex flex-col gap-1 py-4 overflow-y-auto">
              {isTrainer && <p className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profissional</p>}
              {links.map((link) => (
                <Button
                  key={link.path}
                  variant="ghost"
                  className="justify-start gap-3"
                  onClick={() => goTo(link.path)}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.label === "Solicitações" && pendingCount > 0 && (
                    <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] leading-4 text-destructive-foreground">{pendingCount}</span>
                  )}
                </Button>
              ))}
              {isTrainer && (
                <>
                  <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meus treinos</p>
                  {athleteLinksForTrainer.map((link) => (
                    <Button
                      key={link.path}
                      variant="ghost"
                      className="justify-start gap-3"
                      onClick={() => goTo(link.path)}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  ))}
                </>
              )}
            </nav>

            <div className="border-t border-border pt-4 space-y-1">
              <Button
                variant="ghost"
                className="justify-start gap-3 w-full"
                onClick={() => goTo("/dashboard/student/profile")}
              >
                <User className="h-4 w-4" />
                Perfil
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-3 w-full text-destructive hover:text-destructive"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </>
        ) : (
          <>
            <nav className="flex-1 flex flex-col gap-1 py-4">
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goTo("/")}>
                <Home className="h-4 w-4" />
                Início
              </Button>
              {FEATURES.professionalSearch && (
                <Button variant="ghost" className="justify-start gap-3" onClick={() => goTo("/trainers")}>
                  <Search className="h-4 w-4" />
                  Encontrar Personal
                </Button>
              )}
            </nav>
            <div className="border-t border-border pt-4">
              <Button
                variant="hero"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  onLoginClick();
                }}
              >
                Entrar
              </Button>
            </div>
          </>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
