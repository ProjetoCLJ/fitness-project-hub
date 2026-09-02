import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SideMenu } from "@/components/SideMenu";

interface HeaderProps {
  onLoginClick: () => void;
  /** Quando true, o header nasce transparente (para ficar sobre um hero escuro) e vira sólido ao rolar. */
  transparentOnTop?: boolean;
}

export const Header = ({ onLoginClick, transparentOnTop = false }: HeaderProps) => {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(!transparentOnTop);

  useEffect(() => {
    if (!transparentOnTop) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparentOnTop]);

  const isTransparent = transparentOnTop && !scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-smooth ${
        isTransparent
          ? "bg-transparent border-b-2 border-transparent"
          : "bg-card/90 backdrop-blur-lg border-b-2 border-primary/10 shadow-soft"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <SideMenu onLoginClick={onLoginClick} triggerClassName={isTransparent ? "text-white hover:bg-white/10" : undefined} />
          </div>

          <Link to="/" className="flex items-center gap-2 group justify-self-center">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-soft group-hover:shadow-medium transition-smooth">
              <Dumbbell className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className={`text-lg sm:text-xl font-bold ${isTransparent ? "text-white" : "bg-gradient-hero bg-clip-text text-transparent"}`}>
              FIT
            </span>
          </Link>

          <div className="justify-self-end">
            {!isAuthenticated && (
              <Button
                onClick={onLoginClick}
                variant={isTransparent ? "secondary" : "hero"}
                size="lg"
              >
                Entrar
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
