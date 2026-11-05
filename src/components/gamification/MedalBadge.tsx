import { MedalGlyph } from "@/lib/medals";
import type { SportCode } from "@/lib/sports";
import { SportGlyph } from "@/components/gamification/SportIcon";

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (c: string, target: string, amount: number) => {
  const a = hex(c);
  const b = hex(target);
  return `#${a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount).toString(16).padStart(2, "0")).join("")}`;
};

/** Tons derivados de uma cor só: aro, sombra, luz, símbolo esculpido e realce do relevo. */
const tones = (base: string) => ({
  rim: mix(base, "#000000", 0.38),
  face: base,
  light: mix(base, "#ffffff", 0.55),
  carve: mix(base, "#000000", 0.45),
  shine: mix(base, "#ffffff", 0.5),
});

const LOCKED = tones("#C3CCD8");

const star = (cx: number, cy: number, r: number) => {
  let p = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }
  return `${p}Z`;
};

// Símbolos desenhados em uma caixa de 24x24.
const Glyph = ({ glyph, color, sport }: { glyph: MedalGlyph; color: string; sport?: SportCode }) => {
  switch (glyph) {
    case "foco":
      return <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3-1-3-1-5 0-8z" fill={color} />;
    case "treinos":
      return (
        <g fill={color}>
          <rect x="2" y="9" width="3" height="6" rx="1" />
          <rect x="5" y="7" width="3" height="10" rx="1" />
          <rect x="8" y="11" width="8" height="2" />
          <rect x="16" y="7" width="3" height="10" rx="1" />
          <rect x="19" y="9" width="3" height="6" rx="1" />
        </g>
      );
    case "xp":
      return <path d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z" fill={color} />;
    case "semanas":
      return (
        <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M4 10H20M8 3v4M16 3v4M8.5 15l2.5 2.5 5-5" />
        </g>
      );
    case "podio":
      return (
        <g fill={color}>
          <rect x="3" y="12" width="5.5" height="8" rx="1" />
          <rect x="9.2" y="6" width="5.5" height="14" rx="1" />
          <rect x="15.5" y="14" width="5.5" height="6" rx="1" />
        </g>
      );
    case "esporte":
      return sport ? <SportGlyph sport={sport} color={color} /> : <path d={star(12, 12.5, 10)} fill={color} />;
    case "multi":
      return (
        <g fill={color}>
          <path d={star(6.5, 15, 5)} />
          <path d={star(17.5, 15, 5)} />
          <path d={star(12, 7, 5.5)} />
        </g>
      );
    default:
      return <path d="M3 19 L2 7 L8 12 L12 4 L16 12 L22 7 L21 19 Z" fill={color} />;
  }
};

interface MedalBadgeProps {
  glyph: MedalGlyph;
  /** Cor base da medalha (o restante é derivado dela). */
  color: string;
  /** Número no centro. Sem número, o símbolo fica grande e centralizado. */
  value?: string;
  /** Fita (pódio e campeão). */
  ribbon?: boolean;
  /** Esporte: troca o símbolo "esporte" pelo ícone do esporte. */
  sport?: SportCode;
  /** Centraliza o círculo da medalha na área (comemorações, com raios em volta). */
  centerFace?: boolean;
  /** Medalha ainda não conquistada: cinza, com cadeado no canto. */
  locked?: boolean;
  label: string;
  className?: string;
}

export const MedalBadge = ({ glyph, color, value, ribbon, sport, centerFace, locked, label, className }: MedalBadgeProps) => {
  const t = locked ? LOCKED : tones(color);
  const len = (value ?? "").length;
  const fontSize = len <= 2 ? 30 : len <= 3 ? 25 : len <= 5 ? 19 : 16;
  const hasValue = !!value;

  // Esculpido: realce claro deslocado para baixo + símbolo em tom escuro por cima.
  const carved = (render: (c: string) => JSX.Element) => (
    <>
      <g transform="translate(0 1.6)" opacity="0.9">
        {render(t.shine)}
      </g>
      {render(t.carve)}
    </>
  );

  return (
    <svg viewBox={centerFace ? "0 -8 100 112" : "0 0 100 108"} className={className} role="img" aria-label={label}>
      {ribbon && !locked && (
        <>
          <path d="M30 70 L22 100 L35 94 L42 104 L48 76 Z" fill="#DC2626" />
          <path d="M70 70 L78 100 L65 94 L58 104 L52 76 Z" fill="#2563EB" />
        </>
      )}
      <circle cx="50" cy="48" r="44" fill={t.rim} />
      <circle cx="50" cy="48" r="37" fill={t.face} />
      <path d="M50 11 A37 37 0 0 1 50 85 Z" fill={t.rim} opacity="0.35" />
      <path d="M22 36 A30 30 0 0 1 44 17" fill="none" stroke={t.light} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      <circle cx="50" cy="48" r="37" fill="none" stroke={t.light} strokeWidth="2" />

      {hasValue ? (
        <>
          <g transform="translate(38 17)">{carved((c) => <Glyph glyph={glyph} color={c} sport={sport} />)}</g>
          <text x="50" y="73.6" textAnchor="middle" fontWeight="600" fontSize={fontSize} fill={t.shine} opacity="0.9">
            {value}
          </text>
          <text x="50" y="72" textAnchor="middle" fontWeight="600" fontSize={fontSize} fill={t.carve}>
            {value}
          </text>
        </>
      ) : (
        // Só símbolo: grande e centralizado no meio da medalha.
        <g transform="translate(21.4 19.4) scale(2.3)">{carved((c) => <Glyph glyph={glyph} color={c} sport={sport} />)}</g>
      )}

      {locked && (
        <g>
          <circle cx="78" cy="78" r="13" fill="#475569" stroke="#fff" strokeWidth="2.5" />
          <rect x="72" y="77" width="12" height="9" rx="2" fill="#fff" />
          <path d="M74.5 77 v-3 a3.5 3.5 0 0 1 7 0 v3" fill="none" stroke="#fff" strokeWidth="2.2" />
        </g>
      )}
    </svg>
  );
};
