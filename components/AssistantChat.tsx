"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowRight, IconBot } from "@/app/(app)/icons";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { ChatImageAttach, type PendingImage } from "./ChatImageAttach";
import { VoicePanel } from "./VoicePanel";

const SUGGESTIONS = [
  "Como está meu negócio hoje?",
  "Quais lembretes estão atrasados?",
  "Crie um contato para mim",
];

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const { messages, status, sending, send } = useAssistantChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
    setInput("");
    const image = pendingImage;
    setPendingImage(null);
    void send(text, image ?? undefined);
  }

  return (
    <>
      {open && (
        <div
          ref={sheetRef}
          className="assistant-sheet fixed inset-x-3 bottom-[calc(6.6rem+env(safe-area-inset-bottom))] z-50 flex max-h-[min(620px,calc(100dvh-8rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_70px_-30px_rgba(7,8,28,0.55)] sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[400px]"
          role="dialog"
          aria-modal="true"
          aria-label="Sócio-Assistente"
        >
          <div className="flex items-center gap-3 border-b border-line bg-[linear-gradient(135deg,#b518ff_0%,#5c22e8_60%,#0bbfe8_100%)] px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <IconBot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">Sócio-Assistente</p>
              <p className="text-xs text-white/75">
                Cria contatos, move vendas, agenda lembretes e responde sobre seu negócio.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                fabRef.current?.focus();
              }}
              className="grid min-h-11 min-w-11 place-items-center rounded-md text-lg leading-none text-white/80 hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Fechar Sócio-Assistente"
            >
              ×
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-ink-muted">
                  E aí! Manda ver, por exemplo:
                </p>
                <div className="flex flex-col items-start gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => submit(suggestion)}
                      className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-left text-[13px] font-semibold text-ink hover:border-brand-600/40 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) =>
              message.role === "user" ? (
                <div key={index} className="flex justify-end">
                  <div className="max-w-[85%] space-y-2 rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#7a1fff,#5c22e8)] px-3.5 py-2 text-sm text-white">
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt=""
                        className="max-h-48 w-full rounded-lg object-cover"
                      />
                    )}
                    {message.content && (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ) : (
                (message.content || index !== messages.length - 1 || !status) && (
                  <div key={index} className="flex justify-start">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2 text-sm text-ink">
                      {message.content}
                    </div>
                  </div>
                )
              )
            )}

            {status && (
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
                {status}
              </div>
            )}
          </div>

          <div className="border-t border-line px-3 py-3">
            <VoicePanel />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit(input);
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-3"
          >
            <ChatImageAttach value={pendingImage} onChange={setPendingImage} />
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Fala comigo…"
              maxLength={4000}
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !pendingImage)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#7a1fff,#5c22e8)] text-white transition-opacity disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-600"
              aria-label="Enviar mensagem"
            >
              <IconArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {!open && (
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen(true)}
        className="assistant-fab fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#b518ff_0%,#5c22e8_60%,#0bbfe8_100%)] text-white shadow-[0_16px_40px_-14px_rgba(92,34,232,0.9)] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-600 sm:bottom-6 sm:right-6"
        aria-label="Abrir Sócio-Assistente"
      >
        <IconBot className="h-6 w-6" />
      </button>
      )}
    </>
  );
}
