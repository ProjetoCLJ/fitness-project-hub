import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "myjourn-install-hint-seen";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  new URLSearchParams(window.location.search).get("standalone") === "1";

/** Dica para instalar o app na tela inicial (só celular, só no navegador, uma vez). */
export const InstallPrompt = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  // No iOS só o Safari instala na tela inicial.
  const isIOSNonSafari = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    if (pathname !== "/" || (!isIOS && !isAndroid) || isStandalone()) return;
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      /* sem armazenamento: mostra mesmo assim */
    }
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [pathname, isIOS, isAndroid]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignora */
    }
  };

  const installNow = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
    dismiss();
  };

  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">{n}</span>
      <span className="text-sm leading-6">{children}</span>
    </li>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-xl">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-lg">Instale o MyJourn</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            Tenha o app na tela inicial do seu celular, com acesso rápido e em tela cheia.
          </DialogDescription>
        </DialogHeader>

        {isIOSNonSafari && (
          <p className="rounded-md border border-border p-3 text-sm leading-6">
            No iPhone, só o Safari consegue instalar. Abra este endereço no Safari para continuar.
          </p>
        )}

        {isIOS && (
          <ol className="space-y-3">
            <Step n={1}>
              Toque em <strong className="font-semibold">Compartilhar</strong> (o quadrado com a seta para cima).
            </Step>
            <Step n={2}>
              Escolha <strong className="font-semibold">Adicionar à Tela de Início</strong>.
            </Step>
            <Step n={3}>
              Confirme em <strong className="font-semibold">Adicionar</strong>.
            </Step>
          </ol>
        )}

        {isAndroid &&
          (installEvent ? (
            <Button className="w-full" onClick={installNow}>
              Instalar agora
            </Button>
          ) : (
            <ol className="space-y-3">
              <Step n={1}>
                Toque no menu <strong className="font-semibold">⋮</strong> do navegador.
              </Step>
              <Step n={2}>
                Escolha <strong className="font-semibold">Instalar aplicativo</strong> (ou{" "}
                <strong className="font-semibold">Adicionar à tela inicial</strong>).
              </Step>
              <Step n={3}>
                Confirme em <strong className="font-semibold">Instalar</strong>.
              </Step>
            </ol>
          ))}

        <Button variant="ghost" className="w-full" onClick={dismiss}>
          Agora não
        </Button>
      </DialogContent>
    </Dialog>
  );
};
