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
      className="relative flex min-h-[300px] flex-col items-start gap-8 border-y border-od-border py-12 md:flex-row md:items-center"
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
      {/* Acento solto no fundo da faixa, sem moldura: com borda e superficie
          proprias ele era mais um card dentro da secao. O 3D original exigiria
          three + fiber + drei. */}
      <div className="relative z-[1] flex h-[240px] flex-1 items-center justify-center" aria-hidden="true">
        <div className="absolute size-[220px] rounded-full bg-od-accent/15 blur-3xl" />
        <div className="relative size-24 rotate-45 rounded-2xl border border-od-accent/40 bg-od-accent/10" />
      </div>
    </div>
  );
}
