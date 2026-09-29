"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Barra de ação fixa do rodapé, só no celular. Fica escondida enquanto o CTA
 * do hero (#hero-cta) ou o final (#cta-final) estão à vista, para não duplicar
 * o mesmo botão; depois de alcançar o fim, não volta.
 */
export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const final = document.getElementById("cta-final");
    if (!hero) return;

    let heroVisible = true;
    let reachedEnd = false;
    const update = () => setVisible(!heroVisible && !reachedEnd);

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
    <div className="oz-sticky" aria-hidden={!visible}>
      <a href="/signup" tabIndex={visible ? 0 : -1} className="oz-btn oz-btn-block">
        Começar grátis
        <ArrowRight size={16} aria-hidden />
      </a>
    </div>
  );
}
