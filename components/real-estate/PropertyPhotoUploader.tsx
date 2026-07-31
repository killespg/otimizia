"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPropertyPhoto } from "@/app/(dashboard)/painel/imoveis/actions";
import { compressImage, formatBytes } from "@/lib/image-compress";

// Envio de foto do imóvel com compressão antes de subir. O corretor escolhe a
// foto do celular (3–8 MB, 4000px) e o navegador reduz pra ~1600px/JPEG antes
// de mandar: upload mais rápido no 4G e muito menos tráfego depois, já que é
// essa mesma foto que aparece na carteira, na vitrine e no link público.
export function PropertyPhotoUploader({ propertyId }: { propertyId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File | undefined | null) {
    setError(null);
    setStatus(null);
    if (!file) return;

    setStatus("Preparando a foto…");
    let toSend = file;
    try {
      const result = await compressImage(file);
      toSend = result.file;
      setStatus(
        result.bytes < result.originalBytes
          ? `Otimizada: ${formatBytes(result.originalBytes)} → ${formatBytes(result.bytes)}. Enviando…`
          : "Enviando…"
      );
    } catch {
      // Falhou a compressão: segue com o arquivo original em vez de travar o
      // envio — o limite de tamanho do servidor ainda protege.
      setStatus("Enviando…");
    }

    if (toSend.size > 6 * 1024 * 1024) {
      setStatus(null);
      setError("Mesmo otimizada a foto passou de 6 MB. Tente uma imagem menor.");
      return;
    }

    const formData = new FormData();
    formData.set("property_id", propertyId);
    formData.set("photo", toSend);
    startTransition(async () => {
      try {
        await uploadPropertyPhoto(formData);
        setStatus("Foto adicionada.");
      } catch (err) {
        setStatus(null);
        setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="border-t border-line p-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={pending}
          onChange={(event) => void handleFile(event.target.files?.[0])}
          className="field flex-1"
          aria-label="Escolher foto do imóvel"
        />
      </div>
      <p className="mt-2 text-xs font-medium text-ink-muted" aria-live="polite">
        {error ? (
          <span className="text-[#fb7767]">{error}</span>
        ) : (
          status ?? "A foto é reduzida automaticamente antes de subir — pode mandar direto do celular."
        )}
      </p>
    </div>
  );
}
