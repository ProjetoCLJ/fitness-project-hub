import { ReactNode, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

const THUMB = 52;
const PAD = 4;

/** Botão de "arrastar para a direita" (estilo desbloqueio do iPhone). Enter/Espaço também confirmam. */
export const SlideToConfirm = ({ label, onConfirm, icon, disabled = false, className = "" }: SlideToConfirmProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const originX = useRef(0);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const maxX = () => Math.max(1, (trackRef.current?.clientWidth ?? 0) - THUMB - PAD * 2);

  const confirm = () => {
    setX(maxX());
    onConfirm();
    setTimeout(() => setX(0), 400);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    originX.current = e.clientX - x;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    setX(Math.min(maxX(), Math.max(0, e.clientX - originX.current)));
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (x >= maxX() * 0.85) confirm();
    else setX(0);
  };

  const progress = x / maxX();

  return (
    <div
      ref={trackRef}
      className={`relative h-[60px] rounded-full bg-primary select-none overflow-hidden ${disabled ? "opacity-50" : ""} ${className}`}
      style={{ padding: PAD }}
    >
      <div
        className="absolute inset-y-0 left-0 bg-white/15 rounded-full"
        style={{ width: x + THUMB + PAD * 2, transition: dragging ? "none" : "width 200ms" }}
      />
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-primary-foreground pl-14 pointer-events-none"
        style={{ opacity: 1 - progress * 1.2 }}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight")) {
            e.preventDefault();
            confirm();
          }
        }}
        className="relative h-[52px] w-[52px] rounded-full bg-background text-primary flex items-center justify-center shadow-md touch-none cursor-grab active:cursor-grabbing"
        style={{ transform: `translateX(${x}px)`, transition: dragging ? "none" : "transform 200ms" }}
      >
        {icon ?? <ChevronRight className="h-6 w-6" />}
      </button>
    </div>
  );
};
