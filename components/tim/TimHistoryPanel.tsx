"use client";

import { useEffect, useRef } from "react";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";
import { IconMessage } from "@/app/(dashboard)/painel/icons";

function dayLabel(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Hoje";
  if (sameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Painel de conversas antigas com o Tim: lista os papos anteriores (mais
// recente primeiro) e volta pra qualquer um com um clique. As conversas são
// separadas por conversation_id (migration 0085/0086); a conversa "clássica",
// anterior a isso, aparece como uma conversa normal no topo da lista.
export function TimHistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conversations, conversationId, refreshConversations, switchConversation } = useAssistantChat();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void refreshConversations();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, refreshConversations, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar histórico"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Conversas antigas com o Tim"
        className="relative flex h-full w-full max-w-[400px] flex-col overflow-hidden border-l border-od-border bg-od-surface"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-[15px] font-semibold text-white">Conversas antigas</p>
            <p className="mt-0.5 text-[12px] text-od-text-3">
              Toque numa conversa para voltar a ela.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-lg leading-none text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {conversations.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <p className="text-sm font-medium text-white/60">Nenhuma conversa antiga por aqui ainda.</p>
              <p className="mt-1 text-[13px] text-od-text-3">
                As conversas que você tiver com o Tim vão aparecer aqui.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => {
                const active = conversation.id === conversationId;
                return (
                  <li key={conversation.id ?? "classica"}>
                    <button
                      type="button"
                      onClick={() => {
                        void switchConversation(conversation.id);
                        onClose();
                      }}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-start gap-3 rounded-[var(--radius-control)] px-3 py-3 text-left transition-colors ${
                        active ? "bg-od-accent-tint/70" : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
                          active ? "bg-od-accent-tint text-od-accent-soft" : "bg-white/[0.06] text-od-text-2"
                        }`}
                      >
                        <IconMessage className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium leading-snug text-white/85">
                          {conversation.preview}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-od-text-3">
                          {dayLabel(conversation.lastAt)}
                        </span>
                      </span>
                      {active ? (
                        <span className="ml-auto shrink-0 self-center rounded-[var(--radius-round)] bg-od-accent-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-od-accent-soft">
                          Atual
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
