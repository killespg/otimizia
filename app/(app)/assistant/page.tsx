"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { IconArrowRight, IconBot, IconPaperclip, IconX } from "../icons";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { usePdfAttachment } from "@/lib/ai/usePdfAttachment";
import { VoicePanel } from "@/components/VoicePanel";

const SUGGESTIONS = [
  "Como está meu negócio hoje?",
  "Quais lembretes estão atrasados?",
  "Resuma minhas conversas com clientes",
  "Crie um contato para mim",
];

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const { messages, status, sending, send } = useAssistantChat();
  const attachment = usePdfAttachment();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function submit(text: string) {
    if (!text.trim() && !attachment.file) return;
    setInput("");
    const file = attachment.file;
    attachment.clear();
    void send(text, file);
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col sm:h-[calc(100dvh-9.5rem)]">
      <header className="enter flex items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <Image
            src="/otimizia-mark-dark.png"
            alt=""
            width={44}
            height={44}
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div>
            <h1 className="text-lg font-black tracking-[-0.02em] text-ink sm:text-xl">
              Sócio-Assistente
            </h1>
            <p className="text-sm font-medium text-ink-muted">
              Cria contatos, move vendas, agenda lembretes e responde sobre seu negócio.
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-md bg-success-50 px-2 py-1 text-xs font-black text-success-700 sm:inline-block">
          Online
        </span>
      </header>

      <div ref={scrollRef} className="enter min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
              <IconBot className="h-7 w-7" />
            </span>
            <div>
              <p className="text-base font-black text-ink">E aí! Bora ver como tá o negócio hoje?</p>
              <p className="mt-1 text-sm font-medium text-ink-muted">
                Pergunte qualquer coisa ou peça uma ação — eu cuido do resto.
              </p>
            </div>
            <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="nav-item rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm font-bold text-ink-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#7a1fff,#5c22e8)] px-4 py-2.5 text-sm text-white">
                  {message.attachmentName && (
                    <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-white/80">
                      <IconPaperclip className="h-3.5 w-3.5 shrink-0" />
                      {message.attachmentName}
                    </span>
                  )}
                  {message.content}
                </div>
              </div>
            ) : (
              (message.content || index !== messages.length - 1 || !status) && (
                <div key={index} className="flex justify-start">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-2.5 text-sm text-ink">
                    {message.content}
                  </div>
                </div>
              )
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

      <div className="shrink-0 space-y-3 border-t border-line pt-3">
        <VoicePanel />

        {(attachment.file || attachment.error) && (
          <div>
            {attachment.file && (
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink">
                <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate">{attachment.file.name}</span>
                <button
                  type="button"
                  onClick={attachment.clear}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-line hover:text-ink"
                  aria-label="Remover PDF anexado"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {attachment.error && (
              <p className="mt-1 text-xs font-semibold text-danger-700">{attachment.error}</p>
            )}
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
          className="flex gap-2"
        >
          <input
            ref={attachment.inputRef}
            type="file"
            accept="application/pdf"
            onChange={attachment.onChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={attachment.pick}
            className="nav-item grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink-muted transition-colors hover:text-ink"
            aria-label="Anexar PDF"
            title="Anexar PDF"
          >
            <IconPaperclip className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pergunte algo..."
            maxLength={4000}
            className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-white px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !attachment.file)}
            className="nav-item grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand-700 text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,0.9)] transition-opacity hover:bg-brand-800 disabled:opacity-40"
            aria-label="Enviar pergunta"
          >
            <IconArrowRight className="h-5 w-5 -rotate-45" />
          </button>
        </form>
      </div>
    </div>
  );
}
