"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { EmptyState, PageHeader, Tag } from "@/components/app-ui";
import { IconArrowRight, IconBot, IconPaperclip, IconX } from "../icons";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { usePdfAttachment } from "@/lib/ai/usePdfAttachment";
import {
  ChatImageAttach,
  type PendingImage,
} from "@/components/ChatImageAttach";
import { VoicePanel } from "@/components/VoicePanel";

const SUGGESTIONS = [
  "Como está meu negócio hoje?",
  "Quais lembretes estão atrasados?",
  "Resuma minhas conversas com clientes",
  "Crie um contato para mim",
];

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const { messages, status, sending, send } = useAssistantChat();
  const attachment = usePdfAttachment();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function submit(text: string) {
    if (!text.trim() && !attachment.file && !pendingImage) return;
    setInput("");
    const image = pendingImage;
    setPendingImage(null);
    const file = attachment.file;
    attachment.clear();
    void send(text, image ?? undefined, file);
  }

  return (
    <div className="assistant-page-shell -mx-4 -my-4 flex min-h-0 flex-col overflow-hidden bg-canvas sm:mx-0 sm:my-0 sm:h-[calc(100dvh-9.5rem)] sm:rounded-xl sm:border sm:border-line sm:bg-surface">
      <PageHeader
        className="shrink-0 border-b border-line bg-surface px-4 py-3 sm:px-5 sm:py-4"
        title={
          <span className="flex items-center gap-3">
            <Image
              src="/otimizia-mark-dark.png"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 shrink-0 object-contain"
            />
            Sócio-Assistente
          </span>
        }
        description="Cria contatos, move vendas, agenda lembretes e responde sobre seu negócio."
        actions={
          <Tag tone="success" className="hidden sm:inline-flex">
            Online
          </Tag>
        }
      />

      <div
        ref={scrollRef}
        className="enter min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <EmptyState
              icon={IconBot}
              title="E aí! Bora ver como tá o negócio hoje?"
              hint="Pergunte qualquer coisa ou peça uma ação — eu cuido do resto."
            />
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
                <div className="max-w-[80%] space-y-2 rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#7a1fff,#5c22e8)] px-4 py-2.5 text-sm text-white">
                  {message.imageUrl && (
                    <span className="relative block h-48 w-full overflow-hidden rounded-lg">
                      <Image
                        src={message.imageUrl}
                        alt=""
                        fill
                        sizes="min(80vw, 640px)"
                        className="object-cover"
                        unoptimized
                      />
                    </span>
                  )}
                  {message.attachmentName && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-white/80">
                      <IconPaperclip className="h-3.5 w-3.5 shrink-0" />
                      {message.attachmentName}
                    </span>
                  )}
                  {message.content && (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
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
            ),
          )
        )}

        <div aria-live="polite">
          {status && (
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
              {status}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-t border-line bg-surface px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
        <VoicePanel />

        {(attachment.file || attachment.error) && (
          <div>
            {attachment.file && (
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink">
                <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span className="min-w-0 flex-1 truncate">
                  {attachment.file.name}
                </span>
                <button
                  type="button"
                  onClick={attachment.clear}
                  className="relative grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-muted before:absolute before:-inset-2.5 before:content-[''] hover:bg-line hover:text-ink"
                  aria-label="Remover PDF anexado"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {attachment.error && (
              <p className="mt-1 text-xs font-semibold text-danger-700">
                {attachment.error}
              </p>
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
          <ChatImageAttach value={pendingImage} onChange={setPendingImage} />
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
            disabled={
              sending || (!input.trim() && !pendingImage && !attachment.file)
            }
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
