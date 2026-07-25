import * as React from "react";
import { ArrowRight } from "lucide-react";
import { AnimatedShapesBackground } from "@/components/design-system/animated-shapes-background";

/**
 * Dark hero pattern: retro perspective grid + radial glow + gradient
 * headline + pill CTA with an animated gradient border.
 * `animated` layers in the floating-shapes background (opt-in — the
 * design-system showcase page keeps the plain grid, the landing turns it on).
 */
export function Hero({ animated = false }: { animated?: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-od-border bg-od-bg px-8 py-24 text-center md:py-28">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-25"
        aria-hidden
      >
        <div
          className="absolute -inset-1/2"
          style={{
            backgroundImage:
              "linear-gradient(to right, #5c22e8 1px, transparent 1px), linear-gradient(to bottom, #5c22e8 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            transform: "perspective(300px) rotateX(60deg)",
            transformOrigin: "50% 0",
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(92,34,232,0.35), transparent 70%)",
        }}
        aria-hidden
      />
      {animated ? <AnimatedShapesBackground /> : null}
      <div className="relative z-10">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-md border border-od-border px-3 py-1.5 text-[12px] font-medium text-od-text-2">
          CRM feito para quem vende sozinho
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </div>
        <h1 className="mx-auto mb-5 max-w-[16ch] text-[44px] font-extrabold leading-[1.1] tracking-[-0.02em] md:max-w-none md:text-[56px]">
          <span className="text-white">Venda sem perder </span>
          <span className="text-od-accent">
            o fio.
          </span>
        </h1>
        <p className="mx-auto mb-9 max-w-[520px] text-base leading-relaxed text-od-text-2">
          Contatos, vendas e lembretes numa tela simples. Você vê a prioridade
          e age sem cavar conversa antiga.
        </p>
        <a
          href="/signup"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-od-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-od-accent-hover"
        >
          Começar grátis
          <ArrowRight className="size-4" strokeWidth={2} />
        </a>
      </div>
    </section>
  );
}
