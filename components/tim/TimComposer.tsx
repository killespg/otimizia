"use client";

import { useRef, type KeyboardEvent } from "react";
import { IconPaperclip, IconX, IconMic, IconArrowRight } from "@/app/(dashboard)/painel/icons";
import { ChatImageAttach, type PendingImage } from "@/components/ChatImageAttach";
import type { VoiceStatus } from "@/lib/ai/useVoiceCall";

const MAX_TEXTAREA_PX = 132;

type PdfAttachment = {
  file: File | null;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  pick: () => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clear: () => void;
};

// Compositor preso embaixo, compartilhado pelas três superfícies. Enter
// envia, Shift+Enter quebra linha; o campo cresce até um limite; o botão
// final mostra microfone quando o campo está vazio e vira enviar assim que
// há texto ou anexo — sem um VoicePanel grande solto por cima.
export function TimComposer({
  value,
  onChange,
  onSubmit,
  sending,
  pendingImage,
  onPendingImageChange,
  pdfAttachment,
  voiceStatus,
  onStartVoice,
  placeholder = "Mensagem para o Tim…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  sending: boolean;
  pendingImage: PendingImage | null;
  onPendingImageChange: (image: PendingImage | null) => void;
  pdfAttachment: PdfAttachment;
  voiceStatus: VoiceStatus;
  onStartVoice: () => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    file: pendingPdf,
    error: pdfError,
    inputRef: pdfInputRef,
    pick: pickPdf,
    onChange: onPdfChange,
    clear: clearPdf,
  } = pdfAttachment;
  const hasContent = value.trim().length > 0 || Boolean(pendingImage) || Boolean(pendingPdf);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (hasContent && !sending) onSubmit();
    }
  }

  function handleTrailingAction() {
    if (hasContent) {
      if (!sending) onSubmit();
      return;
    }
    onStartVoice();
  }

  return (
    <div className={`shrink-0 space-y-2 ${className ?? ""}`}>
      {(pendingPdf || pdfError) && (
        <div>
          {pendingPdf && (
            <div className="flex items-center gap-2 rounded bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white/80">
              <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-white/50" />
              <span className="min-w-0 flex-1 truncate">{pendingPdf.name}</span>
              <button
                type="button"
                onClick={clearPdf}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/50 hover:bg-white/[0.06] hover:text-white"
                aria-label="Remover PDF anexado"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {pdfError && <p className="mt-1 text-xs font-semibold text-red-400">{pdfError}</p>}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (hasContent && !sending) onSubmit();
        }}
        className="flex items-end gap-1.5"
      >
        <ChatImageAttach value={pendingImage} onChange={onPendingImageChange} />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          onChange={onPdfChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={pickPdf}
          className="grid size-10 shrink-0 place-items-center rounded-full text-white/45 hover:bg-white/[0.06] hover:text-white/70"
          aria-label="Anexar PDF"
          title="Anexar PDF"
        >
          <IconPaperclip className="h-5 w-5" />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            autoGrow();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={4000}
          // min-height/resize inline: o globals.css tem um `textarea { min-height: 96px }`
          // fora de @layer que sobrepõe as classes utilitárias do Tailwind. Inline vence.
          style={{ minHeight: "2.625rem", resize: "none" }}
          className="max-h-[132px] min-w-0 flex-1 rounded-lg border-0 bg-white/[0.06] px-4 py-2.5 text-[14px] leading-snug text-white outline-none placeholder:text-white/35 focus:bg-white/[0.08]"
        />
        <button
          type="submit"
          onClick={(event) => {
            if (!hasContent) {
              event.preventDefault();
              handleTrailingAction();
            }
          }}
          disabled={sending}
          aria-label={hasContent ? "Enviar mensagem" : "Falar com o Tim"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-od-accent text-white transition-colors hover:bg-od-accent-hover disabled:opacity-40"
        >
          {hasContent ? (
            <IconArrowRight className="h-4 w-4 -rotate-45" />
          ) : (
            <IconMic className={`h-4 w-4 ${voiceStatus === "connecting" ? "animate-pulse" : ""}`} />
          )}
        </button>
      </form>
    </div>
  );
}
