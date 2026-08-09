import * as React from "react";
import { Paperclip, Send, Sparkles } from "lucide-react";

/**
 * A conversa com o Tim.
 *
 * Uma troca real de mensagens, pra mostrar o que a conversa é de verdade
 * (ordem → Tim executa), não um campo vazio esperando texto: as tools em
 * `lib/ai/tools` escrevem no banco.
 *
 * Duas coisas saíram daqui. O "Como posso ajudar hoje?" era um terceiro título
 * falando do Tim na mesma tela em que a seção já tem o dela — a seção titula, o
 * componente demonstra. E a moldura era dupla, um painel com borda por fora e
 * outra superfície por dentro; ficou uma só, que é a regra de não aninhar card
 * (regra 4).
 */
export function AiComposer() {
  return (
    <div data-landing-stage="tim" className="landing-cinematic-stage landing-cinematic-stage--quiet mx-auto max-w-[560px] overflow-hidden">
      <div className="space-y-3 px-4 pt-5 sm:px-5">
        <p
          data-landing-passive-surface="user-message"
          className="ml-auto w-fit max-w-[85%] rounded-lg border border-od-accent/20 bg-white/[0.055] px-3.5 py-2 text-[13px] text-od-text"
        >
          Cadastra a Carla e abre uma negociação
        </p>
        <div className="w-fit max-w-[85%]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.04em] text-od-text-3">
            Tim
          </span>
          <p
            data-landing-passive-surface="tim-reply"
            className="rounded-lg bg-white/[0.05] px-3.5 py-2 text-[13px] leading-relaxed text-od-text-2"
          >
            Prontinho — cadastrei a Carla e abri uma negociação nova em Qualificação.
          </p>
        </div>
      </div>

      {/* Régua de estrutura, não de item: separa o histórico do campo de
          escrita, e é uma só nesta fronteira (regra 4a). */}
      <div className="mt-5 border-t border-od-border px-4 pt-3 sm:px-5">
        <p className="text-sm text-od-text-3">Mensagem para o Tim…</p>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex">
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-lg text-od-text-3 transition-colors hover:bg-white/[0.05] hover:text-od-text-2"
              aria-label="Anexar arquivo"
            >
              <Paperclip className="size-[15px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-lg text-od-text-3 transition-colors hover:bg-white/[0.05] hover:text-od-text-2"
              aria-label="Comandos"
            >
              <Sparkles className="size-[15px]" strokeWidth={2} />
            </button>
          </div>
          <button type="button" className="btn-soft text-[13px]" disabled>
            Enviar
            <Send className="size-[13px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
