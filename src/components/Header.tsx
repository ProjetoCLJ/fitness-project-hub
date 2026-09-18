import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SideMenu } from "@/components/SideMenu";
import logo from "@/assets/logo/logo-header.png";

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
          : "bg-secondary/95 backdrop-blur-lg border-b-2 border-primary/10 shadow-soft"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="justify-self-start">
            <SideMenu onLoginClick={onLoginClick} triggerClassName="text-white hover:bg-white/10" />
          </div>

          <Link to="/" className="flex items-center group justify-self-center">
            <img
              src={logo}
              alt="MyJourn"
              className="h-7 sm:h-8 w-auto object-contain"
            />
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
