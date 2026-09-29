"use client";

import { useEffect } from "react";

/**
 * Efeitos da landing, todos opcionais e sem biblioteca:
 *  - header: data-scrolled liga o blur ao rolar (transparente no topo);
 *  - herói: parallax leve (mouse e rolagem) e foco de luz que segue o
 *    ponteiro, só via variáveis CSS lidas por transform/background;
 *  - entrada: blocos [data-reveal] abaixo da dobra sobem e aparecem.
 * O conteúdo é visível por padrão: só escondemos (oz-will) o que está
 * comprovadamente abaixo da dobra na hidratação, então sem JS ou com
 * prefers-reduced-motion nada some. Um rAF por frame, listeners passivos,
 * nada de parallax com o herói fora da tela.
 */
export function LandingEffects() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".oz-header");
    const scene = document.querySelector<HTMLElement>(".oz-scene");
    const hero = scene?.parentElement ?? null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let heroVisible = true;
    let frame = 0;
    let scrollY = 0;
    let pointer: { x: number; y: number } | null = null;

    const paint = () => {
      frame = 0;
      header?.setAttribute("data-scrolled", scrollY > 12 ? "true" : "false");
      if (!scene || reduce || !heroVisible) return;
      scene.style.setProperty("--sy", `${scrollY}px`);
      if (pointer) {
        scene.style.setProperty("--px", ((pointer.x - 0.5) * 2).toFixed(3));
        scene.style.setProperty("--py", ((pointer.y - 0.5) * 2).toFixed(3));
        scene.style.setProperty("--mx", pointer.x.toFixed(3));
        scene.style.setProperty("--my", pointer.y.toFixed(3));
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onScroll = () => {
      scrollY = window.scrollY;
      schedule();
    };
    const onMove = (event: PointerEvent) => {
      const r = hero!.getBoundingClientRect();
      pointer = {
        x: Math.min(1, Math.max(0, (event.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (event.clientY - r.top) / r.height)),
      };
      schedule();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let heroObserver: IntersectionObserver | undefined;
    let revealObserver: IntersectionObserver | undefined;

    if (!reduce) {
      if (hero) {
        heroObserver = new IntersectionObserver(([entry]) => {
          heroVisible = entry.isIntersecting;
        });
        heroObserver.observe(hero);
        if (finePointer) hero.addEventListener("pointermove", onMove, { passive: true });
      }

      const below = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
        (el) => el.getBoundingClientRect().top > window.innerHeight * 0.92,
      );
      if (below.length) {
        below.forEach((el) => el.classList.add("oz-will"));
        revealObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const el = entry.target as HTMLElement;
              el.classList.remove("oz-will");
              el.classList.add("oz-in");
              revealObserver?.unobserve(el);
            }
          },
          { rootMargin: "0px 0px -8% 0px" },
        );
        below.forEach((el) => revealObserver!.observe(el));
      }
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      hero?.removeEventListener("pointermove", onMove);
      heroObserver?.disconnect();
      revealObserver?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
