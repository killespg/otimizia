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
    <div className="relative overflow-hidden rounded-[20px] bg-[#0f0d11] px-8 py-[72px] text-center">
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
        <div className="mb-[22px] inline-flex items-center gap-1.5 rounded-4xl border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[13px] text-[#c9c2d1]">
          CRM feito para quem vende sozinho
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </div>
        <h1 className="mx-0 mb-4 text-[46px] font-extrabold leading-[1.1] tracking-[-0.02em]">
          <span className="text-white">Venda sem perder </span>
          <span className="text-od-accent">
            o fio.
          </span>
        </h1>
        <p className="mx-auto mb-7 max-w-[520px] text-base leading-relaxed text-[#a39da8]">
          Contatos, vendas e lembretes numa tela simples. Você vê a prioridade
          e age sem cavar conversa antiga.
        </p>
        <span
          className="relative inline-block rounded-4xl p-[1.5px]"
          style={{ background: "linear-gradient(90deg, #5c22e8, #a78bfa, #5c22e8)" }}
        >
          <a
            href="#"
            className="inline-block rounded-4xl bg-[#0f0d11] px-7 py-3.5 text-sm font-semibold text-white"
          >
            Começar grátis
          </a>
        </span>
      </div>
    </div>
  );
}
