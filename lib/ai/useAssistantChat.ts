"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ChatMessage = { role: "user" | "assistant"; content: string };

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

// Hook compartilhado por todas as superfícies de chat do app (widget
// flutuante e o painel embutido no dashboard) para conversar com
// /api/assistant sem duplicar a lógica de streaming.
export function useAssistantChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
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
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);
      setStatus("Pensando…");

      const history: ChatMessage[] = [
        ...messagesRef.current,
        { role: "user", content: trimmed },
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
          body: JSON.stringify({ messages: history }),
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

  return { messages, status, sending, send };
}
