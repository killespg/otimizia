import { UserPlus, TrendingUp, CalendarDays } from "lucide-react";

/**
 * Conversa da pessoa com o Tim, não um WhatsApp fingido. O pitch do hero
 * ("a IA atende seu WhatsApp") entra na fala do Tim: ele diz que já
 * respondeu a Carla no WhatsApp. Embaixo, o que isso já virou na conta
 * (contato, negociação, visita) — a integração com a empresa, sem
 * desenhar um segundo chat.
 *
 * Os dados são os mesmos nomes/valores do DashboardPreview (Carla
 * Nogueira, Qualificação, visita), pra ler como o mesmo mundo.
 */
const ACOES = [
  { icon: UserPlus, label: "Contato", detail: "Carla Nogueira criado" },
  { icon: TrendingUp, label: "Negociação", detail: "Aberta em Qualificação" },
  { icon: CalendarDays, label: "Visita", detail: "Amanhã, 15h" },
];

export function PhoneMockup() {
  return (
    <div className="w-full max-w-[440px] rounded-2xl border border-od-border bg-od-muted-surface text-left shadow-od-card">
      <div className="space-y-2.5 px-4 py-4">
        <p className="ml-auto w-fit max-w-[82%] rounded-xl bg-od-accent px-3.5 py-2 text-[13px] text-white">
          Quem eu preciso chamar hoje?
        </p>
        <div className="w-fit max-w-[88%]">
          <span className="mb-1 block text-[11px] font-semibold text-white/45">Tim</span>
          <p className="rounded-xl bg-white/[0.06] px-3.5 py-2 text-[13px] leading-relaxed text-white/80">
            A Carla mandou no WhatsApp agora perguntando do apartamento do Sumaré. Já respondi, criei o contato e deixei a visita marcada pra amanhã às 15h.
          </p>
        </div>
      </div>

      <div className="border-t border-od-border px-4 py-3.5">
        <p className="text-[11px] font-semibold text-od-text-3">No seu painel, já</p>
        <ul className="mt-2.5 space-y-2">
          {ACOES.map((acao) => (
            <li key={acao.label} className="flex items-center gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-od-accent-tint text-od-accent-soft">
                <acao.icon className="size-3.5" strokeWidth={2.5} />
              </span>
              <p className="min-w-0 text-[12px] text-white/70">
                <span className="font-semibold text-white">{acao.label}</span>
                <span className="text-od-text-3"> · {acao.detail}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
