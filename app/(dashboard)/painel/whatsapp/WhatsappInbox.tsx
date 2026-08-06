"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compressImage } from "@/lib/utils/image-compress";
import { createClient } from "@/lib/supabase/client";
import type { WhatsappConversation, WhatsappMessage } from "@/lib/supabase/types";
import {
  IconArrowRight,
  IconBot,
  IconChevronRight,
  IconMessage,
  IconMic,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconUsers,
  IconX,
} from "../icons";

type ShareCollection = { id: string; title: string; token: string };

export function WhatsappInbox({
  orgId,
  initialConversations,
  initialUnreadCounts,
  initialPreviews = {},
  shareCollections = [],
}: {
  orgId: string;
  initialConversations: WhatsappConversation[];
  initialUnreadCounts: Record<string, number>;
  initialPreviews?: Record<string, { content: string; outbound: boolean }>;
  shareCollections?: ShareCollection[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState(initialConversations);
  const [unreadCounts, setUnreadCounts] = useState(initialUnreadCounts);
  const [previews, setPreviews] = useState(initialPreviews);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  // Busca dentro da conversa aberta (destaca e filtra as mensagens).
  const [threadQuery, setThreadQuery] = useState("");
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  // Anexo de imagem pendente (vai junto no próximo envio, com legenda opcional).
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; mediaType: string; data: string; name: string } | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const visibleConversations = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      `${c.contact_name ?? ""} ${c.phone_number}`.toLowerCase().includes(term)
    );
  }, [conversations, query]);

  // Mensagens exibidas: com busca ativa, só as que contêm o termo.
  const visibleMessages = useMemo(() => {
    const term = threadQuery.trim().toLowerCase();
    if (!term) return messages;
    return messages.filter((m) => (m.content ?? "").toLowerCase().includes(term));
  }, [messages, threadQuery]);

  async function pickImage(picked: File | null | undefined) {
    setAttachError(null);
    if (!picked) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(picked.type)) {
      setAttachError("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    // Reduz antes de virar base64: foto de celular vai a 3–8 MB e passaria do
    // limite (além de pesar no upload e no armazenamento).
    let file = picked;
    try {
      file = (await compressImage(picked)).file;
    } catch {
      /* segue com o original; o limite abaixo ainda protege */
    }
    if (file.size > 6 * 1024 * 1024) {
      setAttachError("A imagem precisa ter até 6 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.split(",")[1] ?? "";
      if (!base64) {
        setAttachError("Não consegui ler essa imagem.");
        return;
      }
      setPendingImage({ dataUrl, mediaType: file.type, data: base64, name: file.name });
    };
    reader.onerror = () => setAttachError("Não consegui ler essa imagem.");
    reader.readAsDataURL(file);
  }

  async function importHistory() {
    if (importing) return;
    setImporting(true);
    try {
      await fetch("/api/whatsapp/import-history", { method: "POST" });
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    const channel = supabase
      .channel(`whatsapp-conversations-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations", filter: `org_id=eq.${orgId}` },
        (payload) => {
          setConversations((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((c) => c.id !== (payload.old as WhatsappConversation).id);
            }
            const incoming = payload.new as WhatsappConversation;
            const next = prev.some((c) => c.id === incoming.id)
              ? prev.map((c) => (c.id === incoming.id ? incoming : c))
              : [incoming, ...prev];
            return next.sort(
              (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, orgId]);

  // Com uma conversa aberta, o celular entra em "modo chat": topbar e barra de
  // abas somem (regra em globals.css, só abaixo de 1024px) e a conversa fica em
  // tela cheia, como no WhatsApp. Sair da conversa devolve a navegação.
  useEffect(() => {
    if (!selectedId) return;
    document.body.dataset.chatFullscreen = "1";
    return () => {
      delete document.body.dataset.chatFullscreen;
    };
  }, [selectedId]);

  // Trocou de conversa: zera busca interna, anexo e menu de ações.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setThreadQuery("");
      setThreadSearchOpen(false);
      setPendingImage(null);
      setAttachError(null);
      setActionsOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      const frame = window.requestAnimationFrame(() => setMessages([]));
      return () => window.cancelAnimationFrame(frame);
    }
    let cancelled = false;
    const loadingFrame = window.requestAnimationFrame(() => {
      if (!cancelled) setMessagesLoading(true);
    });
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
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          const incoming = payload.new as WhatsappMessage;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          setPreviews((prev) => ({
            ...prev,
            [incoming.conversation_id]: {
              content: incoming.content ?? "",
              outbound: incoming.direction === "outbound",
            },
          }));
          if (incoming.direction === "inbound") {
            supabase
              .from("whatsapp_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(loadingFrame);
      supabase.removeChannel(channel);
    };
  }, [supabase, selectedId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if ((!text && !pendingImage) || !selectedId || sending) return;
    setSending(true);
    const image = pendingImage;
    setInput("");
    setPendingImage(null);
    setAttachError(null);
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId,
          text,
          ...(image ? { image: { mediaType: image.mediaType, data: image.data } } : {}),
        }),
      });
      const data = await response.json();
      if (response.ok && data.message) {
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
        setPreviews((prev) => ({
          ...prev,
          [selectedId]: { content: text || (image ? "Foto" : ""), outbound: true },
        }));
      } else if (data?.error) {
        setAttachError(data.error);
        setInput(text);
        setPendingImage(image);
      }
    } finally {
      setSending(false);
    }
  }

  // Ações rápidas: montam a mensagem no campo (o corretor revisa e envia).
  // O campo é de uma linha só, então os trechos são separados por espaço —
  // quebra de linha aqui sumiria e grudaria as partes.
  function insertText(snippet: string) {
    setActionsOpen(false);
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${snippet}` : snippet));
  }

  function shareVitrine(collection: ShareCollection) {
    const url = `${window.location.origin}/share/imoveis/${collection.token}`;
    insertText(`Separei uma seleção de imóveis pra você — ${collection.title}: ${url}`);
  }

  async function toggleIa() {
    if (!selected || toggling) return;
    setToggling(true);
    const nextValue = !selected.ia_active;
    setConversations((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ia_active: nextValue } : c)));
    try {
      await fetch("/api/whatsapp/toggle-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, iaActive: nextValue }),
      });
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
      {/* Coluna de conversas — no celular ela É a tela até você abrir um chat. */}
      <section
        className={
          "order-1 flex min-h-0 flex-col overflow-hidden border-white/[0.08] lg:border-r " +
          (selectedId ? "hidden lg:flex" : "flex")
        }
      >
        <div className="shrink-0 px-3 pb-2 pt-3">
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <h1 className="text-[17px] font-semibold text-white">Conversas</h1>
            <button
              type="button"
              onClick={importHistory}
              disabled={importing}
              className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-od-text-3 hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
              title="Importar histórico já existente desse número no WhatsApp"
            >
              {importing ? "Importando…" : "Importar"}
            </button>
          </div>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-od-text-3" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar"
              aria-label="Pesquisar conversa"
              className="w-full rounded-lg border-0 bg-white/[0.05] pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-od-text-3 focus:bg-white/[0.07]"
              style={{ minHeight: "2.25rem" }}
            />
          </div>
        </div>

        {/* pb no celular: a barra de abas flutua por cima, então a última
            conversa precisa de folga pra não ficar escondida atrás dela. */}
        <ul className="min-h-0 flex-1 overflow-y-auto pb-28 lg:pb-0">
          {conversations.length === 0 ? (
            <li className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-white/[0.06] text-od-text-3">
                <IconMessage className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold text-white">Nenhuma conversa ainda</p>
              <p className="text-xs text-od-text-3">
                Assim que alguém mandar mensagem no WhatsApp conectado, ela aparece aqui.
              </p>
            </li>
          ) : visibleConversations.length === 0 ? (
            <li className="px-4 py-10 text-center text-[13px] text-od-text-3">Nenhuma conversa encontrada.</li>
          ) : (
            visibleConversations.map((conversation) => {
              const unread = unreadCounts[conversation.id] ?? 0;
              const preview = previews[conversation.id];
              const active = selectedId === conversation.id;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={
                      "flex w-full items-center gap-3 pl-3 pr-3 text-left transition-colors " +
                      (active ? "bg-white/[0.07]" : "hover:bg-white/[0.035]")
                    }
                  >
                    <ConversationAvatar
                      name={conversation.contact_name ?? conversation.phone_number}
                      profilePicUrl={conversation.profile_pic_url}
                      size="size-12"
                      textSize="text-[13px]"
                    />
                    {/* Divisória começa depois do avatar, como no WhatsApp. */}
                    <span className="flex min-w-0 flex-1 flex-col justify-center border-t border-white/[0.06] py-3">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-medium text-white">
                          {conversation.contact_name ?? conversation.phone_number}
                        </span>
                        <span
                          className={
                            "shrink-0 text-xs tabular-nums " +
                            (unread > 0 ? "font-semibold text-od-text-2" : "text-od-text-3")
                          }
                        >
                          {listTime(conversation.last_message_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span
                          className={
                            "min-w-0 flex-1 truncate text-[13px] " +
                            (unread > 0 ? "text-white/70" : "text-od-text-3")
                          }
                        >
                          {preview
                            ? (preview.outbound ? "Você: " : "") + preview.content
                            : conversation.phone_number}
                        </span>
                        {unread > 0 ? (
                          <span className="grid min-w-[20px] shrink-0 place-items-center rounded-full bg-od-accent px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                            {unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Conversa. No celular ela vira uma camada em tela cheia por cima de
          tudo (inclusive da barra de abas), como acontece ao abrir um chat no
          WhatsApp — senão o compositor fica escondido atrás da barra. No
          desktop volta a ser a coluna da direita. */}
      <section
        className={
          "order-2 min-h-0 flex-col overflow-hidden lg:static lg:z-auto lg:bg-transparent " +
          (selectedId
            ? "fixed inset-0 z-[var(--z-modal)] flex bg-[var(--od-muted-surface-solid)] lg:flex"
            : "hidden lg:flex")
        }
      >
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 border-l border-white/[0.06] px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-white/[0.05] text-od-text-3">
              <IconMessage className="h-8 w-8" />
            </span>
            <p className="text-[15px] font-medium text-white/70">WhatsApp do seu negócio</p>
            <p className="max-w-sm text-[13px] leading-relaxed text-od-text-3">
              Escolha uma conversa à esquerda para ver as mensagens. O Tim pode responder sozinho quando a IA
              estiver ativa.
            </p>
          </div>
        ) : (
          <>
            {/* Cabeçalho da conversa */}
            <div className="flex shrink-0 items-center justify-between gap-3 bg-white/[0.03] px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] lg:pt-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/[0.06] lg:hidden"
                  aria-label="Voltar para a lista"
                >
                  <IconChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <ConversationAvatar
                  name={selected.contact_name ?? selected.phone_number}
                  profilePicUrl={selected.profile_pic_url}
                  size="size-10"
                  textSize="text-[12px]"
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-white">
                    {selected.contact_name ?? selected.phone_number}
                  </p>
                  <p className="truncate text-[12px] text-od-text-3">{selected.phone_number}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setThreadSearchOpen((open) => !open);
                    setThreadQuery("");
                  }}
                  aria-label="Buscar nesta conversa"
                  aria-pressed={threadSearchOpen}
                  className={
                    "grid size-9 place-items-center rounded-full transition-colors " +
                    (threadSearchOpen ? "bg-white/[0.08] text-white" : "text-od-text-3 hover:bg-white/[0.06]")
                  }
                  title="Buscar nesta conversa"
                >
                  <IconSearch className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleIa}
                  disabled={toggling}
                  className={
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
                    (selected.ia_active
                      ? "bg-white/[0.06] text-od-text hover:bg-white/[0.04]"
                      : "text-od-text-3 hover:bg-white/[0.06]")
                  }
                  title={
                    selected.ia_active
                      ? "A IA responde automaticamente. Clique para pausar."
                      : "Você responde manualmente. Clique para ativar a IA."
                  }
                >
                  <IconBot className="h-3.5 w-3.5" />
                  IA {selected.ia_active ? "ativa" : "pausada"}
                </button>
              </div>
            </div>

            {threadSearchOpen ? (
              <div className="flex shrink-0 items-center gap-2 border-t border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <IconSearch className="h-3.5 w-3.5 shrink-0 text-od-text-3" />
                <input
                  autoFocus
                  value={threadQuery}
                  onChange={(event) => setThreadQuery(event.target.value)}
                  placeholder="Buscar nesta conversa"
                  aria-label="Buscar nesta conversa"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-od-text-3"
                />
                <span className="shrink-0 text-xs tabular-nums text-od-text-3">
                  {threadQuery.trim()
                    ? `${visibleMessages.length} ${visibleMessages.length === 1 ? "resultado" : "resultados"}`
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setThreadSearchOpen(false);
                    setThreadQuery("");
                  }}
                  aria-label="Fechar busca"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-od-text-3 hover:bg-white/[0.06] hover:text-white"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            {/* Mensagens sobre o papel de parede */}
            <div
              ref={scrollRef}
              className="chat-wallpaper min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 lg:px-16"
            >
              {messagesLoading ? (
                <p className="text-center text-xs font-semibold text-od-text-3">Carregando…</p>
              ) : visibleMessages.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-od-text-3">
                  {threadQuery.trim() ? "Nenhuma mensagem com esse termo." : "Nenhuma mensagem ainda."}
                </p>
              ) : (
                visibleMessages.map((message, index) => {
                  const isOutbound = message.direction === "outbound";
                  const prev = visibleMessages[index - 1];
                  const next = visibleMessages[index + 1];
                  const firstInGroup = prev?.direction !== message.direction;
                  const lastInGroup = next?.direction !== message.direction;
                  const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(message.created_at);
                  return (
                    <div key={message.id}>
                      {showDay ? (
                        <div className="flex justify-center py-3">
                          <span className="rounded-md bg-black/35 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/55">
                            {dayLabel(message.created_at)}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={
                          (lastInGroup ? "mb-2.5" : "mb-1") +
                          " flex " +
                          (isOutbound ? "justify-end" : "justify-start")
                        }
                      >
                        <div
                          className={
                            "relative max-w-[85%] px-2.5 pb-[18px] pt-1.5 text-[14px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,0.35)] sm:max-w-[65%] " +
                            (isOutbound ? "bg-od-accent text-white" : "bg-[var(--od-muted-surface-solid)] text-white/92")
                          }
                          style={{
                            borderRadius: firstInGroup
                              ? isOutbound
                                ? "8px 2px 8px 8px"
                                : "2px 8px 8px 8px"
                              : "8px",
                          }}
                        >
                          {/* Rabinho triangular só na primeira bolha do grupo. */}
                          {firstInGroup ? (
                            <span
                              aria-hidden="true"
                              className="absolute top-0 block size-0"
                              style={
                                isOutbound
                                  ? {
                                      right: "-7px",
                                      borderTop: "8px solid var(--od-accent)",
                                      borderRight: "8px solid transparent",
                                    }
                                  : {
                                      left: "-7px",
                                      borderTop: "8px solid var(--od-muted-surface-solid)",
                                      borderLeft: "8px solid transparent",
                                    }
                              }
                            />
                          ) : null}
                          {/* Meta ancorada no canto inferior direito e o texto
                              reservando espaço pra ela (padding à direita na
                              última linha) — é assim que o WhatsApp evita que
                              mensagens curtas quebrem em várias linhas. */}
                          {message.media_url && message.message_type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={message.media_url}
                              alt={message.content ?? "Imagem enviada"}
                              loading="lazy"
                              className="mb-1 max-h-72 w-full rounded object-cover"
                            />
                          ) : null}
                          {message.media_url && message.message_type === "audio" ? (
                            <audio controls src={message.media_url} className="mb-1 w-full" />
                          ) : null}
                          {message.media_url && message.message_type === "document" ? (
                            <a
                              href={message.media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mb-1 flex items-center gap-2 rounded border border-white/15 px-2.5 py-2 text-sm text-white/90 hover:bg-white/5"
                            >
                              <IconPaperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
                              Abrir documento
                            </a>
                          ) : null}
                          {!message.media_url &&
                          (message.message_type === "image" ||
                            message.message_type === "audio" ||
                            message.message_type === "document") &&
                          !message.content ? (
                            <p className="pr-12 text-xs text-white/70">Anexo expirado</p>
                          ) : null}
                          {message.content ? (
                            <p
                              className="whitespace-pre-wrap break-words"
                              style={{ paddingRight: isOutbound ? (message.sent_by === "ai" ? 74 : 58) : 42 }}
                            >
                              {highlight(message.content, threadQuery)}
                            </p>
                          ) : (
                            <p style={{ paddingRight: isOutbound ? 58 : 42 }} />
                          )}
                          <span className="absolute bottom-1 right-2.5 flex items-center gap-1 text-xs leading-none text-white/75">
                            {isOutbound && message.sent_by === "ai" ? (
                              <IconBot className="h-3 w-3" aria-label="Enviado pela IA" />
                            ) : null}
                            {msgTime(message.created_at)}
                            {isOutbound ? <DoubleCheck /> : null}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 bg-white/[0.03] pb-[env(safe-area-inset-bottom)]">
              {pendingImage ? (
                <div className="flex items-center gap-3 px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingImage.dataUrl} alt="" className="size-12 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-white/60">{pendingImage.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    aria-label="Remover imagem"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-od-text-3 hover:bg-white/[0.06] hover:text-white"
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              {attachError ? (
                <p className="px-3 pt-2 text-[12px] font-medium text-[#fb7767]">{attachError}</p>
              ) : null}

              {actionsOpen ? (
                <div className="border-b border-white/[0.06] px-3 py-2">
                  <p className="pb-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-od-text-3">
                    Ações rápidas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        insertText("Consigo te mostrar o imóvel pessoalmente. Qual dia e horário ficam melhores pra você?")
                      }
                      className="rounded border border-white/[0.09] px-2.5 py-1.5 text-[12px] font-medium text-white/70 hover:bg-white/[0.05] hover:text-white"
                    >
                      Agendar visita
                    </button>
                    {shareCollections.map((collection) => (
                      <button
                        key={collection.id}
                        type="button"
                        onClick={() => shareVitrine(collection)}
                        className="max-w-[240px] truncate rounded border border-od-accent/25 bg-white/[0.06] px-2.5 py-1.5 text-[12px] font-medium text-od-text hover:bg-white/[0.04]"
                        title={`Enviar a vitrine "${collection.title}"`}
                      >
                        Vitrine: {collection.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage();
                }}
                className="flex items-end gap-1.5 px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => setActionsOpen((open) => !open)}
                  aria-expanded={actionsOpen}
                  className={
                    "grid size-10 shrink-0 place-items-center rounded-full transition-colors " +
                    (actionsOpen ? "bg-white/[0.08] text-white" : "text-od-text-3 hover:bg-white/[0.06] hover:text-white/70")
                  }
                  aria-label="Ações rápidas"
                  title="Ações rápidas"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    pickImage(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-od-text-3 hover:bg-white/[0.06] hover:text-white/70"
                  aria-label="Anexar imagem"
                  title="Anexar imagem"
                >
                  <IconPaperclip className="h-5 w-5" />
                </button>
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={pendingImage ? "Adicione uma legenda (opcional)" : "Digite uma mensagem"}
                  maxLength={4000}
                  className="min-w-0 flex-1 rounded-lg border-0 bg-white/[0.06] px-4 text-[14px] text-white outline-none placeholder:text-od-text-3 focus:bg-white/[0.08]"
                  style={{ minHeight: "2.625rem" }}
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-od-accent text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
                  aria-label={input.trim() || pendingImage ? "Enviar mensagem" : "Gravar áudio"}
                >
                  {input.trim() || pendingImage ? (
                    <IconArrowRight className="h-4 w-4 -rotate-45" />
                  ) : (
                    <IconMic className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// Destaca o termo buscado dentro do texto da mensagem.
function highlight(text: string, term: string) {
  const needle = term.trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const target = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let found = lower.indexOf(target, cursor);
  let key = 0;
  while (found !== -1) {
    if (found > cursor) parts.push(text.slice(cursor, found));
    parts.push(
      <mark key={key++} className="rounded-sm bg-amber-300/80 px-0.5 text-black">
        {text.slice(found, found + needle.length)}
      </mark>
    );
    cursor = found + needle.length;
    found = lower.indexOf(target, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function DoubleCheck() {
  return (
    <svg viewBox="0 0 18 12" className="h-3 w-3.5 shrink-0" fill="none" aria-label="Entregue">
      <path d="M1 6.5 4 9.5 10 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 9.5 13.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function msgTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return "Hoje";
  if (sameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function listTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return msgTime(iso);
  if (sameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function initials(value: string) {
  const words = value.match(/[A-Za-zÀ-ÿ]+/g);
  if (!words) return <IconUsers className="h-5 w-5" />;
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

// Foto de perfil do WhatsApp quando a Evolution já trouxe uma (ver
// lib/whatsapp/evolution.ts); cai pras iniciais de sempre quando não tem
// (contato sem foto, ou ainda não sincronizada) ou se a URL falhar ao
// carregar. <img> comum, não next/image — mesmo padrão já usado nos anexos
// de mensagem aqui embaixo, pra não depender de allow-list de domínio.
function ConversationAvatar({
  name,
  profilePicUrl,
  size,
  textSize,
}: {
  name: string;
  profilePicUrl: string | null;
  size: "size-10" | "size-12";
  textSize: "text-[12px]" | "text-[13px]";
}) {
  const [failed, setFailed] = useState(false);
  if (profilePicUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePicUrl}
        alt=""
        className={`${size} shrink-0 rounded-full object-cover`}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-white/[0.08] ${textSize} font-semibold text-white/70`}>
      {initials(name)}
    </span>
  );
}
