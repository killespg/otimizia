"use client";

import { useState } from "react";

export function CopyShareLink({ token, basePath = "/share" }: { token: string; basePath?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${basePath}/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="nav-item rounded-md border border-line bg-od-surface px-3 py-2 text-xs font-black text-violet-300 hover:border-brand-300 hover:bg-brand-50"
    >
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}
