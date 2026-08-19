import * as React from "react";
import { Paperclip, Send, Sparkles } from "lucide-react";

/**
 * AI chat composer — the "Sócio-Assistente" entry point. Uma troca real de
 * mensagens, pra mostrar o que a conversa é de verdade (pergunta/ordem → Tim
 * executa), não só um campo vazio esperando texto. Attach/command icon
 * buttons e o botão de enviar seguem parte do fluxo, sem virar chips
 * aninhados.
 * (Sem `border-b`/`border-t` próprio: o SpotlightCard acima já fecha com uma
 * linha, e a próxima Section já abre com `border-t` — mais uma aqui era
 * redundante. A moldura é a mesma do preview do painel em
 * container-scroll-animation.tsx: superfície com borda e sombra por fora,
 * `od-muted-surface` por dentro, em vez de linhas soltas.)
 */
export function AiComposer() {
  return (
    <div className="py-10">
      <div className="mx-auto max-w-[520px]">
        <div className="mb-5 text-center">
          <h3 className="mb-1 text-xl font-semibold text-white">Como posso ajudar hoje?</h3>
          <p className="text-[13px] text-od-text-3">
            Pergunte sobre clientes, vendas ou lembretes
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-od-border bg-od-surface p-2 shadow-od-card">
          <div className="rounded bg-od-muted-surface">
            <div className="space-y-2.5 px-4 pt-4">
              <p className="ml-auto w-fit max-w-[80%] rounded bg-od-accent/15 px-3.5 py-2 text-[13px] text-white">
                Cadastra a Carla e abre uma negociação
              </p>
              <div className="w-fit max-w-[80%]">
                <span className="mb-1 block text-xs font-semibold text-white/50">Tim</span>
                <p className="rounded bg-white/[0.05] px-3.5 py-2 text-[13px] leading-relaxed text-white/80">
                  Cadastrei a Carla e abri uma negociação nova em Qualificação.
                </p>
              </div>
            </div>

            <div className="mt-4 px-4 text-sm text-white/60">Mensagem para o Tim…</div>
            <div className="flex items-center justify-between px-3.5 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex size-11 items-center justify-center text-od-text-3 transition-colors hover:bg-white/[0.035] hover:text-white/75"
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="size-[15px]" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="flex size-11 items-center justify-center text-od-text-3 transition-colors hover:bg-white/[0.035] hover:text-white/75"
                  aria-label="Comandos"
                >
                  <Sparkles className="size-[15px]" strokeWidth={2} />
                </button>
              </div>
              <button
                type="button"
                className="flex min-h-11 items-center gap-1.5 rounded bg-white/[0.06] px-4 text-[13px] font-semibold text-od-text-3"
                disabled
              >
                Enviar
                <Send className="size-[13px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
