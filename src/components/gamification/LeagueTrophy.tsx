import { LEAGUE_NAMES } from "@/lib/gamification";

// [sombra, base, luz] de cada liga (cores clássicas de medalha).
const PALETTES: [string, string, string][] = [
  ["#3F4854", "#6B7280", "#A7B0BC"], // Estreante · grafite
  ["#7A3F17", "#B87333", "#E3A26C"], // Amador · bronze
  ["#A9470F", "#E07B39", "#F7B27F"], // Praticante · cobre
  ["#6B7685", "#B8C1CC", "#EEF2F6"], // Competidor · prata
  ["#A87408", "#E5B422", "#FFE382"], // Atleta · ouro
  ["#0B6A48", "#1FAF7B", "#85E3BA"], // Veterano · esmeralda
  ["#1A43B8", "#3B82F6", "#9CC4FD"], // Mestre · safira
  ["#5B21B6", "#8B5CF6", "#C9BBFD"], // Campeão · ametista
  ["#A31616", "#EF4444", "#FBA9A9"], // Elite · rubi
  ["#9A5A05", "#F59E0B", "#FDE9A0"], // Lenda · dourado
];
const LOCKED: [string, string, string] = ["#8A97A8", "#C3CCD8", "#E4E9F0"];
const MYSTERY: [string, string, string] = ["#1F2937", "#374151", "#4B5563"];

const star = (cx: number, cy: number, r: number) => {
  let p = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }
  return `${p}Z`;
};

const Chevron = ({ y, color }: { y: number; color: string }) => (
  <path d={`M39 ${y + 6} L50 ${y - 4} L61 ${y + 6}`} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
);

/** Emblema de "patente": ponto, divisas, estrelas, estrela em círculo e coroa. */
const Emblem = ({ league, color }: { league: number; color: string }) => {
  switch (league) {
    case 1:
      return <circle cx="50" cy="44" r="5.5" fill={color} />;
    case 2:
      return <Chevron y={44} color={color} />;
    case 3:
      return (
        <>
          <Chevron y={38} color={color} />
          <Chevron y={50} color={color} />
        </>
      );
    case 4:
      return (
        <>
          <Chevron y={34} color={color} />
          <Chevron y={44} color={color} />
          <Chevron y={54} color={color} />
        </>
      );
    case 5:
      return <path d={star(50, 44, 13)} fill={color} />;
    case 6:
      return (
        <>
          <path d={star(43, 44, 8.5)} fill={color} />
          <path d={star(57, 44, 8.5)} fill={color} />
        </>
      );
    case 7:
      return (
        <>
          <path d={star(50, 36, 7.5)} fill={color} />
          <path d={star(42, 51, 7.5)} fill={color} />
          <path d={star(58, 51, 7.5)} fill={color} />
        </>
      );
    case 8:
      return (
        <>
          <circle cx="50" cy="44" r="15" fill="none" stroke={color} strokeWidth="3" />
          <path d={star(50, 44, 9)} fill={color} />
        </>
      );
    default:
      return <path d="M38 54 L36 36 L44 45 L50 33 L56 45 L64 36 L62 54 Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />;
  }
};

interface LeagueTrophyProps {
  /** 1 (Estreante) a 10 (Lenda). */
  league: number;
  /** Liga ainda não alcançada: troféu cinza com cadeado no centro. */
  locked?: boolean;
  /** Silhueta escura com "?" (revelação do resultado da liga). */
  mystery?: boolean;
  className?: string;
}

export const LeagueTrophy = ({ league, locked = false, mystery = false, className }: LeagueTrophyProps) => {
  const n = Math.min(Math.max(league, 1), 10);
  const [dark, base, light] = mystery ? MYSTERY : locked ? LOCKED : PALETTES[n - 1];
  const emblemColor = locked ? "#F4F6F9" : "#FFFFFF";
  const wingA = locked ? "#B4BECB" : "#F472B6";
  const wingB = locked ? "#DDE3EA" : "#FDE9A0";

  return (
    <svg viewBox="-4 4.5 108 106" className={className} role="img" aria-label={`Troféu ${LEAGUE_NAMES[n - 1]}${locked ? " (bloqueado)" : ""}`}>
      {n === 10 && !mystery && (
        <>
          <path d="M25 24 C8 14 -2 34 6 52 C10 43 17 40 26 42 Z" fill={wingA} />
          <path d="M25 24 C12 22 6 34 10 44 C14 38 19 36 26 38 Z" fill={wingB} />
          <path d="M75 24 C92 14 102 34 94 52 C90 43 83 40 74 42 Z" fill={wingA} />
          <path d="M75 24 C88 22 94 34 90 44 C86 38 81 36 74 38 Z" fill={wingB} />
        </>
      )}
      <path d="M24 30 C8 28 8 54 28 58" fill="none" stroke={dark} strokeWidth="6" strokeLinecap="round" />
      <path d="M76 30 C92 28 92 54 72 58" fill="none" stroke={dark} strokeWidth="6" strokeLinecap="round" />
      <path d="M24 18 H76 V44 C76 62 64 74 50 74 C36 74 24 62 24 44 Z" fill={base} />
      <path d="M50 18 H76 V44 C76 62 64 74 50 74 Z" fill={dark} opacity="0.45" />
      <path d="M31 24 Q31 54 42 64" fill="none" stroke={light} strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      <rect x="21" y="13" width="58" height="9" rx="4.5" fill={light} />
      {mystery ? (
        <text x="50" y="54" textAnchor="middle" fontSize="28" fontWeight="600" fill="#9CA3AF">
          ?
        </text>
      ) : (
        <Emblem league={n} color={emblemColor} />
      )}
      <rect x="44" y="74" width="12" height="11" fill={dark} />
      <rect x="30" y="85" width="40" height="8" rx="3" fill={base} />
      <rect x="26" y="93" width="48" height="9" rx="3.5" fill={dark} />
      <rect x="26" y="93" width="48" height="3" rx="1.5" fill={light} opacity="0.6" />
      {n >= 9 && !locked && (
        <>
          <path d="M14 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={light} />
          <path d="M88 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill={light} />
        </>
      )}
      {locked && (
        <g>
          <circle cx="50" cy="44" r="16" fill="#475569" stroke="#fff" strokeWidth="2.5" />
          <rect x="42.5" y="43" width="15" height="12" rx="2.5" fill="#fff" />
          <path d="M46 43 v-4 a4 4 0 0 1 8 0 v4" fill="none" stroke="#fff" strokeWidth="2.6" />
        </g>
      )}
    </svg>
  );
};
