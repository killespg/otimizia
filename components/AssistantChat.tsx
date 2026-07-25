"use client";

import { useEffect, useRef, useState } from "react";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { usePdfAttachment } from "@/lib/ai/usePdfAttachment";
import { useVoiceCall } from "@/lib/ai/useVoiceCall";
import type { PendingImage } from "./ChatImageAttach";
import { VoicePanel } from "./VoicePanel";
import { TimHeader } from "@/components/tim/TimHeader";
import { TimConversation } from "@/components/tim/TimConversation";
import { TimComposer } from "@/components/tim/TimComposer";

// Versão flutuante da conversa com o Tim — mesma identidade e densidade da
// tela cheia (app/(dashboard)/painel/assistente), num painel ancorado.
export function AssistantChat({ firstName }: { firstName?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const { messages, status, sending, send } = useAssistantChat();
  const attachment = usePdfAttachment();
  const voice = useVoiceCall();
  const sheetRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        fabRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function submit(text: string) {
    if (!text.trim() && !attachment.file && !pendingImage) return;
    setInput("");
    const image = pendingImage;
    setPendingImage(null);
    const file = attachment.file;
    attachment.clear();
    void send(text, image ?? undefined, file);
  }

  if (!open) {
    return (
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir conversa com o Tim"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-od-accent text-white shadow-[0_16px_40px_-16px_rgba(92,34,232,0.8)] hover:bg-od-accent-hover"
      >
        <span className="text-lg font-bold">T</span>
      </button>
    );
  }

  return (
    <div
      ref={sheetRef}
      className="fixed inset-x-3 bottom-[calc(6.6rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(620px,calc(100dvh-8rem))] flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-[#1e1d22] shadow-[0_24px_70px_-30px_rgba(0,0,0,0.72)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[400px]"
      role="dialog"
      aria-modal="true"
      aria-label="Conversa com o Tim"
    >
      <TimHeader
        status={status}
        onClose={() => {
          setOpen(false);
          fabRef.current?.focus();
        }}
      />

      <TimConversation
        className="px-3 py-3"
        messages={messages}
        status={status}
        firstName={firstName}
        suggestions={["Como está meu negócio hoje?", "Quais lembretes estão atrasados?", "Crie um contato para mim"]}
        onSuggestion={submit}
      />

      <VoicePanel {...voice} />

      <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
        <TimComposer
          value={input}
          onChange={setInput}
          onSubmit={() => submit(input)}
          sending={sending}
          pendingImage={pendingImage}
          onPendingImageChange={setPendingImage}
          pdfAttachment={attachment}
          voiceStatus={voice.voiceStatus}
          onStartVoice={voice.startVoice}
          placeholder="Fala comigo…"
        />
      </div>
    </div>
  );
}
