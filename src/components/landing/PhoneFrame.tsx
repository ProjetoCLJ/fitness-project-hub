import { ReactNode } from "react";
import { Dumbbell } from "lucide-react";

interface PhoneFrameProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

/** Mockup estilizado de tela do app, usado nas seções da landing page. */
export const PhoneFrame = ({ children, label, className = "" }: PhoneFrameProps) => (
  <div className={`relative mx-auto w-full max-w-sm ${className}`}>
    <div className="absolute -inset-4 bg-gradient-hero rounded-[3rem] opacity-10 blur-2xl" />
    <div className="relative rounded-[2.5rem] border-8 border-secondary bg-background shadow-strong overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-card border-b border-border">
        <div className="h-6 w-6 rounded-md bg-gradient-primary flex items-center justify-center shrink-0">
          <Dumbbell className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-xs font-bold bg-gradient-hero bg-clip-text text-transparent">FIT</span>
        {label && <span className="ml-auto text-[10px] text-muted-foreground">{label}</span>}
      </div>
      <div className="p-4 space-y-3 min-h-[22rem]">{children}</div>
    </div>
  </div>
);
