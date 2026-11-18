import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Dumbbell, Home, Inbox, Medal, Menu, Trophy, User, Users, Wallet, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorkout } from "@/lib/activeWorkout";
import { useRequestsBadge } from "@/lib/useRequestsBadge";
import { isStandalone } from "@/lib/pwa";

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Sem path: abre as opções flutuantes (Perfil/Solicitações para o aluno, "Outros" para o profissional). */
  path?: string;
  match: (pathname: string) => boolean;
  badge?: number;
}

interface Option {
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

const starts = (...prefixes: string[]) => (p: string) => prefixes.some((x) => p.startsWith(x));

/** Rola para baixo: a barra encolhe e desce um pouco; volta ao rolar para cima ou ao tocar nela (como o Instagram). */
const useScrollCompact = (pathname: string) => {
  const [compact, setCompact] = useState(false);
  const last = useRef(0);
  const acc = useRef(0);

  useEffect(() => {
    setCompact(false);
    acc.current = 0;
    last.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    last.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last.current;
      last.current = y;
      if (y <= 8) {
        acc.current = 0;
        setCompact(false);
        return;
      }
      if ((dy > 0 && acc.current < 0) || (dy < 0 && acc.current > 0)) acc.current = 0;
      acc.current += dy;
      if (acc.current > 14) setCompact(true);
      else if (acc.current < -10) setCompact(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return [compact, setCompact] as const;
};

/**
 * Menu inferior do app (aluno e profissional). Telas com barra própria no rodapé (treino em andamento) não mostram o menu.
 */
export const BottomNav = () => {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = useActiveWorkout();
  const pending = useRequestsBadge();
  // O menu inferior é só do app instalado (PWA); no site fica o menu lateral.
  const [standalone] = useState(isStandalone);
  const [compact, setCompact] = useScrollCompact(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const training = !!active && active.pausedAt === null;
  const inSession = pathname.includes("/session/");
  const visible = standalone && isAuthenticated && !!user && !user.needsSetup && pathname.startsWith("/dashboard") && !inSession && !training;
  // Espaço no fim das telas para o conteúdo não ficar atrás do menu.
  useEffect(() => {
    if (!visible) return;
    document.body.style.paddingBottom = "calc(3rem + env(safe-area-inset-bottom))";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [visible]);

  if (!visible || !user) return null;

  const isTrainer = user.userType === "trainer";

  const items: NavItem[] = isTrainer
    ? [
        { key: "home", label: "Início", icon: Home, path: "/dashboard/trainer", match: (p) => p === "/dashboard/trainer" },
        { key: "clients", label: "Clientes", icon: Users, path: "/dashboard/trainer/clients", match: starts("/dashboard/trainer/clients") },
        { key: "agenda", label: "Agenda", icon: CalendarDays, path: "/dashboard/trainer/agenda", match: starts("/dashboard/trainer/agenda") },
        { key: "finance", label: "Financeiro", icon: Wallet, path: "/dashboard/trainer/financial", match: starts("/dashboard/trainer/financial") },
        { key: "requests", label: "Solicitações", icon: Inbox, path: "/dashboard/trainer/requests", match: starts("/dashboard/trainer/requests"), badge: pending },
        {
          key: "more",
          label: "Outros",
          icon: Menu,
          match: starts("/dashboard/student", "/dashboard/trainer/challenges"),
        },
      ]
    : [
        { key: "home", label: "Início", icon: Home, path: "/dashboard/student", match: (p) => p === "/dashboard/student" },
        { key: "challenges", label: "Desafios", icon: Trophy, path: "/dashboard/student/challenges", match: starts("/dashboard/student/challenges") },
        { key: "workouts", label: "Treinos", icon: Dumbbell, path: "/dashboard/student/workouts", match: starts("/dashboard/student/workouts", "/dashboard/student/plan") },
        { key: "leagues", label: "Ligas", icon: Medal, path: "/dashboard/student/leagues", match: starts("/dashboard/student/leagues") },
        {
          key: "profile",
          label: "Perfil",
          icon: User,
          match: starts("/dashboard/student/profile", "/dashboard/student/requests", "/dashboard/student/library"),
          badge: pending,
        },
      ];

  // Opções flutuantes (de cima para baixo na tela; a última fica mais perto do botão).
  const options: Option[] = isTrainer
    ? [
        { label: "Meu Treino", icon: Dumbbell, path: "/dashboard/student/workouts" },
        { label: "Minha Liga", icon: Medal, path: "/dashboard/student/leagues" },
        { label: "Desafios", icon: Trophy, path: "/dashboard/trainer/challenges" },
        { label: "Perfil", icon: User, path: "/dashboard/student/profile" },
      ]
    : [
        { label: "Solicitações", icon: Inbox, path: "/dashboard/student/requests", badge: pending },
        { label: "Perfil", icon: User, path: "/dashboard/student/profile" },
      ];

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const onItem = (item: NavItem) => {
    setCompact(false);
    if (item.path) {
      setMenuOpen(false);
      navigate(item.path);
    } else {
      setMenuOpen((open) => !open);
    }
  };

  const narrow = items.length > 5;

  return (
    <>
      {/* Escurece o resto da tela enquanto as opções estão abertas. */}
      {menuOpen && <div className="fixed inset-0 z-[55] bg-black/45 animate-in fade-in duration-200" onClick={() => setMenuOpen(false)} aria-hidden />}

      {menuOpen && (
        <div
          className="fixed right-4 z-[60] flex flex-col items-end gap-3"
          style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
          role="menu"
        >
          {options.map((option, i) => (
            <button
              key={option.label}
              type="button"
              role="menuitem"
              onClick={() => go(option.path)}
              className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 fill-mode-both"
              style={{ animationDelay: `${(options.length - 1 - i) * 40}ms` }}
            >
              <span className="rounded-full bg-background px-3 py-1.5 text-sm font-medium shadow-md border">{option.label}</span>
              <span className="relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
                <option.icon className="h-5 w-5" />
                {!!option.badge && option.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full bg-destructive px-1 text-[10px] font-semibold leading-[1.1rem] text-destructive-foreground text-center">
                    {option.badge > 9 ? "9+" : option.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 flex justify-center pointer-events-none"
        // Abaixo dos modais; com as opções abertas, sobe acima do escurecimento para ficar em destaque.
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))", zIndex: menuOpen ? 60 : 40 }}
      >
        <div
          onPointerDown={() => setCompact(false)}
          className="pointer-events-auto w-[calc(100%-1.5rem)] max-w-lg origin-bottom rounded-3xl border bg-background/90 backdrop-blur-lg shadow-strong px-1.5 py-1 flex items-stretch justify-between transition-all duration-300 ease-out"
          style={{ transform: compact && !menuOpen ? "translateY(0.55rem) scale(0.88)" : "translateY(0) scale(1)" }}
        >
          {items.map((item) => {
            const current = item.path ? item.match(pathname) : menuOpen || item.match(pathname);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onItem(item)}
                aria-label={item.label}
                aria-current={current ? "page" : undefined}
                aria-expanded={item.path ? undefined : menuOpen}
                className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 transition-colors ${
                  current ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative">
                  <item.icon className={`h-6 w-6 ${current ? "stroke-[2.4]" : ""}`} />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[1rem] h-4 rounded-full bg-destructive px-1 text-[9px] font-semibold leading-4 text-destructive-foreground text-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={`block max-w-full truncate leading-none tracking-tight transition-all duration-300 ${narrow ? "text-[9px]" : "text-[10px]"} ${
                    current ? "font-semibold" : "font-medium"
                  } ${compact && !menuOpen ? "max-h-0 opacity-0" : "max-h-3 opacity-100"}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
