"use client";

import { useEffect, useRef, useState } from "react";

export function DocumentDraftViewer({ name, typeLabel, content }: { name: string; typeLabel: string; content: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — usuário ainda pode selecionar o texto manualmente
    }
  }

  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-ink">{name}</p>
          <p className="mt-1 text-xs font-bold text-ink-muted">{typeLabel} · minuta gerada por IA</p>
        </div>
        <span className="shrink-0 text-xs font-black text-brand-700">{open ? "Fechar" : "Ver minuta"}</span>
      </button>
      {open && (
        <div className="mt-3 rounded-lg border border-line bg-surface-2 p-4">
          <p className="text-[11px] font-black text-danger-600">
            Rascunho gerado por IA — revise, confira fundamentos e complete antes de usar ou protocolar.
          </p>
          <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs font-medium leading-relaxed text-ink-soft">{content}</pre>
          <button type="button" onClick={copy} className="btn-soft mt-3 min-h-9 px-3 text-xs">
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
        </div>
      )}
    </div>
  );
}
