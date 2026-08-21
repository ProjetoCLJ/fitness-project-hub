import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dumbbell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SideMenu } from "@/components/SideMenu";

interface HeaderProps {
  onLoginClick: () => void;
}

export const Header = ({ onLoginClick }: HeaderProps) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const profilePath = user?.userType === "trainer" ? "/dashboard/trainer/profile" : "/dashboard/student/profile";

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
                FIT
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
            <Button variant="ghost" className="gap-2" onClick={() => navigate(profilePath)}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profile.profileImageUrl} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                  {user.profile.fullName.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{user.profile.fullName}</span>
            </Button>
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
