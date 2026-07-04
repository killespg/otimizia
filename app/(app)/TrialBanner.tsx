"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconX } from "./icons";

export function TrialBanner({ trialDaysLeft }: { trialDaysLeft: number }) {
  const mandatory = trialDaysLeft <= 7;
  const dismissKey = `otimizia-trial-banner-dismissed-${trialDaysLeft}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mandatory) {
      setVisible(true);
      return;
    }
    setVisible(window.localStorage.getItem(dismissKey) !== "1");
  }, [dismissKey, mandatory]);

  if (!visible) return null;

  return (
    <div
      className={
        "flex items-center justify-center gap-3 px-4 py-2 text-center text-xs font-bold sm:hidden " +
        (mandatory ? "bg-brand-700 text-white" : "border-b border-line bg-surface-2 text-ink")
      }
    >
      <Link href="/settings" className="nav-item">
        Faltam {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"} no seu
        teste grátis — Assinar agora
      </Link>
      {!mandatory && (
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={() => {
            window.localStorage.setItem(dismissKey, "1");
            setVisible(false);
          }}
          className="shrink-0 opacity-70 hover:opacity-100"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
