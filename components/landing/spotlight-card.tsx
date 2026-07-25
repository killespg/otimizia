"use client";

import * as React from "react";

/**
 * Dark card with a mouse-tracked radial spotlight (CSS custom properties)
 * and a rotating 3D icosahedron accent. Reserved for occasional highlights.
 * `localSpotlight` (default true) can be turned off when a page already has
 * its own page-wide pointlight (see MouseSpotlight) — avoids stacking two
 * glows on top of each other in the same spot.
 */
export function SpotlightCard({ localSpotlight = true }: { localSpotlight?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!localSpotlight) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ref.current!.style.setProperty("--x", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative flex min-h-[340px] items-center gap-8 overflow-hidden rounded-xl bg-[#0f0d11] p-12"
      style={{ ["--x" as string]: "50%", ["--y" as string]: "50%" }}
    >
      {localSpotlight ? (
        <div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background:
              "radial-gradient(200px circle at var(--x) var(--y), rgba(167,139,250,0.25), transparent 80%)",
          }}
        />
      ) : null}
      <div className="relative z-[1] flex-1">
        <h3 className="mb-3 text-[28px] font-extrabold tracking-[-0.01em] text-white">
          Sócio-Assistente em ação
        </h3>
        <p className="max-w-[420px] text-sm leading-relaxed text-[#a39da8]">
          Resume o dia, aponta quem chamar primeiro e sugere o próximo passo —
          direto no painel.
        </p>
      </div>
      {/* Aqui vinha o acento 3D do design system, que exigiria three + fiber +
          drei. Minha primeira troca foi pelo ShaderBackground — errada: ele e
          `fixed inset-0` por design, entao vazava do card e cobria a landing
          inteira. Este e contido: fica dentro do proprio retangulo. */}
      <div className="relative z-[1] h-[280px] flex-1 overflow-hidden rounded-xl border border-od-border bg-od-bg">
        <div className="absolute left-1/2 top-1/2 size-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-od-accent/20 blur-3xl" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="size-24 rotate-45 rounded-2xl border border-od-accent/40 bg-od-accent/10" />
        </div>
      </div>
    </div>
  );
}
