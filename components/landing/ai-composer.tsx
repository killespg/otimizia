import * as React from "react";
import { Paperclip, Send, Sparkles } from "lucide-react";

/**
 * AI chat composer — the "Sócio-Assistente" entry point. Flat surface (no
 * glass, no decorative blur blob): one command lane defined by horizontal
 * rules. Attach/command icon buttons, send button and thinking status remain
 * part of the flow instead of becoming nested cards or chips.
 */
export function AiComposer() {
  return (
    <div className="border-b border-od-border py-10">
      <div className="mx-auto max-w-[520px]">
        <div className="mb-5 text-center">
          <h3 className="mb-1 text-xl font-semibold text-white">Como posso ajudar hoje?</h3>
          <p className="text-[13px] text-od-text-3">
            Pergunte sobre clientes, vendas ou lembretes
          </p>
        </div>

        <div className="border-y border-white/[0.08]">
          <div className="px-4 py-4 text-sm text-white/60">
            Mensagem para o Tim…
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] px-3.5 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="flex size-11 items-center justify-center text-white/45 transition-colors hover:bg-white/[0.035] hover:text-white/75"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="size-[15px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center text-white/45 transition-colors hover:bg-white/[0.035] hover:text-white/75"
                aria-label="Comandos"
              >
                <Sparkles className="size-[15px]" strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-4 py-2 text-[13px] font-semibold text-white/30"
              disabled
            >
              Enviar
              <Send className="size-[13px]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="inline-flex items-center gap-2.5 text-white/60">
            <span className="text-xs font-semibold text-white/60">Tim</span>
            <span className="text-[13px] text-white/60">Pensando</span>
            <span className="flex gap-1">
              {[0, 0.15, 0.3].map((delay) => (
                <span
                  key={delay}
                  className="size-[5px] animate-typing-dot rounded-full bg-white"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
