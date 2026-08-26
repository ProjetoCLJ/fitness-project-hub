import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Timer, X } from "lucide-react";

interface RestTimerProps {
  seconds: number;
  onDone: () => void;
}

export const RestTimer = ({ seconds, onDone }: RestTimerProps) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const progress = Math.max(0, Math.min(100, (remaining / seconds) * 100));
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-strong">
      <div className="h-1 bg-primary-foreground/30">
        <div className="h-full bg-primary-foreground transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="container mx-auto px-4 py-3 max-w-3xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <span className="font-semibold tabular-nums">
            Descanso · {mm}:{ss.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10 h-8"
            onClick={() => setRemaining((r) => r + 15)}
          >
            +15s
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/10 h-8"
            onClick={onDone}
          >
            <X className="h-4 w-4 mr-1" />
            Pular
          </Button>
        </div>
      </div>
    </div>
  );
};
