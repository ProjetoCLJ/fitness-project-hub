import { useState } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
    { label: "Profissionais", icon: Search, path: "/trainers" },
    { label: "Desafios", icon: Trophy, path: "/dashboard/student/challenges" },
    { label: "Eventos", icon: CalendarHeart, path: "/eventos" },
  ];

  // O profissional também é atleta: seção própria com as abas de aluno (Desafios e Eventos já estão na seção profissional).
  const athleteLinksForTrainer = [
    { label: "Início", icon: Home, path: "/dashboard/student" },
    { label: "Treinos", icon: Dumbbell, path: "/dashboard/student/workouts" },
    { label: "Ligas", icon: Medal, path: "/dashboard/student/leagues" },
    { label: "Encontrar profissional", icon: Search, path: "/trainers" },
  ];

  const trainerLinks = [
    { label: "Início", icon: Home, path: "/dashboard/trainer" },
    { label: "Clientes", icon: Users, path: "/dashboard/trainer/clients" },
    { label: "Agenda", icon: CalendarDays, path: "/dashboard/trainer/agenda" },
    { label: "Financeiro", icon: Wallet, path: "/dashboard/trainer/financial" },
    { label: "Desafios", icon: Trophy, path: "/dashboard/trainer/challenges" },
    { label: "Eventos", icon: CalendarHeart, path: "/eventos" },
  ];

  const isTrainer = user?.userType === "trainer";
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
              {isTrainer && (
                <Button variant="ghost" className="justify-start gap-3 w-full" onClick={() => goTo("/dashboard/trainer/profile")}>
                  <User className="h-4 w-4" />
                  Perfil profissional
                </Button>
              )}
              <Button
                variant="ghost"
                className="justify-start gap-3 w-full"
                onClick={() => goTo("/dashboard/student/profile")}
              >
                <User className="h-4 w-4" />
                {isTrainer ? "Perfil de atleta" : "Perfil"}
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
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goTo("/trainers")}>
                <Search className="h-4 w-4" />
                Encontrar Personal
              </Button>
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
