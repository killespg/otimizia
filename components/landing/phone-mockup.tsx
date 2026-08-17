import { MessageCircle, UserPlus, TrendingUp, CalendarDays } from "lucide-react";

/**
 * O pitch do hero é "a IA atende seu WhatsApp" — então o card mostra isso,
 * não a pessoa conversando com o Tim. À esquerda a conversa do WhatsApp que
 * o Tim responde sozinho (cliente pergunta, ele qualifica e propõe horário);
 * à direita o que isso já virou na conta da empresa (contato criado,
 * negociação aberta, visita agendada). O texto do Tim explica a ação
 * ("criei o contato, abri negociação e deixei a visita marcada") pra ligar
 * as duas metades.
 *
 * Os dados são os mesmos nomes/valores do DashboardPreview (Carla Nogueira,
 * Qualificação, visita), pra ler como o mesmo mundo.
 */
const ACOES = [
  { icon: UserPlus, label: "Contato", detail: "Carla Nogueira criado" },
  { icon: TrendingUp, label: "Negociação", detail: "Aberta em Qualificação" },
  { icon: CalendarDays, label: "Visita", detail: "Amanhã, 15h" },
];

export function PhoneMockup() {
  return (
    <div className="w-full max-w-[440px] rounded-2xl border border-od-border bg-od-muted-surface text-left shadow-od-card">
      {/* Conversa do WhatsApp que o Tim responde */}
      <div className="flex items-center gap-2 border-b border-od-border px-4 py-2.5">
        <span className="grid size-5 shrink-0 place-items-center rounded-md bg-[#25D366]/15 text-[#25D366]">
          <MessageCircle className="size-3" strokeWidth={2.5} />
        </span>
        <p className="text-[11px] font-semibold text-white/70">WhatsApp · atendido pelo Tim</p>
      </div>

      <div className="space-y-2.5 px-4 py-4">
        <div className="w-fit max-w-[82%]">
          <span className="mb-1 block text-[10px] font-semibold text-white/45">Carla Nogueira · cliente</span>
          <p className="rounded-xl rounded-tl-sm bg-white/[0.06] px-3.5 py-2 text-[13px] leading-relaxed text-white/85">
            Boa tarde! Aquele apartamento do Sumaré ainda está disponível? Consigo visitar amanhã?
          </p>
        </div>

        <div className="ml-auto w-fit max-w-[88%]">
          <span className="mb-1 block text-right text-[10px] font-semibold text-white/45">Tim · resposta automática</span>
          <p className="rounded-xl rounded-tr-sm bg-od-accent px-3.5 py-2 text-[13px] leading-relaxed text-white">
            Boa tarde, Carla! Está disponível sim. Consigo agendar amanhã às 15h — confirma pra você? Já deixei seu contato e a visita organizados por aqui.
          </p>
        </div>
      </div>

      {/* O que isso já virou na conta */}
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
