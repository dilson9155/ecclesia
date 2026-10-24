"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  MoreVertical,
  Share,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallWindow = Window & {
  __ecclesiaInstallPrompt?: BeforeInstallPromptEvent;
};

type Platform = "ios" | "android" | "desktop";

type InstallAppButtonProps = {
  className?: string;
  /** Mantém o botão visível mesmo quando o navegador não oferece instalação automática. */
  alwaysVisible?: boolean;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function isStandaloneMode(): boolean {
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone
  );
  return media || iosStandalone;
}

export function InstallAppButton({
  className,
  alwaysVisible = false,
  size = "sm",
  variant = "ghost",
  label = "Instalar aplicativo",
}: InstallAppButtonProps) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function syncPrompt() {
      setInstallPrompt(
        (window as InstallWindow).__ecclesiaInstallPrompt ?? null
      );
    }

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      (window as InstallWindow).__ecclesiaInstallPrompt =
        event as BeforeInstallPromptEvent;
      syncPrompt();
    }

    function handleInstalled() {
      delete (window as InstallWindow).__ecclesiaInstallPrompt;
      setInstallPrompt(null);
      setInstalled(true);
    }

    const media = window.matchMedia("(display-mode: standalone)");
    function syncStandalone() {
      setInstalled(isStandaloneMode());
    }

    // Evita atualização de estado síncrona no efeito; o prompt pode ter sido
    // capturado por um script antes da hidratação.
    const frame = window.requestAnimationFrame(() => {
      setPlatform(detectPlatform());
      syncPrompt();
      syncStandalone();
    });

    window.addEventListener("ecclesia:install-available", syncPrompt);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    media.addEventListener?.("change", syncStandalone);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("ecclesia:install-available", syncPrompt);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      media.removeEventListener?.("change", syncStandalone);
    };
  }, []);

  if (!installPrompt && !alwaysVisible) return null;

  async function handleInstall() {
    if (installed) return;

    if (!installPrompt) {
      setHelpOpen(true);
      return;
    }

    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } finally {
      delete (window as InstallWindow).__ecclesiaInstallPrompt;
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleInstall}
        disabled={installing || installed}
        className={className}
      >
        {installed ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {installed
          ? "Aplicativo instalado"
          : installing
            ? "Instalando..."
            : label}
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como instalar o Ecclesia</DialogTitle>
            <DialogDescription>
              {platform === "ios"
                ? "No iPhone ou iPad, a instalação é feita pelo Safari."
                : "Use o menu do seu navegador para instalar o sistema."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {platform === "ios" ? (
              <>
                <div className="flex gap-3 rounded-lg border p-3">
                  <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    Abra o Ecclesia no <strong>Safari</strong> e toque no botão{" "}
                    <strong>Compartilhar</strong>.
                  </p>
                </div>
                <div className="flex gap-3 rounded-lg border p-3">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    Escolha <strong>Adicionar à Tela de Início</strong> e
                    confirme em <strong>Adicionar</strong>.
                  </p>
                </div>
              </>
            ) : platform === "android" ? (
              <>
                <div className="flex gap-3 rounded-lg border p-3">
                  <MoreVertical className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    Abra o menu <strong>⋮</strong> do Chrome ou Edge e toque em{" "}
                    <strong>Instalar aplicativo</strong> ou{" "}
                    <strong>Adicionar à tela inicial</strong>.
                  </p>
                </div>
                <div className="flex gap-3 rounded-lg border p-3">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    Confirme a instalação. O ícone do Ecclesia aparecerá junto
                    aos seus aplicativos.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-3 rounded-lg border p-3">
                  <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    No <strong>Chrome</strong> ou <strong>Edge</strong>, clique
                    no ícone de instalação na barra de endereço ou abra o menu{" "}
                    <strong>⋮</strong> e escolha{" "}
                    <strong>Instalar Ecclesia</strong>.
                  </p>
                </div>
                <div className="flex gap-3 rounded-lg border p-3">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <p>
                    Em celulares e tablets, use o menu do navegador e escolha{" "}
                    <strong>Adicionar à tela inicial</strong>.
                  </p>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              A instalação cria um atalho do Ecclesia no seu dispositivo. O
              acesso continua sendo feito com o seu e-mail e senha.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setHelpOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
