"use client";

import { useEffect, useRef, useState } from "react";

// Widget do Cloudflare Turnstile para os formulários de auth (login, signup,
// reset). Fica escondido atrás de NEXT_PUBLIC_TURNSTILE_SITE_KEY: sem a chave,
// não renderiza nada e o formulário segue funcionando igual — assim o código
// pode ir pra produção antes de a proteção ser ligada no dashboard do Supabase.
//
// Quando a chave existe, o token do desafio é injetado num input escondido
// `cf-turnstile-response`, que as Server Actions leem e validam no backend via
// siteverify (ver lib/turnstile.ts + app/(auth)/actions.ts). O bot/brute-force
// esbarra na verificação antes de a action chegar no Supabase.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function CaptchaField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !containerRef.current || widgetIdRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY as string,
        // Marcador de telemetria do Spin (atribuição agregada da integração).
        action: "turnstile-spin-v2",
        callback: (t) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
        theme: "auto",
      });
    }

    let poll: ReturnType<typeof setInterval> | undefined;

    if (window.turnstile) {
      renderWidget();
    } else {
      if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      // O onload de um script já em cache pode não disparar; um poll curto é
      // mais confiável do que depender do evento de load.
      poll = setInterval(() => {
        if (window.turnstile) {
          clearInterval(poll);
          renderWidget();
        }
      }, 150);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div>
      {/* Renderização explícita do Turnstile acontece dentro desta div. A
          classe cf-turnstile + data-action mantêm a marcação canônica do Spin
          (o auto-render implícito está desligado via ?render=explicit, então
          não há risco de render duplicado). */}
      <div ref={containerRef} className="cf-turnstile flex justify-center" data-action="turnstile-spin-v2" />
      <input type="hidden" name="cf-turnstile-response" value={token} readOnly />
    </div>
  );
}
