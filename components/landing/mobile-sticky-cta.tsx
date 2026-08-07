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
 * `MobileAppNav`, fixa com safe-area) resolve isso lá; aqui a barra fica ao
 * alcance do polegar do começo ao fim do scroll.
 *
 * Fica escondida enquanto o CTA do hero (#hero-cta) ou o CTA final
 * (#cta-final) estão visíveis, pra não duplicar o mesmo botão na tela.
 *
 * Vidro overlay (`.glass-soft`), não plano sólido: como o volume agora flutua
 * afastado das bordas, preserva o squircle completo e a safe area do aparelho.
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
      className={`landing-cinematic-mobile-cta fixed inset-x-3 bottom-3 z-[var(--z-sticky)] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <a
        href="/signup"
        tabIndex={visible ? 0 : -1}
        className="btn flex min-h-12 w-full items-center justify-center gap-2 text-[15px]"
      >
        Começar grátis
        <ArrowRight className="size-4" strokeWidth={2} />
      </a>
    </div>
  );
}
