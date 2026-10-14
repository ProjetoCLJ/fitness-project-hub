import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share, SquarePlus, MoreVertical } from "lucide-react";

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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Instale o MyJourn
          </DialogTitle>
          <DialogDescription>Tenha o app na tela inicial do seu celular, com acesso rápido e em tela cheia.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {isIOSNonSafari && (
            <p className="rounded-md bg-muted p-3">
              No iPhone, só o <strong>Safari</strong> consegue instalar. Abra este endereço no Safari para continuar.
            </p>
          )}

          {isIOS && (
            <ol className="space-y-2">
              <li className="flex items-start gap-2">
                <Share className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                Toque em <strong>Compartilhar</strong> (o quadrado com a seta).
              </li>
              <li className="flex items-start gap-2">
                <SquarePlus className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                Escolha <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>Confirme em <strong>Adicionar</strong>.</li>
            </ol>
          )}

          {isAndroid && (
            <>
              {installEvent ? (
                <Button variant="hero" className="w-full" onClick={installNow}>
                  Instalar agora
                </Button>
              ) : (
                <ol className="space-y-2">
                  <li className="flex items-start gap-2">
                    <MoreVertical className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    Toque no menu <strong>⋮</strong> do navegador.
                  </li>
                  <li>
                    Escolha <strong>Instalar aplicativo</strong> (ou <strong>Adicionar à tela inicial</strong>).
                  </li>
                  <li>Confirme em <strong>Instalar</strong>.</li>
                </ol>
              )}
            </>
          )}
        </div>

        <Button variant="ghost" className="w-full" onClick={dismiss}>
          Agora não
        </Button>
      </DialogContent>
    </Dialog>
  );
};
