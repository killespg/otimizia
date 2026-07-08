"use client";

import { useRef, useState, type ChangeEvent } from "react";

// Fica bem abaixo do limite de payload de Serverless Functions da Vercel
// (4.5MB): PDF + base64 (~33% maior) + JSON precisa caber com folga aí.
export const MAX_PDF_BYTES = 2.5 * 1024 * 1024;

// Estado do PDF escolhido mas ainda não enviado, compartilhado pelas
// superfícies de chat (balão flutuante, painel do dashboard, página cheia)
// para não duplicar a validação em cada uma.
export function usePdfAttachment() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick() {
    inputRef.current?.click();
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!picked) return;
    if (picked.type !== "application/pdf") {
      setFile(null);
      setError("Só consigo ler arquivos PDF.");
      return;
    }
    if (picked.size > MAX_PDF_BYTES) {
      setFile(null);
      setError(`Esse PDF passa de ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))}MB.`);
      return;
    }
    setError(null);
    setFile(picked);
  }

  function clear() {
    setFile(null);
    setError(null);
  }

  return { file, error, inputRef, pick, onChange, clear };
}
