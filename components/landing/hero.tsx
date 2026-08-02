import * as React from "react";
import { ArrowRight } from "lucide-react";
import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";

/**
 * Dark hero pattern: restrained radial glow, animated shapes and a direct CTA.
 * `animated` layers in the floating-shapes background (opt-in — the
 * design-system showcase page keeps the plain grid, the landing turns it on).
 */
export function Hero({ animated = false }: { animated?: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-od-border bg-od-bg pb-16 pt-24 text-center md:pb-20 md:pt-28">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(92,34,232,0.35), transparent 70%)",
        }}
        aria-hidden
      />

      {/* Feixes diagonais de luz, adaptados do hero-section-9: lá eram cinzas
          neutros (hsla 0 0%), aqui usam o acento da marca. É a única parte
          daquele bloco que entrou — a faixa de logos afirmava parceria com
          Nvidia, GitHub e OpenAI, que não existe. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 isolate hidden opacity-60 [contain:strict] lg:block"
      >
        <div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[87.5%] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,color-mix(in_oklab,var(--od-accent)_16%,transparent)_0,color-mix(in_oklab,var(--od-accent)_6%,transparent)_50%,transparent_80%)]" />
        <div className="absolute left-0 top-0 h-[80rem] w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_oklab,var(--od-accent)_12%,transparent)_0,color-mix(in_oklab,var(--od-accent)_5%,transparent)_80%,transparent_100%)] [translate:5%_-50%]" />
        <div className="absolute left-0 top-0 h-[80rem] w-56 -translate-y-[87.5%] -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,color-mix(in_oklab,var(--od-accent)_9%,transparent)_0,color-mix(in_oklab,var(--od-accent)_4%,transparent)_80%,transparent_100%)]" />
      </div>
      {animated ? <AnimatedShapesBackground /> : null}
      <div className="relative z-10">
        <div className="mb-6 text-od-label text-od-text-3">
          CRM com WhatsApp e IA, sozinho ou com equipe
        </div>
        {/* A promessa é o que o webhook faz de verdade: a IA responde a
            conversa e a detecção de intenção abre a negociação no funil. Nada
            aqui é roadmap. */}
        <h1 className="mx-auto mb-5 max-w-[26ch] text-balance text-[24px] font-extrabold leading-[1.25] tracking-[-0.02em] sm:max-w-[20ch] sm:text-[44px] sm:leading-[1.15] md:max-w-[22ch] md:text-[56px]">
          <span className="text-white">A IA atende seu WhatsApp. </span>
          <span className="text-od-accent-hover">
            Você entra quando importa.
          </span>
        </h1>
        <p className="mx-auto mb-9 max-w-[560px] text-base leading-relaxed text-od-text-2">
          Ela responde na hora, percebe quem está pronto pra fechar e abre a
          negociação no seu funil sozinha. Você assume a conversa quando quiser
          e liga ou desliga a IA em cada uma.
        </p>
        <a
          id="hero-cta"
          href="/signup"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-od-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Começar grátis
          <ArrowRight className="size-4" strokeWidth={2} />
        </a>
      </div>
    </section>
  );
}
