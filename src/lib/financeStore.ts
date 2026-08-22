// Store local (localStorage) do preço base da aula do profissional.
// Compartilhada entre TrainerPricing (edição) e Financial (cálculo de
// potencial de faturamento) até termos um backend real.

const STORAGE_KEY = "fit_base_price";
const DEFAULT_PRICE = 150;

export const getBasePrice = (): number => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? parseFloat(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : DEFAULT_PRICE;
};

export const setBasePrice = (value: number): void => {
  localStorage.setItem(STORAGE_KEY, String(value));
};
