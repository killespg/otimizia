import { ArrowRight, Check } from "lucide-react";
import { PhoneMockup } from "./phone-mockup";

export function Hero() {
  return (
    <section className="border-b border-od-border bg-od-bg pb-16 pt-20 md:pb-20 md:pt-28">
      <div className="mx-auto max-w-[1180px] px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <p className="mb-6 text-od-label text-od-accent-soft">
              CRM do solo ao time, com WhatsApp e IA
            </p>
            <h1 className="text-balance text-[36px] font-extrabold leading-[1.08] tracking-[-0.035em] text-od-text sm:text-[48px] md:text-[58px]">
              A IA atende seu WhatsApp. <span className="text-od-accent-soft">Você entra quando importa.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[650px] text-base leading-relaxed text-od-text-2 sm:text-lg lg:mx-0">
              Ela responde na hora, identifica quem está pronto para fechar e abre a
              negociação no seu funil. Você acompanha tudo e assume quando quiser.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <a id="hero-cta" href="/signup" className="btn min-h-12 gap-2 px-6">
                Começar grátis
                <ArrowRight className="size-4" strokeWidth={2} />
              </a>
              <a href="#painel" className="btn-ghost min-h-12 px-6">
                Conhecer o painel
              </a>
            </div>
            <ul className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-od-text-2 sm:flex-row sm:gap-6 lg:justify-start">
              {['Sem cartão', 'Configuração guiada', 'Cancele quando quiser'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-od-accent-tint text-od-accent-soft">
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Conversa do WhatsApp atendida pelo Tim + o que virou na conta */}
          <div className="mx-auto flex w-full max-w-[460px] justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
