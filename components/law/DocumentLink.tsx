"use client";

import { useState } from "react";
import { getLegalDocumentSignedUrl } from "@/app/(app)/law/actions";

export function DocumentLink({ documentId, className, children }: { documentId: string; className?: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    // Abre a aba de forma síncrona, dentro do gesto de clique — se
    // esperássemos a Server Action antes de chamar window.open, navegadores
    // como Safari tratariam como popup fora de um gesto do usuário e
    // bloqueariam silenciosamente, sem lançar erro.
    const tab = window.open("", "_blank", "noopener,noreferrer");
    try {
      const url = await getLegalDocumentSignedUrl(documentId);
      if (tab) tab.location.href = url;
      else window.alert("Seu navegador bloqueou a abertura do documento. Permita pop-ups para este site.");
    } catch {
      tab?.close();
      window.alert("Não foi possível abrir o documento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={open} disabled={loading} className={className}>
      {children}
    </button>
  );
}
