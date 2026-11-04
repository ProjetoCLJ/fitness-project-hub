const FLAME = "M24 4 C27 14 40 20 40 34 C40 45 33 52 24 52 C15 52 8 45 8 34 C8 27 12 22 15 18 C16 24 19 26 21 26 C19 18 20 10 24 4Z";
const SHADE = "M24 4 C27 14 40 20 40 34 C40 45 33 52 24 52 Z";

const Layer = ({ scale, fill, shade }: { scale: number; fill: string; shade: string }) => (
  <g transform={`translate(24 52) scale(${scale}) translate(-24 -52)`}>
    <path d={FLAME} fill={fill} />
    <path d={SHADE} fill={shade} opacity="0.35" />
  </g>
);

export type FlameState = "off" | "on" | "goal";

/** Chama do Foco: cinza (sem Foco), laranja em camadas (ativo) ou com uma segunda chama atrás (meta batida). */
export const FocoFlame = ({ state, className }: { state: FlameState; className?: string }) => {
  const off = state === "off";
  return (
    <svg viewBox="0 0 58 58" className={className} role="img" aria-label={off ? "Sem Foco" : state === "goal" ? "Meta batida" : "Foco ativo"}>
      {state === "goal" && (
        <g transform="translate(6 -3)">
          <Layer scale={0.9} fill="#FBBF24" shade="#B45309" />
        </g>
      )}
      <Layer scale={1} fill={off ? "#9CA3AF" : "#F97316"} shade={off ? "#6B7280" : "#C2410C"} />
      {!off && <Layer scale={0.72} fill="#FBBF24" shade="#D97706" />}
      {!off && <Layer scale={0.42} fill="#FEF3C7" shade="#FDE68A" />}
    </svg>
  );
};

/** Raio do XP. */
export const XpBolt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 50 58" className={className} role="img" aria-label="XP">
    <path d="M28 3 L9 31 H22 L19 53 L40 22 H27 Z" fill="#FACC15" />
    <path d="M28 3 L27 22 H40 L19 53 L22 31 Z" fill="#CA8A04" opacity="0.4" />
    <path d="M12 29 L27 7" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
  </svg>
);
