import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dumbbell, User, LogOut, Calendar, History, DollarSign, BookOpen, TrendingUp, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SideMenu } from "@/components/SideMenu";

interface HeaderProps {
  onLoginClick: () => void;
}

export const Header = ({ onLoginClick }: HeaderProps) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleMenuClick = (tab: string) => {
    if (user?.userType === "trainer") {
      navigate(`/dashboard/trainer?tab=${tab}`);
    } else {
      navigate(`/dashboard/student?tab=${tab}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <SideMenu onLoginClick={onLoginClick} />
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-soft group-hover:shadow-medium transition-smooth">
                <Dumbbell className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                FitConnect
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground/80 hover:text-foreground transition-smooth">
              Início
            </Link>
            <Link to="/trainers" className="text-foreground/80 hover:text-foreground transition-smooth">
              Encontrar Personal
            </Link>
          </nav>

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.profile.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                      {user.profile.fullName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.profile.fullName}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user.userType === "trainer" ? (
                  <>
                    <DropdownMenuItem onClick={() => handleMenuClick("profile")}>
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick("schedule")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Agenda
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick("pricing")}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Preços
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick("classes")}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Aulas
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick("earnings")}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Faturamento
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => handleMenuClick("bookings")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Meus Agendamentos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick("history")}>
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick("profile")}>
                      <User className="h-4 w-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={onLoginClick} variant="hero" size="lg">
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
