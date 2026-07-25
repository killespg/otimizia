"use client";

import { useEffect, useState } from "react";
import { BrandName } from "@/components/BrandName";
import { LogoMark } from "@/components/design-system/logo";
import { IconX } from "@/app/(dashboard)/painel/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "otimizia_install_prompt_dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function InstallAppPrompt() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const dismissedThisSession = sessionStorage.getItem(DISMISSED_KEY) === "true";
    setDismissed(dismissedThisSession);
    setReady(isMobileViewport() && !isStandalone());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setReady(isMobileViewport() && !isStandalone());
    }

    function onAppInstalled() {
      setReady(false);
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!ready || dismissed) return null;

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        setReady(false);
        return;
      }
    }
    setShowInstructions(true);
  }

  function close() {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  const ios = typeof window !== "undefined" && isIOS();

  return (
    <section
      className="install-app-prompt fixed inset-x-3 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] z-[70] rounded-lg border border-brand-200 bg-surface p-3 sm:hidden"
      aria-label="Instalar aplicativo"
    >
      <button
        type="button"
        onClick={close}
        className="icon-button absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-ink"
        aria-label="Fechar convite de instalação"
      >
        <IconX className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-8">
        <span className="grid size-[46px] shrink-0 place-items-center rounded-md bg-[#120f1c]">
          <LogoMark size={38} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-ink">
            Use o <BrandName /> como app
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-ink-muted">
            Abra direto da tela inicial, em tela cheia, sem cara de site.
          </p>
        </div>
      </div>

      {showInstructions ? (
        <div className="pop-in origin-top mt-3 rounded-xl bg-surface-2 p-3 text-xs font-semibold leading-relaxed text-ink-soft">
          {ios ? (
            <>
              No iPhone: toque em <span className="font-black text-ink">Compartilhar</span> e depois em{" "}
              <span className="font-black text-ink">Adicionar à Tela de Início</span>.
            </>
          ) : (
            <>
              No navegador: abra o menu e escolha{" "}
              <span className="font-black text-ink">Adicionar à tela inicial</span> ou{" "}
              <span className="font-black text-ink">Instalar app</span>.
            </>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="nav-item flex min-h-11 flex-1 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white"
        >
          Baixar aplicativo
        </button>
        <button
          type="button"
          onClick={close}
          className="nav-item min-h-11 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-ink-muted"
        >
          Depois
        </button>
      </div>
    </section>
  );
}
