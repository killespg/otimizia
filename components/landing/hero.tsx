import * as React from "react";
import { ArrowRight } from "lucide-react";
import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";
import { DashboardPreview } from "@/components/landing/dashboard-preview";

/**
 * Dark hero pattern: restrained radial glow, animated shapes and a direct CTA.
 * `animated` layers in the floating-shapes background (opt-in — the
 * design-system showcase page keeps the plain grid, the landing turns it on).
 */
export function Hero({ animated = false }: { animated?: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-od-border bg-od-bg pt-24 text-center md:pt-28 lg:pb-0">
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
        <h1 className="mx-auto mb-5 max-w-[18ch] text-balance text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[44px] md:max-w-[22ch] md:text-[56px]">
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
          href="/signup"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-od-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Começar grátis
          <ArrowRight className="size-4" strokeWidth={2} />
        </a>
      </div>

      {/* Teaser do produto em perspectiva. Em vez do screenshot hotlinkado da
          referência, é o mesmo mock fiel que a seção "O painel" usa — só que
          aqui inerte: quem quiser explorar faz isso lá embaixo, onde a
          instrução está. `inert` tira do foco e da árvore de acessibilidade,
          evitando dois "Visão geral" concorrendo pro leitor de tela. */}
      <div className="relative z-10 mx-auto mt-20 hidden w-full max-w-6xl [mask-image:linear-gradient(to_bottom,black_58%,transparent_100%)] lg:block">
        <div className="[perspective:1400px]">
          <div className="origin-top [transform:rotateX(22deg)]">
            <div className="mx-auto h-[620px] max-w-5xl skew-x-[.14rad] overflow-hidden rounded-xl border border-od-border bg-od-surface p-2 shadow-od-float">
              <div inert className="pointer-events-none h-full select-none">
                <DashboardPreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
