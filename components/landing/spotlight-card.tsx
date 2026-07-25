"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

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
      className="relative flex flex-col items-start gap-10 border-b border-od-border pb-10 md:flex-row md:items-center"
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
      <ul className="relative z-[1] w-full flex-1 divide-y divide-od-border border-y border-od-border">
        {[
          "Quem eu preciso chamar hoje?",
          "Resuma o que aconteceu essa semana",
          "Quem está travado no funil há mais de 7 dias?",
          "Escreve uma mensagem de retorno pra Carla",
        ].map((pergunta) => (
          <li
            key={pergunta}
            className="flex items-center gap-2.5 py-3 text-[13px] text-od-text-2"
          >
            <Sparkles className="size-3.5 shrink-0 text-od-accent" strokeWidth={2} />
            {pergunta}
          </li>
        ))}
      </ul>
    </div>
  );
}
