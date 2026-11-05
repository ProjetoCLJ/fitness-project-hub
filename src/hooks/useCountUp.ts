import { useEffect, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Número que "conta" de `from` até `to` (efeito de contador). Com movimento reduzido, já mostra o valor final. */
export const useCountUp = (to: number, { from = 0, duration = 900, delay = 0, enabled = true }: { from?: number; duration?: number; delay?: number; enabled?: boolean } = {}) => {
  const [value, setValue] = useState(enabled && !prefersReducedMotion() ? from : to);

  useEffect(() => {
    if (!enabled || prefersReducedMotion() || from === to) {
      setValue(to);
      return;
    }
    let raf = 0;
    let startedAt = 0;
    const timer = setTimeout(() => {
      const tick = (now: number) => {
        if (!startedAt) startedAt = now;
        const t = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(from + (to - from) * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    // Garantia: se a animação parar (aba em segundo plano), o valor final aparece mesmo assim.
    const done = setTimeout(() => setValue(to), delay + duration + 150);
    return () => {
      clearTimeout(timer);
      clearTimeout(done);
      cancelAnimationFrame(raf);
    };
  }, [to, from, duration, delay, enabled]);

  return value;
};
