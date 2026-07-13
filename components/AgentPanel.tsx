"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconArrowRight, IconBot, IconPaperclip, IconX } from "@/app/(app)/icons";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { usePdfAttachment } from "@/lib/ai/usePdfAttachment";
import { VoicePanel } from "./VoicePanel";

const PROMPTS = [
  {
    title: "Resumir atividades de hoje",
    desc: "Veja um resumo do seu dia",
  },
  {
    title: "Quais leads estão mais engajados?",
    desc: "Análise de engajamento",
  },
  {
    title: "Sugerir próximos passos",
    desc: "O que fazer agora?",
  },
];

export function AgentPanel() {
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
    void send(text, undefined, file);
  }

  return (
    <section
      id="agente"
      className="enter card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/otimizia-mark-dark.png"
            alt=""
            width={44}
            height={44}
            className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
          />
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Sócio-Assistente
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-md bg-success-50 px-2 py-1 text-xs font-black text-success-700 sm:inline-block">
            Online
          </span>
          <Link
            href="/assistant"
            className="nav-item inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-900"
          >
            Tela cheia
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {messages.length === 0 ? (
        <>
          <p className="mt-4 text-sm font-medium leading-relaxed text-ink-soft">
            E aí! Bora ver como tá o negócio hoje?
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {PROMPTS.map((prompt) => (
              <button
                key={prompt.title}
                type="button"
                onClick={() => submit(prompt.title)}
                className="nav-item rounded-lg border border-line bg-surface p-3 text-left hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="flex items-center gap-2 text-[11px] font-black leading-tight text-brand-700">
                  <IconBot className="h-3.5 w-3.5 shrink-0" />
                  {prompt.title}
                </span>
                <span className="mt-1 block text-[11px] font-semibold leading-tight text-ink-muted">
                  {prompt.desc}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div
          ref={scrollRef}
          className="enter mt-4 max-h-72 space-y-3 overflow-y-auto pr-1"
        >
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#7a1fff,#5c22e8)] px-3.5 py-2 text-sm text-white">
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
      )}

      <div className="mt-4">
        <VoicePanel />
      </div>

      {(attachment.file || attachment.error) && (
        <div className="pop-in origin-top mt-3">
          {attachment.file && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold text-ink">
              <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 truncate">{attachment.file.name}</span>
              <button
                type="button"
                onClick={attachment.clear}
                className="icon-button grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-muted transition-colors duration-150 ease-out hover:bg-line hover:text-ink"
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
        className="mt-3 flex gap-2"
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
          className="nav-item grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:text-ink"
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
          className="field h-11 min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={sending || (!input.trim() && !attachment.file)}
          className="nav-item grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-700 text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,0.9)] transition-opacity hover:bg-brand-800 disabled:opacity-40"
          aria-label="Enviar pergunta"
        >
          <IconArrowRight className="h-5 w-5 -rotate-45" />
        </button>
      </form>
    </section>
  );
}
