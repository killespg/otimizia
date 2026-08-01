"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Barra de ação fixa do rodapé, só no celular.
 *
 * A landing inteira era uma rolagem de site: o único "Começar grátis" ficava
 * lá no hero, e sumia assim que a pessoa descia pra ver o painel ou os
 * planos. Fora do ar, sem CTA à mão — tinha que rolar de volta pro topo ou
 * até o fim da página. O padrão que o produto já usa embaixo (a barra de
 * `MobileAppNav`, fixa com safe-area) resolve isso lá; aqui replica o mesmo
 * plano sólido (sem blur — DESIGN.md proíbe glassmorphism) para a ação
 * permanecer ao alcance do polegar do começo ao fim do scroll.
 *
 * Fica escondida enquanto o CTA do hero (#hero-cta) ou o CTA final
 * (#cta-final) estão visíveis, pra não duplicar o mesmo botão na tela.
 */
export function MobileStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const final = document.getElementById("cta-final");
    if (!hero) return;

    let heroVisible = true;
    // Uma vez alcançado, não volta: senão a barra reaparece por cima do rodapé
    // quando o CTA final sai de vista rolando pra baixo, em direção ao footer.
    let reachedEnd = false;

    function update() {
      setVisible(!heroVisible && !reachedEnd);
    }

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.isIntersecting;
        update();
      },
      { rootMargin: "-64px 0px 0px 0px" },
    );
    heroObserver.observe(hero);

    let finalObserver: IntersectionObserver | undefined;
    if (final) {
      finalObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) reachedEnd = true;
        update();
      });
      finalObserver.observe(final);
    }

    return () => {
      heroObserver.disconnect();
      finalObserver?.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-od-border bg-od-bg px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <a
        href="/signup"
        tabIndex={visible ? 0 : -1}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-od-accent text-[15px] font-semibold text-white transition-colors active:bg-brand-600"
      >
        Começar grátis
        <ArrowRight className="size-4" strokeWidth={2} />
      </a>
    </div>
  );
}
