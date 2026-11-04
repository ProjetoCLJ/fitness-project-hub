// Controla o que já foi comemorado em tela (cada medalha, meta ou resultado de liga aparece uma vez).

const key = (k: string) => `celebrated:${k}`;

export const isCelebrated = (k: string) => {
  try {
    return localStorage.getItem(key(k)) === "1";
  } catch {
    return false;
  }
};

export const markCelebrated = (k: string) => {
  try {
    localStorage.setItem(key(k), "1");
  } catch {
    /* sem storage */
  }
};
