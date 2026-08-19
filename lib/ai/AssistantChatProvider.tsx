"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage, ConversationSummary } from "@/lib/ai/types";
import { NIL_CONVERSATION_UUID } from "@/lib/ai/types";

export type { ChatMessage, ConversationSummary };

export type PendingChatImage = { dataUrl: string; mediaType: string; base64: string };

// Lê o arquivo como base64 puro (sem o prefixo "data:application/pdf;base64,").
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler o arquivo."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

// Rótulos amigáveis mostrados enquanto uma ferramenta do CRM está rodando —
// o Tim narra o que está fazendo, não o nome técnico da ferramenta.
export const ASSISTANT_TOOL_LABELS: Record<string, string> = {
  list_contacts: "Consultando seus clientes…",
  get_contact: "Abrindo o contato…",
  list_deals: "Olhando seu funil…",
  list_tasks: "Consultando seus lembretes…",
  get_business_summary: "Analisando seu negócio…",
  create_contact: "Criando contato…",
  update_contact: "Atualizando seu painel…",
  log_interaction: "Registrando a conversa…",
  create_deal: "Criando a venda…",
  move_deal: "Atualizando seu painel…",
  create_task: "Criando o lembrete…",
  toggle_task: "Atualizando seu painel…",
  delete_contact: "Excluindo o contato…",
  delete_deal: "Excluindo a venda…",
  delete_task: "Excluindo o lembrete…",
};

type StreamEvent = {
  type?: "text" | "thinking" | "tool" | "done" | "error";
  text?: string;
  name?: string;
  message?: string;
  mutated?: boolean;
};

type AssistantChatValue = {
  messages: ChatMessage[];
  status: string | null;
  sending: boolean;
  conversationId: string | null;
  conversations: ConversationSummary[];
  send: (text: string, image?: PendingChatImage, file?: File | null) => Promise<void>;
  newChat: () => void;
  refreshConversations: () => Promise<void>;
  switchConversation: (id: string | null) => Promise<void>;
};

const AssistantChatContext = createContext<AssistantChatValue | null>(null);

// A conversa ativa do Tim fica guardada no localStorage do navegador para
// sobreviver a reloads e navegações: "novo chat" gera um uuid novo, e o
// histórico é sempre carregado da conversa que estava aberta.
const ACTIVE_CONVERSATION_KEY = "tim:active-conversation";

function readActiveConversation(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    return null;
  }
}

function persistActiveConversation(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
    else window.localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  } catch {
    // localStorage indisponível (modo privado etc.) não quebra o chat.
  }
}

// Estado único do chat com o assistente, compartilhado por todas as
// superfícies do app (balão flutuante, painel do dashboard e a página
// dedicada /assistant) para que todas mostrem a mesma conversa.
export function AssistantChatProvider({
  children,
  initialMessages = [],
}: {
  children: ReactNode;
  initialMessages?: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const sendingRef = useRef(false);
  const hasLocalActivityRef = useRef(initialMessages.length > 0);
  const conversationIdRef = useRef<string | null>(null);

  const updateMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    []
  );

  // Mantém o estado e o ref da conversa ativa em sincronia e guarda a escolha
  // no localStorage, para a próxima recarga voltar pra mesma conversa.
  const applyConversation = useCallback((id: string | null) => {
    conversationIdRef.current = id;
    setConversationId(id);
    persistActiveConversation(id);
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.conversations)) {
        setConversations(data.conversations as ConversationSummary[]);
      }
    } catch {
      // A listagem de conversas nunca deve quebrar o chat.
    }
  }, []);

  useEffect(() => {
    if (initialMessages.length > 0) return;

    let cancelled = false;
    async function loadHistory() {
      try {
        const storedConversation = readActiveConversation();
        const query = storedConversation
          ? `?conversation_id=${encodeURIComponent(storedConversation)}`
          : "";
        const res = await fetch(`/api/assistant/history${query}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const history = Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : [];
        const serverConversationId =
          typeof data?.conversation_id === "string" ? data.conversation_id : null;
        if (cancelled || hasLocalActivityRef.current) return;
        setMessages(history);
        messagesRef.current = history;
        // A conversa ativa é a que o servidor resolveu (a mais recente ou a
        // que veio do localStorage). Guarda pra próxima recarga.
        applyConversation(storedConversation ?? serverConversationId);
        void refreshConversations();
      } catch {
        // Historico do chat nao deve bloquear nem quebrar a navegacao.
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [initialMessages.length, applyConversation, refreshConversations]);

  const send = useCallback(
    async (text: string, image?: PendingChatImage, file?: File | null) => {
      const trimmed = text.trim();
      if ((!trimmed && !image && !file) || sendingRef.current) return;
      hasLocalActivityRef.current = true;
      sendingRef.current = true;
      setSending(true);
      setStatus(file ? "Lendo o PDF…" : "Tim está digitando…");

      // O PDF só é anexado nesta mensagem: depois de enviado, ele não fica
      // guardado no histórico local (só o nome, pra exibir), então turnos
      // seguintes não reenviam o base64 inteiro de novo a cada mensagem.
      let base64: string | null = null;
      if (file) {
        try {
          base64 = await readFileAsBase64(file);
        } catch {
          sendingRef.current = false;
          setSending(false);
          setStatus(null);
          updateMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Não consegui ler esse PDF. Tenta de novo." },
          ]);
          return;
        }
      }

      const displayText = trimmed || (file ? `Dá uma olhada nesse PDF: ${file.name}` : "");
      const priorHistory = messagesRef.current;
      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        role: "user",
        content: file ? displayText : trimmed,
        imageUrl: !file ? image?.dataUrl : undefined,
        attachmentName: file?.name,
        createdAt: now,
      };
      updateMessages(() => [
        ...priorHistory,
        userMessage,
        { role: "assistant", content: "", createdAt: now },
      ]);
      setStatus("Tim está digitando…");

      const appendToAssistant = (chunk: string) => {
        updateMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + chunk };
          }
          return next;
        });
      };

      const priorPayload = priorHistory.map(({ role, content }) => ({ role, content }));
      const requestBody = base64
        ? {
            conversation_id: conversationIdRef.current ?? null,
            messages: [
              ...priorPayload,
              {
                role: "user" as const,
                content: [
                  { type: "text", text: displayText },
                  {
                    type: "document",
                    source: { type: "base64", media_type: "application/pdf", data: base64 },
                  },
                ],
              },
            ],
          }
        : {
            conversation_id: conversationIdRef.current ?? null,
            messages: [
              ...priorPayload,
              { role: "user" as const, content: !trimmed && image ? "(foto)" : trimmed },
            ],
            image: image ? { mediaType: image.mediaType, data: image.base64 } : undefined,
          };

      let mutated = false;
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          appendToAssistant(data?.error ?? "Não consegui falar com o Tim agora. Tente novamente em instantes.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newline: number;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            switch (event.type) {
              case "text":
                setStatus(null);
                if (event.text) appendToAssistant(event.text);
                break;
              case "thinking":
                setStatus("Analisando seu negócio…");
                break;
              case "tool":
                setStatus(ASSISTANT_TOOL_LABELS[event.name ?? ""] ?? "Trabalhando nisso…");
                break;
              case "done":
                mutated = Boolean(event.mutated);
                break;
              case "error":
                mutated = Boolean(event.mutated) || mutated;
                appendToAssistant(
                  (event.message && `\n${event.message}`) || "\nAlgo deu errado. Tente novamente."
                );
                break;
            }
          }
        }
      } catch {
        appendToAssistant("\nA conexão caiu no meio do caminho. Tente de novo.");
      } finally {
        sendingRef.current = false;
        setSending(false);
        setStatus(null);
        // Remove balão vazio se nada foi respondido.
        updateMessages((prev) =>
          prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && !m.content))
        );
        if (mutated) router.refresh();
        void refreshConversations();
      }
    },
    [router, updateMessages, refreshConversations]
  );

  // Começa uma conversa limpa com o Tim: gera um id novo e zera o histórico
  // local. As próximas mensagens são salvas na nova conversa; as anteriores
  // continuam no banco (append-only) como a conversa antiga.
  const newChat = useCallback(() => {
    const freshId = crypto.randomUUID();
    applyConversation(freshId);
    hasLocalActivityRef.current = true;
    sendingRef.current = false;
    setSending(false);
    setStatus(null);
    setMessages([]);
    messagesRef.current = [];
  }, [applyConversation]);

  // Abre uma conversa antiga do histórico: carrega as mensagens dela do
  // servidor e a marca como ativa. id === null volta para a conversa
  // "clássica" (pré-0085) — pedindo explicitamente o sentinel NIL pro
  // servidor não resolver a conversa mais recente no lugar dela.
  const switchConversation = useCallback(
    async (id: string | null) => {
      if (sendingRef.current) return;
      hasLocalActivityRef.current = true;
      applyConversation(id);
      setSending(false);
      setStatus(null);
      try {
        const query = `?conversation_id=${encodeURIComponent(id ?? NIL_CONVERSATION_UUID)}`;
        const res = await fetch(`/api/assistant/history${query}`, { cache: "no-store" });
        const data = res.ok ? await res.json() : null;
        const history = Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : [];
        setMessages(history);
        messagesRef.current = history;
      } catch {
        setMessages([]);
        messagesRef.current = [];
      }
      void refreshConversations();
    },
    [applyConversation, refreshConversations]
  );

  return (
    <AssistantChatContext.Provider
      value={{ messages, status, sending, conversationId, conversations, send, newChat, refreshConversations, switchConversation }}
    >
      {children}
    </AssistantChatContext.Provider>
  );
}

export function useAssistantChat() {
  const ctx = useContext(AssistantChatContext);
  if (!ctx) {
    throw new Error("useAssistantChat precisa estar dentro de um AssistantChatProvider.");
  }
  return ctx;
}
