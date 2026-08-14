import { ArrowRight, Check } from "lucide-react";

export function Hero() {
  return (
    <section className="border-b border-od-border bg-od-bg pb-16 pt-20 text-center md:pb-20 md:pt-28">
      <div className="mx-auto max-w-[880px]">
        <p className="mb-6 text-od-label text-od-accent-soft">
          CRM com WhatsApp e IA, sozinho ou com equipe
        </p>
        <h1 className="text-balance text-[36px] font-extrabold leading-[1.08] tracking-[-0.035em] text-od-text sm:text-[48px] md:text-[64px]">
          A IA atende seu WhatsApp. <span className="text-od-accent-soft">Você entra quando importa.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[650px] text-base leading-relaxed text-od-text-2 sm:text-lg">
          Ela responde na hora, identifica quem está pronto para fechar e abre a
          negociação no seu funil. Você acompanha tudo e assume quando quiser.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a id="hero-cta" href="/signup" className="btn min-h-12 gap-2 px-6">
            Começar grátis
            <ArrowRight className="size-4" strokeWidth={2} />
          </a>
          <a href="#painel" className="btn-ghost min-h-12 px-6">
            Conhecer o painel
          </a>
        </div>
        <ul className="mt-8 flex flex-col items-center justify-center gap-3 text-sm text-od-text-2 sm:flex-row sm:gap-6">
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
    </section>
  );
}
