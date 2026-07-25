"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { TimMessageBubble } from "./TimMessageBubble";

const DEFAULT_SUGGESTIONS = [
  "Como está meu negócio hoje?",
  "Quais clientes precisam de atenção?",
  "O que eu deveria priorizar agora?",
  "Crie um contato para mim.",
];

function dayLabel(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Hoje";
  if (sameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

// Lista de mensagens + estado vazio + linha de status ("Tim está
// digitando…"). Compartilhada pelas três superfícies (tela cheia, balão
// flutuante, painel embutido) para a densidade e o comportamento ficarem
// idênticos nas três. Mensagens consecutivas do mesmo remetente ficam
// coladas (agrupadas, com só a última mostrando hora); a troca de
// remetente ou de dia abre respiro — é isso que lê como conversa de
// verdade, não só uma lista de balões soltos.
export function TimConversation({
  messages,
  status,
  firstName,
  suggestions = DEFAULT_SUGGESTIONS,
  onSuggestion,
  onPersonalize,
  className,
}: {
  messages: ChatMessage[];
  status: string | null;
  firstName?: string;
  suggestions?: string[];
  onSuggestion: (text: string) => void;
  onPersonalize?: () => void;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  return (
    <div
      ref={scrollRef}
      className={`chat-wallpaper min-h-0 flex-1 overflow-y-auto overscroll-contain ${className ?? ""}`}
    >
      {messages.length === 0 ? (
        <div className="flex h-full max-w-[560px] flex-col justify-end gap-4 px-1 pb-2">
          <p className="text-[15px] font-medium leading-snug text-white/85">
            {firstName ? `Fala, ${firstName}. O que a gente resolve agora?` : "Fala! O que a gente resolve agora?"}
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion(suggestion)}
                className="min-h-11 rounded border border-white/[0.09] bg-white/[0.02] px-3 py-2.5 text-left text-[13px] font-medium text-white/68 hover:bg-white/[0.045] hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
          {onPersonalize ? (
            <button
              type="button"
              onClick={onPersonalize}
              className="self-start text-[12px] font-medium text-violet-300/85 hover:text-violet-200"
            >
              Conta pra ele sobre sua empresa →
            </button>
          ) : null}
        </div>
      ) : (
        messages.map((message, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const isStreamingEmpty = !message.content && index === messages.length - 1 && status && message.role === "assistant";
          if (isStreamingEmpty) return null;

          const sameGroupAsNext = next?.role === message.role;
          const sameGroupAsPrev = prev?.role === message.role;
          const showDaySeparator = !prev || dayLabel(prev.createdAt) !== dayLabel(message.createdAt);

          return (
            <div key={index}>
              {showDaySeparator && dayLabel(message.createdAt) ? (
                <div className="flex justify-center py-3">
                  <span className="rounded-md bg-black/35 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-white/55">
                    {dayLabel(message.createdAt)}
                  </span>
                </div>
              ) : null}
              <div className={sameGroupAsNext ? "mb-1" : "mb-2.5"}>
                <TimMessageBubble
                  message={message}
                  isFirstInGroup={!sameGroupAsPrev || showDaySeparator}
                  isLastInGroup={!sameGroupAsNext}
                />
              </div>
            </div>
          );
        })
      )}

      {status && (
        <div className="flex justify-start">
          <div
            className="flex items-center gap-2 px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
            style={{ backgroundColor: "#26232e", borderRadius: "2px 8px 8px 8px" }}
          >
            <span className="flex gap-1">
              {[0, 0.18, 0.36].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-pulse rounded-full bg-white/50"
                  style={{ animationDelay: `${delay}s`, animationDuration: "1s" }}
                />
              ))}
            </span>
            <span className="text-[11px] font-medium text-white/55">{status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
