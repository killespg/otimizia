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
import type { ChatMessage } from "@/lib/ai/types";

export type { ChatMessage };

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
  send: (text: string, image?: PendingChatImage, file?: File | null) => Promise<void>;
};

const AssistantChatContext = createContext<AssistantChatValue | null>(null);

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
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  const sendingRef = useRef(false);
  const hasLocalActivityRef = useRef(initialMessages.length > 0);

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

  useEffect(() => {
    if (initialMessages.length > 0) return;

    let cancelled = false;
    async function loadHistory() {
      try {
        const res = await fetch("/api/assistant/history", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const history = Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : [];
        if (cancelled || hasLocalActivityRef.current || history.length === 0) return;
        setMessages(history);
        messagesRef.current = history;
      } catch {
        // Historico do chat nao deve bloquear nem quebrar a navegacao.
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [initialMessages.length]);

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
      }
    },
    [router, updateMessages]
  );

  return (
    <AssistantChatContext.Provider value={{ messages, status, sending, send }}>
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
