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
  Calendar,
  History,
  DollarSign,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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

  const goToTab = (tab: string) => {
    if (user?.userType === "trainer") {
      goTo(`/dashboard/trainer?tab=${tab}`);
    } else {
      goTo(`/dashboard/student?tab=${tab}`);
    }
  };

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
              FitConnect
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

        <nav className="flex-1 flex flex-col gap-1 py-4">
          <Button variant="ghost" className="justify-start gap-3" onClick={() => goTo("/")}>
            <Home className="h-4 w-4" />
            Início
          </Button>
          <Button variant="ghost" className="justify-start gap-3" onClick={() => goTo("/trainers")}>
            <Search className="h-4 w-4" />
            Encontrar Personal
          </Button>

          {isAuthenticated && user?.userType === "trainer" && (
            <>
              <div className="mt-4 mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Painel do Professor
              </div>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("profile")}>
                <User className="h-4 w-4" />
                Perfil
              </Button>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("schedule")}>
                <Calendar className="h-4 w-4" />
                Agenda
              </Button>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("pricing")}>
                <DollarSign className="h-4 w-4" />
                Preços
              </Button>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("classes")}>
                <BookOpen className="h-4 w-4" />
                Aulas
              </Button>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("earnings")}>
                <TrendingUp className="h-4 w-4" />
                Faturamento
              </Button>
            </>
          )}

          {isAuthenticated && user?.userType === "student" && (
            <>
              <div className="mt-4 mb-1 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Painel do Aluno
              </div>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("bookings")}>
                <Calendar className="h-4 w-4" />
                Meus Agendamentos
              </Button>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("history")}>
                <History className="h-4 w-4" />
                Histórico
              </Button>
              <Button variant="ghost" className="justify-start gap-3" onClick={() => goToTab("profile")}>
                <User className="h-4 w-4" />
                Perfil
              </Button>
            </>
          )}
        </nav>

        <div className="border-t border-border pt-4">
          {isAuthenticated ? (
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
          ) : (
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
