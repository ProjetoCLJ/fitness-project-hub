import { SportCode, sportLabel } from "@/lib/sports";

const stroke = (c: string, w = 2.1) =>
  ({ fill: "none", stroke: c, strokeWidth: w, strokeLinecap: "round", strokeLinejoin: "round" }) as const;

const star = (cx: number, cy: number, r: number) => {
  let p = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }
  return `${p}Z`;
};

const Head = ({ c, x, y, r = 2 }: { c: string; x: number; y: number; r?: number }) => <circle cx={x} cy={y} r={r} fill={c} />;

/** Símbolo de cada esporte em uma caixa de 24x24, em uma cor só (usado esculpido nas medalhas e solto nas listas). */
export const SportGlyph = ({ sport, color: c }: { sport: SportCode; color: string }) => {
  switch (sport) {
    case "musculacao":
      return (
        <g fill={c}>
          <rect x="6" y="11" width="12" height="2" />
          <rect x="4" y="5.5" width="2.6" height="13" rx="1.1" />
          <rect x="17.4" y="5.5" width="2.6" height="13" rx="1.1" />
          <rect x="1.2" y="8.5" width="2.2" height="7" rx="1" />
          <rect x="20.6" y="8.5" width="2.2" height="7" rx="1" />
        </g>
      );
    case "funcional_hiit":
      return (
        <g>
          <path d="M5.6 15.2 a6.4 6.4 0 0 1 12.8 0 c0 3.2 -2.4 5.6 -6.4 5.6 s-6.4 -2.4 -6.4 -5.6z" fill={c} />
          <path d="M8.4 10.4 C7.2 4 16.8 4 15.6 10.4" {...stroke(c, 2.6)} />
        </g>
      );
    case "crossfit":
      return (
        <g>
          <path d="M2.5 4.5 H21.5" {...stroke(c, 2)} />
          <rect x="1.5" y="2" width="2.2" height="5" rx="0.9" fill={c} />
          <rect x="20.3" y="2" width="2.2" height="5" rx="0.9" fill={c} />
          <Head c={c} x={12} y={9.2} r={1.9} />
          <path d="M6.5 4.5 L12 11 L17.5 4.5 M12 11 V15.5 M12 15.5 L8 18.5 L9 22 M12 15.5 L16 18.5 L15 22" {...stroke(c, 2)} />
        </g>
      );
    case "calistenia":
      return (
        <g>
          <Head c={c} x={12} y={16.4} r={1.6} />
          <path d="M12 13.5 L8.2 21.3 M12 13.5 L15.8 21.3 M12 13.5 V10 M12 10 L9.6 2.5 M12 10 L14.4 2.5" {...stroke(c, 2.2)} />
        </g>
      );
    case "corrida":
      return (
        <g>
          <Head c={c} x={16} y={4.3} r={2.2} />
          <path d="M15 8 L11.5 14 M15 8 L19.5 10.5 L18 13.5 M14.5 8.8 L10.5 8.6 L8.5 11.5 M11.5 14 L15.8 16.8 L14.8 21 M11.5 14 L8.5 17.8 L4.5 17.2" {...stroke(c, 2.2)} />
        </g>
      );
    case "caminhada":
      return (
        <g fill={c}>
          <ellipse cx="8.5" cy="8" rx="2.7" ry="4.2" transform="rotate(-12 8.5 8)" />
          <ellipse cx="8.5" cy="14.4" rx="1.9" ry="1.9" />
          <ellipse cx="15.5" cy="14" rx="2.7" ry="4.2" transform="rotate(12 15.5 14)" />
          <ellipse cx="15.5" cy="20" rx="1.9" ry="1.9" />
        </g>
      );
    case "ciclismo":
      return (
        <g>
          <circle cx="5.5" cy="16.5" r="4.2" {...stroke(c, 1.9)} />
          <circle cx="18.5" cy="16.5" r="4.2" {...stroke(c, 1.9)} />
          <path d="M5.5 16.5 H11.5 L9.5 9.5 H14.8 L11.5 16.5 M14.8 9.5 L18.5 16.5 M14.8 9.5 L15.6 6.5 H18 M7.5 9.5 H11" {...stroke(c, 1.9)} />
        </g>
      );
    case "natacao":
      return (
        <g>
          <Head c={c} x={17.5} y={6.8} r={2.2} />
          <path d="M3.5 12.5 Q9 5.5 14.5 8.8 M5 13.5 L14 11" {...stroke(c, 2.2)} />
          <path d="M1.5 17 q2.2 -2.6 4.5 0 t4.5 0 t4.5 0 t4.5 0 M1.5 21.4 q2.2 -2.6 4.5 0 t4.5 0 t4.5 0 t4.5 0" {...stroke(c, 2)} />
        </g>
      );
    case "yoga":
      return (
        <g fill={c}>
          <path d="M12 3.5 C15.5 7.5 15.5 12 12 16.5 C8.5 12 8.5 7.5 12 3.5Z" />
          <path d="M12 16.5 C9 15.5 5.5 12.5 4.5 8 C8.5 8 11 11 12 16.5Z" />
          <path d="M12 16.5 C15 15.5 18.5 12.5 19.5 8 C15.5 8 13 11 12 16.5Z" />
          <path d="M4 18.5 H20" {...stroke(c, 2.2)} />
        </g>
      );
    case "pilates":
      return (
        <g>
          <circle cx="12" cy="11.5" r="7" {...stroke(c, 2.8)} />
          <rect x="1.8" y="8.6" width="3.2" height="5.8" rx="1.4" fill={c} />
          <rect x="19" y="8.6" width="3.2" height="5.8" rx="1.4" fill={c} />
          <path d="M3 21.5 H21" {...stroke(c, 2)} />
        </g>
      );
    case "lutas":
      return (
        <g fill={c}>
          <path d="M7 10.5 C7 5.5 10 3.2 13.6 3.2 C17.8 3.2 20.4 6.2 20.4 10.4 V13.4 C20.4 15.8 18.8 17.6 16.6 17.6 H10 C8.2 17.6 7 16.3 7 14.5 Z" />
          <ellipse cx="5.6" cy="12.7" rx="2.3" ry="3" />
          <rect x="8" y="18.3" width="10.4" height="3.6" rx="1.2" />
        </g>
      );
    case "coletivos":
      return (
        <g>
          <circle cx="12" cy="12" r="9.2" {...stroke(c, 2)} />
          <path d="M12 8.1 L15.7 10.8 L14.3 15.1 H9.7 L8.3 10.8 Z" fill={c} />
          <path d="M12 8.1 V3 M15.7 10.8 L20.6 9.2 M14.3 15.1 L17.5 19.4 M9.7 15.1 L6.5 19.4 M8.3 10.8 L3.4 9.2" {...stroke(c, 1.9)} />
        </g>
      );
    case "raquete":
      return (
        <g>
          <ellipse cx="9.5" cy="9.5" rx="5.2" ry="6.6" transform="rotate(-45 9.5 9.5)" {...stroke(c, 2.2)} />
          <path d="M6.2 9.5 H12.8 M9.5 6.2 V12.8" {...stroke(c, 1.2)} />
          <path d="M13.6 13.6 L20.4 20.4" {...stroke(c, 3)} />
          <circle cx="18.6" cy="5.6" r="2.4" fill={c} />
        </g>
      );
    case "danca":
      return (
        <g fill={c}>
          <ellipse cx="7" cy="18" rx="3" ry="2.4" />
          <ellipse cx="17" cy="16" rx="3" ry="2.4" />
          <path d="M10 18 V6.5 L20 4.5 V16" {...stroke(c, 2)} />
          <path d="M10 9 L20 7" {...stroke(c, 3)} />
        </g>
      );
    case "alongamento":
      return (
        <g>
          <Head c={c} x={12} y={4.2} r={2.2} />
          <path d="M12 7.2 V15 M12 15 L8 21.5 M12 15 L16 21.5 M12 9.5 L5.5 4.5 M12 9.5 L18.5 4.5" {...stroke(c, 2.2)} />
        </g>
      );
    default:
      return <path d={star(12, 12.5, 10)} fill={c} />;
  }
};

/** Ícone solto do esporte (listas, seletores, cartões). */
export const SportIcon = ({ sport, className, color = "currentColor" }: { sport: string; className?: string; color?: string }) => (
  <svg viewBox="0 0 24 24" className={className} role="img" aria-label={sportLabel(sport)}>
    <SportGlyph sport={sport as SportCode} color={color} />
  </svg>
);
