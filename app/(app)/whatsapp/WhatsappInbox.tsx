"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  WhatsappConversation,
  WhatsappMessage,
} from "@/lib/supabase/types";
import {
  IconArrowRight,
  IconBot,
  IconChevronRight,
  IconMessage,
  IconUsers,
} from "../icons";

export function WhatsappInbox({
  orgId,
  initialConversations,
  initialUnreadCounts,
}: {
  orgId: string;
  initialConversations: WhatsappConversation[];
  initialUnreadCounts: Record<string, number>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState(initialConversations);
  const [unreadCounts, setUnreadCounts] = useState(initialUnreadCounts);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  async function importHistory() {
    if (importing) return;
    setImporting(true);
    setFeedback(null);
    try {
      // Novas conversas/mensagens chegam via Realtime (assinatura abaixo) —
      // não precisa recarregar a página manualmente.
      const response = await fetch("/api/whatsapp/import-history", {
        method: "POST",
      });
      if (!response.ok)
        throw new Error("Não foi possível importar o histórico agora.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível importar o histórico agora.",
      );
    } finally {
      setImporting(false);
    }
  }

  // Lista: qualquer conversa nova/atualizada da organização.
  useEffect(() => {
    const channel = supabase
      .channel(`whatsapp-conversations-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          setConversations((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter(
                (c) => c.id !== (payload.old as WhatsappConversation).id,
              );
            }
            const incoming = payload.new as WhatsappConversation;
            const next = prev.some((c) => c.id === incoming.id)
              ? prev.map((c) => (c.id === incoming.id ? incoming : c))
              : [incoming, ...prev];
            return next.sort(
              (a, b) =>
                new Date(b.last_message_at).getTime() -
                new Date(a.last_message_at).getTime(),
            );
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orgId]);

  // Thread da conversa aberta: carrega histórico e assina novas mensagens.
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((data ?? []) as WhatsappMessage[]);
        setMessagesLoading(false);
      });

    supabase
      .from("whatsapp_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", selectedId)
      .eq("direction", "inbound")
      .is("read_at", null)
      .then(() => {
        setUnreadCounts((prev) => ({ ...prev, [selectedId]: 0 }));
      });

    const channel = supabase
      .channel(`whatsapp-messages-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const incoming = payload.new as WhatsappMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
          if (incoming.direction === "inbound") {
            supabase
              .from("whatsapp_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id)
              .then(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedId, text }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Não foi possível enviar a mensagem.",
        );
      }
      if (data?.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id)
            ? prev
            : [...prev, data.message],
        );
      }
      setInput("");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a mensagem.",
      );
    } finally {
      setSending(false);
    }
  }

  async function toggleIa() {
    if (!selected || toggling) return;
    setToggling(true);
    setFeedback(null);
    const nextValue = !selected.ia_active;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selected.id ? { ...c, ia_active: nextValue } : c,
      ),
    );
    try {
      const response = await fetch("/api/whatsapp/toggle-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selected.id,
          iaActive: nextValue,
        }),
      });
      if (!response.ok)
        throw new Error("Não foi possível alterar a IA desta conversa.");
    } catch (error) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id ? { ...c, ia_active: !nextValue } : c,
        ),
      );
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a IA desta conversa.",
      );
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section
        className={
          "panel order-1 flex h-[calc(100dvh-11rem)] flex-col overflow-hidden lg:h-[calc(100dvh-9rem)] " +
          (selectedId ? "hidden lg:flex" : "flex")
        }
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="card-title">Conversas</h2>
            <p className="text-xs font-semibold text-ink-muted">
              {conversations.length}{" "}
              {conversations.length === 1 ? "conversa" : "conversas"}
            </p>
          </div>
          <button
            type="button"
            onClick={importHistory}
            disabled={importing}
            className="shrink-0 rounded-md bg-surface-2 px-2 py-1.5 text-[11px] font-black text-ink-muted hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            title="Importar histórico já existente desse número no WhatsApp"
          >
            {importing ? "Importando..." : "Importar histórico"}
          </button>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {conversations.length === 0 ? (
            <li className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700">
                <IconMessage className="h-6 w-6" />
              </span>
              <p className="text-sm font-bold text-ink">
                Nenhuma conversa ainda
              </p>
              <p className="text-xs font-medium text-ink-muted">
                Assim que alguém mandar mensagem no WhatsApp conectado, ela
                aparece aqui.
              </p>
            </li>
          ) : (
            conversations.map((conversation) => {
              const unread = unreadCounts[conversation.id] ?? 0;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={
                      "row-link flex w-full items-center gap-3 px-4 py-3 text-left " +
                      (selectedId === conversation.id ? "bg-brand-50" : "")
                    }
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-black text-ink-soft">
                      {initials(
                        conversation.contact_name ?? conversation.phone_number,
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink">
                          {conversation.contact_name ??
                            conversation.phone_number}
                        </span>
                        {unread > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-700 px-1 text-[11px] font-black text-white">
                            {Math.min(unread, 9)}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs font-medium text-ink-muted">
                        {conversation.phone_number}
                      </span>
                    </span>
                    <IconChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section
        className={
          "panel order-2 flex h-[calc(100dvh-11rem)] flex-col overflow-hidden lg:h-[calc(100dvh-9rem)] " +
          (selectedId ? "flex" : "hidden lg:flex")
        }
      >
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-ink-muted">
              <IconMessage className="h-6 w-6" />
            </span>
            <p className="text-sm font-bold text-ink-muted">
              Selecione uma conversa
            </p>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="nav-item grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-muted lg:hidden"
                  aria-label="Voltar para a lista"
                >
                  <IconChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-black text-ink-soft">
                  {initials(selected.contact_name ?? selected.phone_number)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-ink">
                    {selected.contact_name ?? selected.phone_number}
                  </p>
                  <p className="truncate text-xs font-medium text-ink-muted">
                    {selected.phone_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleIa}
                disabled={toggling}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-black " +
                  (selected.ia_active
                    ? "bg-success-50 text-success-700"
                    : "bg-surface-2 text-ink-muted")
                }
              >
                <IconBot className="h-3.5 w-3.5" />
                IA {selected.ia_active ? "ativa" : "pausada"}
              </button>
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4"
            >
              {messagesLoading ? (
                <p className="text-center text-xs font-semibold text-ink-muted">
                  Carregando...
                </p>
              ) : (
                messages.map((message) => {
                  const isOutbound = message.direction === "outbound";
                  return (
                    <div
                      key={message.id}
                      className={
                        "flex " + (isOutbound ? "justify-end" : "justify-start")
                      }
                    >
                      <div
                        className={
                          "max-w-[80%] space-y-1 rounded-2xl px-3.5 py-2 text-sm " +
                          (isOutbound
                            ? "rounded-br-sm bg-[linear-gradient(135deg,#7a1fff,#5c22e8)] text-white"
                            : "rounded-bl-sm bg-surface-2 text-ink")
                        }
                      >
                        {isOutbound && (
                          <span className="block text-[10px] font-black uppercase tracking-wide text-white/70">
                            {message.sent_by === "ai" ? "IA" : "Você"}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
              className="flex shrink-0 gap-2 border-t border-line px-4 py-3"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Digite uma mensagem..."
                maxLength={4000}
                className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3.5 text-sm font-medium text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="nav-item grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-700 text-white disabled:opacity-40"
                aria-label="Enviar mensagem"
              >
                <IconArrowRight className="h-5 w-5 -rotate-45" />
              </button>
            </form>
            {feedback ? (
              <p
                className="border-t border-danger-100 bg-danger-50 px-4 py-2 text-xs font-bold text-danger-700"
                role="alert"
              >
                {feedback}
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function initials(value: string) {
  const words = value.match(/[A-Za-zÀ-ÿ]+/g);
  if (!words) return <IconUsers className="h-4 w-4" />;
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}
