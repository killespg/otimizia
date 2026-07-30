"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { useAssistantChat } from "@/lib/ai/AssistantChatProvider";

export function LegalDashboardAssistant({
  suggestions,
}: {
  suggestions: string[];
}) {
  const [value, setValue] = useState("");
  // O provider de chat e global e guarda o historico de qualquer tela. Sem esta
  // trava, a barra exibia messages[length - 1] de uma conversa anterior: uma
  // resposta sem a pergunta visivel, as vezes com o vocabulario de outra
  // vertical. A fala do Tim so aparece depois que o usuario pergunta AQUI.
  const [asked, setAsked] = useState(false);
  const { messages, sending, status, send } = useAssistantChat();
  const last = messages.length ? messages[messages.length - 1] : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = value.trim();
    if (!question || sending) return;
    setValue("");
    setAsked(true);
    await send(question);
  }

  const response = asked
    ? status || (last?.role === "assistant" ? last.content : "")
    : "";

  return (
    <section className="border-y border-od-border py-3">
      <form onSubmit={submit} className="flex min-h-11 items-center gap-3">
        <Sparkles
          size={16}
          className="shrink-0 text-od-accent"
          strokeWidth={2}
        />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Pergunte ao Tim..."
          aria-label="Pergunte ao Tim"
          className="!min-h-0 min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-[13px] text-od-text !shadow-none outline-none placeholder:text-od-text-2"
        />
        <button
          type="submit"
          disabled={!value.trim() || sending}
          aria-label="Enviar pergunta"
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-od-accent text-white transition-colors hover:bg-brand-600 disabled:opacity-30"
        >
          <ArrowUp size={14} strokeWidth={2.5} />
        </button>
      </form>
      {response ? (
        <div className="border-t border-od-border px-7 py-3" aria-live="polite">
          <p className="text-xs font-semibold text-od-text-2">
            Tim
          </p>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-white/70">
            {response}
          </p>
        </div>
      ) : null}
      {suggestions.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-6 border-t border-od-border pt-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setValue(suggestion)}
              className="min-h-11 text-left text-[12px] font-medium text-od-accent-hover hover:text-white sm:min-h-8"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
