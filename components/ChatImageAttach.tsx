"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { IconImage, IconX } from "@/app/(app)/icons";

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
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Envie uma imagem (JPEG, PNG, WEBP ou GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("A imagem pode ter no máximo 6 MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      onChange({ dataUrl, mediaType: file.type, base64 });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative flex shrink-0 items-center">
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
            className="press-sm absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white transition-colors duration-150 ease-out before:absolute before:-inset-3 before:content-['']"
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
          className="press-sm flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-muted transition-colors duration-150 ease-out hover:border-brand-300 hover:text-brand-700"
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
      {error && (
        <p className="absolute left-0 top-full z-10 mt-1 w-44 text-xs font-semibold text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
