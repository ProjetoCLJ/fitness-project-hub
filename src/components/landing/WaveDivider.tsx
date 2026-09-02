interface WaveDividerProps {
  fromColor?: string;
  toColor: string;
  flip?: boolean;
}

/** Divisor orgânico (SVG) entre seções, inspirado em transições de landing pages modernas. */
export const WaveDivider = ({ toColor, flip = false }: WaveDividerProps) => (
  <div className={`relative h-16 sm:h-24 -mt-1 ${flip ? "rotate-180" : ""}`} style={{ color: toColor }}>
    <svg
      viewBox="0 0 1440 120"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="none"
      fill="currentColor"
    >
      <path d="M0,32 C320,120 1120,-40 1440,48 L1440,120 L0,120 Z" />
    </svg>
  </div>
);
