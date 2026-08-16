"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { TimAvatar } from "./TimAvatar";
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
        // Sala vazia com dono: a marca do Tim abre a conversa e as sugestões
        // ficam logo acima do campo, na ordem em que o polegar sobe. Continua
        // ancorado embaixo para servir também ao balão flutuante e ao painel.
        <div className="flex h-full max-w-[560px] flex-col justify-end gap-4 px-1 pb-2">
          <div className="flex items-center gap-3">
            <TimAvatar size={38} online className="ring-2 ring-od-accent-tint" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight text-white">
                {firstName ? `Fala, ${firstName}.` : "Fala!"}
              </p>
              <p className="mt-0.5 text-[13px] leading-tight text-od-text-3">
                O que a gente resolve agora?
              </p>
            </div>
          </div>
          <div className="grid gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion(suggestion)}
                className="group flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-control)] border border-white/[0.09] bg-white/[0.02] px-3 py-2.5 text-left text-[13px] font-medium text-white/68 transition-colors hover:border-od-accent/40 hover:bg-white/[0.045] hover:text-white"
              >
                <span className="min-w-0">{suggestion}</span>
                <span aria-hidden="true" className="shrink-0 text-od-text-3 transition-colors group-hover:text-od-accent-soft">
                  ↗
                </span>
              </button>
            ))}
          </div>
          {onPersonalize ? (
            <button
              type="button"
              onClick={onPersonalize}
              className="self-start text-[12px] font-medium text-od-text-3 hover:text-od-text"
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
                  <span className="rounded-[var(--radius-round)] bg-black/35 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/55">
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
            style={{ backgroundColor: "var(--surface-secondary)", borderRadius: "4px var(--radius-control) var(--radius-control) var(--radius-control)" }}
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
            <span className="text-xs font-medium text-white/55">{status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
