"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type Globe3DProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  primaryAction: ReactNode;
  secondaryAction: ReactNode;
  visual: ReactNode;
  ambient?: ReactNode;
};

/**
 * Hero orbital reutilizável.
 *
 * A órbita substitui a imagem remota do bloco de referência e o slot `visual`
 * recebe produto real. Assim o componente não inventa uma captura estática nem
 * depende de CDN externa para comunicar o que o OtimizIA faz.
 */
export default function Globe3D({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  visual,
  ambient,
}: Globe3DProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative w-full overflow-x-clip pb-8 pt-16 text-white antialiased md:pb-12 md:pt-20">
      {ambient}

      <div className="relative z-10 mx-auto max-w-7xl text-center">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="liquid-glass-control mb-6 inline-flex min-h-8 items-center rounded-full px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200">
            {eyebrow}
          </span>
          <h1 className="mx-auto mb-6 max-w-[20ch] text-balance text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-[46px] md:max-w-[19ch] md:text-[60px] lg:text-[68px]">
            {title}
          </h1>
          <p className="mx-auto mb-9 max-w-2xl text-[15px] leading-relaxed text-od-text-2 sm:text-base md:text-lg">
            {description}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            {primaryAction}
            {secondaryAction}
          </div>
        </motion.div>

        <motion.div
          className="relative mt-8"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
        >
          <div data-landing-hero-orbit="true" className="landing-hero-orbit" aria-hidden="true" />
          <div
            id="painel"
            data-landing-glass-stage="true"
            data-landing-preview-stage="true"
            className="landing-liquid-stage relative z-10 mx-auto -mt-12 h-[34rem] w-full max-w-6xl scroll-mt-28 overflow-hidden p-2 sm:h-[40rem] sm:p-3 lg:h-[46rem]"
          >
            <div className="h-full overflow-hidden rounded-2xl bg-[#0b0a10]">
              {visual}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
