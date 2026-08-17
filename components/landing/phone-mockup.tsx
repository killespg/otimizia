import { Bell } from "lucide-react";

/**
 * Amostra de conversa com o Tim que aterrissa a promessa mobile da landing.
 *
 * Não é uma carcaça de celular (borda grossa, ilha, barra de status falsa
 * ficavam de brinquedo) — é um card de chat limpo, na superfície do produto,
 * que funciona ao lado do hero no desktop e empilhado no mobile. A
 * notificação acima da conversa mostra o "app no celular" sem desenhar um
 * telefone.
 *
 * Os dados são os mesmos nomes/exemplos que o DashboardPreview usa (Carla,
 * orçamento vencendo hoje), pra ler como o mesmo mundo, não outro.
 */
export function PhoneMockup() {
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-od-border bg-od-muted-surface p-4 text-left shadow-od-card">
      {/* Notificação: o "app instalável, notificação no celular" sem telefone. */}
      <div className="flex items-center gap-2.5 rounded-xl border border-od-border bg-od-surface p-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-od-accent text-white">
          <Bell className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white">OtimizIA · agora</p>
          <p className="truncate text-[12px] text-od-text-3">Compromisso às 15h com a Carla Nogueira</p>
        </div>
      </div>

      {/* Conversa com o Tim */}
      <div className="mt-3 space-y-2.5 px-0.5">
        <p className="ml-auto w-fit max-w-[82%] rounded-xl bg-od-accent px-3.5 py-2 text-[13px] text-white">
          Quem eu preciso chamar hoje?
        </p>
        <div className="w-fit max-w-[88%]">
          <span className="mb-1 block text-[11px] font-semibold text-white/45">Tim</span>
          <p className="rounded-xl bg-white/[0.06] px-3.5 py-2 text-[13px] leading-relaxed text-white/80">
            Três pessoas. A Carla tem orçamento vencendo hoje, o Igor combinou retorno pra tarde e a Freelab está há 6 dias sem resposta.
          </p>
        </div>
      </div>
    </div>
  );
}
