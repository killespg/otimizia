"use client";

import { useState } from "react";
import { regenerateCalendarFeed } from "./notifications-actions";

export function CalendarFeedField({ token }: { token: string | null }) {
  const [currentToken, setCurrentToken] = useState(token);
  const [copied, setCopied] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const url = currentToken && typeof window !== "undefined" ? `${window.location.origin}/api/ics/${currentToken}` : "";

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    if (!confirm("O link atual vai parar de funcionar. Continuar?")) return;
    setIsPending(true);
    try {
      const nextToken = await regenerateCalendarFeed();
      setCurrentToken(nextToken);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="field flex-1 truncate text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" onClick={copy} className="btn-soft shrink-0 !px-3 !text-xs">
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="text-xs font-medium text-ink-muted">
        No Google Agenda: Outras agendas → Adicionar por URL. No Apple Calendário: Arquivo → Nova
        assinatura de calendário.
      </p>
      <button
        type="button"
        onClick={regenerate}
        disabled={isPending}
        className="text-xs font-bold text-danger-700 hover:text-danger-800"
      >
        {isPending ? "Gerando novo link…" : "Gerar novo link (revoga o atual)"}
      </button>
    </div>
  );
}
