import * as React from "react";
import { Paperclip, Send, Sparkles } from "lucide-react";

/**
 * AI chat composer — entrada do sócio-assistente. O stage externo fornece o
 * vidro; aqui dentro há apenas uma faixa de comando translúcida e seus controles.
 */
export function AiComposer() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-[520px]">
        <div className="mb-5 text-center">
          <h3 className="mb-1 text-xl font-semibold text-white">Como posso ajudar hoje?</h3>
          <p className="text-[13px] text-od-text-3">
            Pergunte sobre clientes, vendas ou lembretes
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="px-4 py-4 text-sm text-white/60">
            Mensagem para o Tim…
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.06] px-3.5 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full text-od-text-3 transition-colors hover:bg-white/[0.055] hover:text-white/75"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="size-[15px]" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full text-od-text-3 transition-colors hover:bg-white/[0.055] hover:text-white/75"
                aria-label="Comandos"
              >
                <Sparkles className="size-[15px]" strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-4 text-[13px] font-semibold text-od-text-3"
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
