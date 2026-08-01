"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconArrowRight, IconBot, IconX } from "@/app/(dashboard)/painel/icons";
import { propertyStatusLabel, propertyTypeLabel, transactionTypeLabel } from "@/lib/real-estate/real-estate";
import type { RealEstatePropertyStatus, RealEstatePropertyType, RealEstateTransactionType } from "@/lib/supabase/types";

const FILTER_KEYS = ["status", "property_type", "transaction_type", "price_min", "price_max", "bedrooms_min", "neighborhood"] as const;

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type ChatMessage = { role: "user" | "assistant"; content: string };

function chipLabel(key: (typeof FILTER_KEYS)[number], value: string): string {
  switch (key) {
    case "status":
      return propertyStatusLabel(value as RealEstatePropertyStatus);
    case "property_type":
      return propertyTypeLabel(value as RealEstatePropertyType);
    case "transaction_type":
      return transactionTypeLabel(value as RealEstateTransactionType);
    case "price_min":
      return `A partir de ${currency.format(Number(value))}`;
    case "price_max":
      return `Até ${currency.format(Number(value))}`;
    case "bedrooms_min":
      return `${value}+ quartos`;
    case "neighborhood":
      return `Bairro: ${value}`;
    default:
      return value;
  }
}

export function PropertyFilterChat() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChips = FILTER_KEYS.map((key) => ({ key, value: searchParams.get(key) })).filter(
    (chip): chip is { key: (typeof FILTER_KEYS)[number]; value: string } => Boolean(chip.value)
  );

  function applyFilters(parsed: Record<string, unknown>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const key of FILTER_KEYS) {
      const value = parsed[key];
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function removeChip(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setSending(true);
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

    try {
      const res = await fetch("/api/imoveis/parse-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Não consegui interpretar agora.");
        return;
      }
      setMessages([...nextMessages, { role: "assistant", content: data.resposta || "Prontinho." }]);
      applyFilters(data);
    } catch {
      setError("Falha de conexão. Tenta de novo.");
    } finally {
      setSending(false);
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }

  return (
    <div className="border-b border-line pb-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <IconBot className="h-4 w-4 text-brand-700" />
        Filtrar conversando com a IA
      </div>

      {activeChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1 rounded bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
            >
              {chipLabel(chip.key, chip.value)}
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="press-sm grid h-3.5 w-3.5 place-items-center rounded hover:bg-brand-600/20"
                aria-label={`Remover filtro ${chipLabel(chip.key, chip.value)}`}
              >
                <IconX className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div ref={scrollRef} className="enter mt-3 max-h-40 space-y-2 overflow-y-auto rounded-lg bg-surface-2 p-2.5">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg rounded-br-sm bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white">
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={index} className="flex justify-start">
                <div className="max-w-[85%] rounded rounded-bl-sm bg-surface px-3 py-1.5 text-xs font-semibold text-ink">
                  {message.content}
                </div>
              </div>
            )
          )}
          {sending && (
            <div className="flex items-center gap-2 px-1 text-xs font-semibold text-ink-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />
              Interpretando…
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-danger-700">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
        className="mt-2.5 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ex: apartamento até 800 mil no Itaim com 2 quartos"
          maxLength={300}
          className="field h-10 flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="press-sm flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-700 text-white transition-opacity disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-600"
          aria-label="Enviar"
        >
          <IconArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
