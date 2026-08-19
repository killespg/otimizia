"use client";

import { useState } from "react";
import { PendingButton } from "@/components/ui/PendingButton";
import { sendLegalDocumentForSignature } from "@/app/(dashboard)/painel/juridico/actions";

export function SendForSignature({
  documentId,
  defaultName,
  defaultEmail,
}: {
  documentId: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-black text-brand-700">
        Enviar p/ assinatura
      </button>
    );
  }

  return (
    <form
      action={sendLegalDocumentForSignature}
      className="w-56 space-y-2 rounded-lg border border-line bg-od-surface p-3 text-left shadow-[0_12px_28px_-22px_rgba(0,0,0,.65)]"
    >
      <input type="hidden" name="document_id" value={documentId} />
      <input
        name="signer_name"
        defaultValue={defaultName}
        required
        placeholder="Nome do signatário"
        className="field min-h-11 text-xs"
      />
      <input
        name="signer_email"
        type="email"
        defaultValue={defaultEmail}
        required
        placeholder="E-mail do signatário"
        className="field min-h-11 text-xs"
      />
      <div className="flex items-center gap-2">
        <PendingButton className="btn min-h-11 flex-1 text-xs" pendingLabel="Enviando">
          Enviar
        </PendingButton>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-ink-muted">
          Cancelar
        </button>
      </div>
    </form>
  );
}
