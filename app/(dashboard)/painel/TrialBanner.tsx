"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconX } from "./icons";

export function TrialBanner({ trialDaysLeft }: { trialDaysLeft: number }) {
  const mandatory = trialDaysLeft <= 7;
  const dismissKey = `otimizia-trial-banner-dismissed-${trialDaysLeft}`;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVisible(
        mandatory || window.localStorage.getItem(dismissKey) !== "1",
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dismissKey, mandatory]);

  if (!visible) return null;

  return (
    <div
      className={
        "flex items-center justify-center gap-3 px-4 py-2 text-center text-xs font-bold sm:hidden " +
        (closing ? "banner-out" : "banner-in") +
        " " +
        (mandatory ? "bg-brand-700 text-white" : "border-b border-line bg-surface-2 text-ink")
      }
    >
      <Link
        href="/painel/configuracoes"
        className="nav-item -my-2 inline-flex min-h-11 items-center"
      >
        Faltam {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"} no seu
        teste grátis — Assinar agora
      </Link>
      {!mandatory && (
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => {
            window.localStorage.setItem(dismissKey, "1");
            setClosing(true);
            setTimeout(() => setVisible(false), 170);
          }}
          className="press-sm shrink-0 opacity-70 transition-opacity duration-150 ease-out hover:opacity-100"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
