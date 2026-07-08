"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type ChatMessage = { role: "user" | "assistant"; content: string; imageUrl?: string };

export type PendingChatImage = { dataUrl: string; mediaType: string; base64: string };

// Rótulos amigáveis mostrados enquanto uma ferramenta do CRM está rodando.
export const ASSISTANT_TOOL_LABELS: Record<string, string> = {
  list_contacts: "Consultando contatos…",
  get_contact: "Abrindo contato…",
  list_deals: "Consultando o funil…",
  list_tasks: "Consultando lembretes…",
  get_business_summary: "Calculando o resumo do negócio…",
  create_contact: "Criando contato…",
  update_contact: "Atualizando contato…",
  log_interaction: "Registrando conversa…",
  create_deal: "Criando venda…",
  move_deal: "Movendo venda…",
  create_task: "Criando lembrete…",
  toggle_task: "Atualizando lembrete…",
  delete_contact: "Excluindo contato…",
  delete_deal: "Excluindo venda…",
  delete_task: "Excluindo lembrete…",
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
  send: (text: string, image?: PendingChatImage) => Promise<void>;
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

  const send = useCallback(
    async (text: string, image?: PendingChatImage) => {
      const trimmed = text.trim();
      if ((!trimmed && !image) || sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);
      setStatus("Pensando…");

      const history: ChatMessage[] = [
        ...messagesRef.current,
        { role: "user", content: trimmed, imageUrl: image?.dataUrl },
      ];
      updateMessages(() => [...history, { role: "assistant", content: "" }]);

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

      let mutated = false;
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, content }, i) => ({
              role,
              content: i === history.length - 1 && !content.trim() && image ? "(foto)" : content,
            })),
            image: image ? { mediaType: image.mediaType, data: image.base64 } : undefined,
          }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          appendToAssistant(data?.error ?? "Não consegui falar com o assistente agora.");
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
                setStatus("Pensando…");
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
