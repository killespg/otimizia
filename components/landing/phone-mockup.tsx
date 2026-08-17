import { Bell } from "lucide-react";

/**
 * Mockup de celular que aterrissa a promessa mobile da landing: notificação
 * antes do compromisso + o Tim respondendo. A página fala "app instalável,
 * notificação no celular" só em texto; isto mostra.
 *
 * Não é o produto real rodando — é estático, só pra dar a imagem. Os dados
 * são os mesmos nomes/exemplos que o DashboardPreview usa (Carla, orçamento
 * vencendo hoje), pra ler como o mesmo mundo, não outro.
 */
export function PhoneMockup() {
  return (
    <div className="mx-auto mt-14 w-full max-w-[300px]">
      <div className="relative rounded-[2.25rem] border border-od-border bg-od-sidebar p-2.5 shadow-od-card">
        {/* Ilha da câmera */}
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black/80" />

        <div className="overflow-hidden rounded-[1.75rem] bg-od-bg">
          {/* Barra de status */}
          <div className="flex items-center justify-between px-5 pb-2 pt-7 text-[11px] font-semibold text-white/70">
            <span>09:41</span>
            <span className="flex items-center gap-1">
              <span aria-hidden className="inline-block h-2 w-3 rounded-[2px] bg-white/40" />
              <span aria-hidden className="inline-block h-2 w-4 rounded-[2px] bg-white/40" />
            </span>
          </div>

          {/* Notificação do compromisso */}
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-od-border bg-od-muted-surface p-3">
              <div className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-od-accent text-white">
                  <Bell className="size-3.5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-white">OtimizIA · agora</p>
                  <p className="truncate text-[11px] text-od-text-3">Compromisso às 15h com a Carla Nogueira</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mini conversa com o Tim */}
          <div className="space-y-2 px-3 pb-4">
            <p className="ml-auto w-fit max-w-[80%] rounded-lg bg-od-accent px-3 py-1.5 text-[11px] text-white">
              Quem eu preciso chamar hoje?
            </p>
            <div className="w-fit max-w-[85%]">
              <span className="mb-0.5 block text-[10px] font-semibold text-white/45">Tim</span>
              <p className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] leading-relaxed text-white/80">
                Três pessoas. A Carla tem orçamento vencendo hoje, o Igor combinou retorno pra tarde e a Freelab está há 6 dias sem resposta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
