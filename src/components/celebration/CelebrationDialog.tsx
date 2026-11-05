import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Raios de luz atrás da arte, com movimento: duas camadas girando em sentidos opostos e uma pulsação
 * que expande e contrai. O centro dos raios é o centro do contêiner (a arte deve estar centralizada nele).
 */
export const Rays = ({ color, opacity = 0.16, className = "" }: { color: string; opacity?: number; className?: string }) => (
  <div className={`absolute inset-0 mj-rays-pulse ${className}`} aria-hidden="true">
    <svg viewBox="-150 -150 300 300" className="absolute inset-0 h-full w-full mj-spin-slow">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0 L-20 -150 L20 -150 Z" transform={`rotate(${i * 30})`} fill={color} opacity={opacity} />
      ))}
    </svg>
    <svg viewBox="-150 -150 300 300" className="absolute inset-0 h-full w-full mj-spin-rev">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M0 0 L-12 -112 L12 -112 Z" transform={`rotate(${i * 30 + 15})`} fill={color} opacity={opacity * 0.9} />
      ))}
    </svg>
  </div>
);

export interface CelebrationProps {
  /** Cor dos raios (omitir = sem raios). */
  rays?: string;
  art: ReactNode;
  /** Largura da arte em px. */
  artSize?: number;
  banner?: { text: string; color: string };
  title: string;
  subtitle?: string;
  stats?: { value: string; label: string }[];
  cta: string;
  onCta: () => void;
  secondary?: { label: string; onClick: () => void };
  /** Barra de progresso de uma sequência (pós-treino). */
  progress?: { index: number; total: number };
  children?: ReactNode;
}

/** Tela cheia de comemoração: arte com raios, faixa, título, números e botão. */
export const Celebration = ({ rays, art, artSize = 128, banner, title, subtitle, stats, cta, onCta, secondary, progress, children }: CelebrationProps) => (
  <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] bg-background flex flex-col">
    {progress && (
      <div className="flex gap-1.5 px-4 pt-4 max-w-md w-full mx-auto">
        {Array.from({ length: progress.total }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= progress.index ? "bg-green-500" : "bg-muted"}`} />
        ))}
      </div>
    )}
    <div className="flex-1 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center text-center px-6 py-8 max-w-md mx-auto gap-3">
        <div className="relative flex items-center justify-center" style={{ width: artSize + 80, height: artSize + 80 }}>
          {rays && <Rays color={rays} />}
          <div className="relative mj-pop" style={{ width: artSize }}>
            {art}
          </div>
        </div>
        {banner && (
          <span className="mj-rise rounded-full px-4 py-1 text-sm font-semibold text-white" style={{ background: banner.color, animationDelay: "250ms" }}>
            {banner.text}
          </span>
        )}
        <h2 className="mj-rise text-2xl font-bold leading-tight" style={{ animationDelay: "350ms" }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mj-rise text-sm text-muted-foreground max-w-xs" style={{ animationDelay: "450ms" }}>
            {subtitle}
          </p>
        )}
        {stats && stats.length > 0 && (
          <div className="mj-rise flex gap-6 text-sm" style={{ animationDelay: "550ms" }}>
            {stats.map((s) => (
              <span key={s.label}>
                <strong className="text-lg">{s.value}</strong> <span className="text-muted-foreground">{s.label}</span>
              </span>
            ))}
          </div>
        )}
        {children && <div className="w-full">{children}</div>}
      </div>
    </div>
    <div className="px-6 pb-6 pt-2 max-w-md w-full mx-auto space-y-2">
      <Button variant="hero" size="lg" className="w-full" onClick={onCta}>
        {cta}
      </Button>
      {secondary && (
        <Button variant="ghost" className="w-full" onClick={secondary.onClick}>
          {secondary.label}
        </Button>
      )}
    </div>
  </div>
);
