import { useState } from "react";
import Index from "@/pages/Index";
import PwaWelcome from "@/pages/PwaWelcome";
import { isStandalone } from "@/lib/pwa";

/** Navegador: página principal. App instalado (PWA): só vídeo, logo e login. */
const Home = () => {
  const [standalone] = useState(isStandalone);
  return standalone ? <PwaWelcome /> : <Index />;
};

export default Home;
