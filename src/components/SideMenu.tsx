import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu,
  Dumbbell,
  Home,
  Search,
  User,
  LogOut,
  ClipboardList,
  Trophy,
  Users,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SideMenuProps {
  onLoginClick: () => void;
}

export const SideMenu = ({ onLoginClick }: SideMenuProps) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const clientLinks = [
    { label: "Início", icon: Home, path: "/dashboard/student" },
    { label: "Meu Plano", icon: ClipboardList, path: "/dashboard/student/plan" },
    { label: "Profissionais", icon: Search, path: "/trainers" },
    { label: "Desafios", icon: Trophy, path: "/dashboard/student/challenges" },
  ];

  const trainerLinks = [
    { label: "Início", icon: Home, path: "/dashboard/trainer" },
    { label: "Clientes", icon: Users, path: "/dashboard/trainer/clients" },
    { label: "Agenda", icon: CalendarDays, path: "/dashboard/trainer/agenda" },
    { label: "Financeiro", icon: Wallet, path: "/dashboard/trainer/financial" },
  ];

  const profilePath = user?.userType === "trainer" ? "/dashboard/trainer/profile" : "/dashboard/student/profile";
  const links = user?.userType === "trainer" ? trainerLinks : clientLinks;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-soft">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              FIT
            </span>
          </SheetTitle>
        </SheetHeader>

        {isAuthenticated && user && (
          <div className="flex items-center gap-3 py-4 border-b border-border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile.profileImageUrl} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {user.profile.fullName.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.profile.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}

        {isAuthenticated && user ? (
          <>
            <nav className="flex-1 flex flex-col gap-1 py-4">
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
            </nav>

            <div className="border-t border-border pt-4 space-y-1">
              <Button
                variant="ghost"
                className="justify-start gap-3 w-full"
                onClick={() => goTo(profilePath)}
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
      </SheetContent>
    </Sheet>
  );
};
