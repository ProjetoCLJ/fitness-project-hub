import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SideMenu } from "@/components/SideMenu";

interface HeaderProps {
  onLoginClick: () => void;
}

export const Header = ({ onLoginClick }: HeaderProps) => {
  const { isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-b-2 border-primary/10 shadow-soft">
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <SideMenu onLoginClick={onLoginClick} />
          </div>

          <Link to="/" className="flex items-center gap-2 group justify-self-center">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-soft group-hover:shadow-medium transition-smooth">
              <Dumbbell className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              FIT
            </span>
          </Link>

          <div className="justify-self-end">
            {!isAuthenticated && (
              <Button onClick={onLoginClick} variant="hero" size="lg">
                Entrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
