import { Check, Paperclip, Send, Sparkles } from "lucide-react";

/**
 * Conversa da pessoa com o Tim, na moldura do produto (a mesma do
 * AiComposer: superfície com borda e sombra por fora, muted por dentro).
 *
 * O pitch do hero entra na fala: ele diz que já respondeu a Carla no
 * WhatsApp. Embaixo da resposta, o recibo do que já está na conta —
 * contato, negociação, visita — sem lista de ícones (que lia como card
 * de feature, não como chat).
 */
const ACOES = [
  "Contato · Carla Nogueira",
  "Negociação · Qualificação",
  "Visita · amanhã, 15h",
];

export function PhoneMockup() {
  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-lg border border-od-border bg-od-surface p-2 text-left shadow-od-card">
      <div className="rounded bg-od-muted-surface">
        <div className="flex items-center gap-2 border-b border-od-border px-4 py-3">
          <Sparkles className="size-3.5 shrink-0 text-od-accent-hover" strokeWidth={2} />
          <p className="text-[13px] font-semibold text-white">Tim</p>
        </div>

        <div className="space-y-2.5 px-4 pt-4">
          <p className="ml-auto w-fit max-w-[80%] rounded bg-od-accent/15 px-3.5 py-2 text-[13px] text-white">
            Quem eu preciso chamar hoje?
          </p>
          <div className="w-fit max-w-[88%]">
            <p className="rounded bg-white/[0.05] px-3.5 py-2 text-[13px] leading-relaxed text-white/80">
              A Carla mandou no WhatsApp agora perguntando do apartamento do Sumaré. Já respondi, criei o contato e deixei a visita marcada pra amanhã às 15h.
            </p>
            <ul className="mt-2 space-y-1.5 rounded bg-od-surface px-3 py-2.5">
              {ACOES.map((acao) => (
                <li key={acao} className="flex items-center gap-2 text-[12px] text-white/70">
                  <Check className="size-3.5 shrink-0 text-od-accent-hover" strokeWidth={2.5} />
                  {acao}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 px-4 text-sm text-white/60">Mensagem para o Tim…</div>
        <div className="flex items-center justify-between px-3.5 py-3">
          <div className="flex gap-2">
            <span className="grid size-11 place-items-center text-od-text-3" aria-hidden>
              <Paperclip className="size-[15px]" strokeWidth={2} />
            </span>
            <span className="grid size-11 place-items-center text-od-text-3" aria-hidden>
              <Sparkles className="size-[15px]" strokeWidth={2} />
            </span>
          </div>
          <span className="flex min-h-11 items-center gap-1.5 rounded bg-white/[0.06] px-4 text-[13px] font-semibold text-od-text-3">
            Enviar
            <Send className="size-[13px]" strokeWidth={2} />
          </span>
        </div>
      </div>
    </div>
  );
}
