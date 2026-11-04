/** App aberto pela tela inicial do celular (PWA instalado), e não pelo navegador. */
export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    new URLSearchParams(window.location.search).get("standalone") === "1");
