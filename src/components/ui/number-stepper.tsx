import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NumberStepperProps {
  value: string;
  onChange: (value: string) => void;
  step?: number;
  suffix?: string;
  className?: string;
}

const parseNumeric = (value: string) => {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

/** Campo numérico com botões -/+ para edição rápida no toque (peso, reps, séries). */
export const NumberStepper = ({ value, onChange, step = 1, suffix = "", className = "" }: NumberStepperProps) => {
  const adjust = (delta: number) => {
    const current = parseNumeric(value);
    const next = Math.max(0, current + delta);
    onChange(`${next}${suffix}`);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full"
        onClick={() => adjust(-step)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-center text-sm px-1"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full"
        onClick={() => adjust(step)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
