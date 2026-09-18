import { ReactNode } from "react";
import logo from "@/assets/logo/logo-header.png";

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
      <div className="flex items-center gap-2 px-5 py-3 bg-secondary border-b border-border">
        <img src={logo} alt="MyJourn" className="h-5 w-auto object-contain" />
        {label && <span className="ml-auto text-[10px] text-white/60">{label}</span>}
      </div>
      <div className="p-4 space-y-3 min-h-[22rem]">{children}</div>
    </div>
  </div>
);
