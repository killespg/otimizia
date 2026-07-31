"use client";

import { useEffect, useState } from "react";
import { BrandName } from "@/components/design-system/BrandName";
import { LogoMark } from "@/components/design-system/logo";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Controle de instalação deliberadamente acionado pelo usuário.
 *
 * Ele vive em Configurações, sem overlay global, sem interromper formulário,
 * conversa ou navegação. Quando o navegador não expõe beforeinstallprompt,
 * ainda ensina o caminho manual.
 */
export function InstallAppPrompt() {
  const [installed, setInstalled] = useState(false);
  const [ios, setIOS] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const frame = window.requestAnimationFrame(() => {
      setInstalled(isStandalone());
      setIOS(isIOS());
    });

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
    if (choice?.outcome === "accepted") {
      setInstalled(true);
    } else {
      setShowInstructions(true);
    }
  }

  return (
    <div className="install-app-prompt flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[#120f1c]">
          <LogoMark size={36} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {installed ? (
              <>
                <BrandName /> já está instalado
              </>
            ) : (
              <>
                Use o <BrandName /> como aplicativo
              </>
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {installed
              ? "Você pode abrir direto pela tela inicial do dispositivo."
              : "A instalação é opcional e fica disponível aqui quando você quiser."}
          </p>
        </div>
      </div>

      {!installed ? (
        <button
          type="button"
          onClick={install}
          className="btn-soft shrink-0"
          aria-expanded={showInstructions}
        >
          Instalar aplicativo
        </button>
      ) : null}

      {showInstructions && !installed ? (
        <p
          role="status"
          className="basis-full border-t border-line pt-3 text-xs font-medium leading-relaxed text-ink-soft sm:w-full"
        >
          {ios ? (
            <>
              No iPhone ou iPad, toque em <strong>Compartilhar</strong> e depois
              em <strong> Adicionar à Tela de Início</strong>.
            </>
          ) : (
            <>
              Abra o menu do navegador e escolha{" "}
              <strong>Instalar aplicativo</strong> ou{" "}
              <strong>Adicionar à tela inicial</strong>.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
