"use client";

import { useRef } from "react";
import Image from "next/image";
import { IconImage, IconX } from "@/app/(dashboard)/painel/icons";

export type PendingImage = { dataUrl: string; mediaType: string; base64: string };

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function ChatImageAttach({
  value,
  onChange,
}: {
  value: PendingImage | null;
  onChange: (image: PendingImage | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      window.alert("Envie uma imagem (JPEG, PNG, WEBP ou GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      window.alert("A imagem pode ter no máximo 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      onChange({ dataUrl, mediaType: file.type, base64 });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex shrink-0 items-center">
      {value ? (
        <span className="pop-in relative inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line">
          {/* Prévia local (data URL) antes de enviar — não é a imagem final salva. */}
          <Image
            src={value.dataUrl}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            aria-label="Remover foto"
            className="press-sm absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white transition-colors duration-150 ease-out"
          >
            <IconX className="h-3 w-3" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Anexar foto"
          title="Anexar foto"
          className="press-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-od-surface text-ink-muted transition-colors duration-150 ease-out hover:border-brand-300 hover:text-brand-700"
        >
          <IconImage className="h-5 w-5" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
