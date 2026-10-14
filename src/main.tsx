import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// PWA: registra o service worker só no site publicado (não no desenvolvimento nem no preview em iframe).
if ("serviceWorker" in navigator && import.meta.env.PROD && window.self === window.top) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.error("SW register failed", error));
  });
}
