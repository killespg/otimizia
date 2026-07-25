"use client";

import { useEffect, useRef, useState } from "react";

// Trava a altura do elemento no espaço realmente disponível até o fim da
// tela, medindo de verdade em vez de chutar um "calc(100dvh - Nrem)" fixo.
// Esse chute varia entre mobile e desktop (topbar, tab bar fixa embaixo,
// safe-area do notch, teclado abrindo) — medir com getBoundingClientRect +
// visualViewport funciona nos dois sem precisar prever o layout ao redor.
export function useLockedHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      // No celular, a barra de navegação flutua sobre o fim da tela — o
      // limite de baixo é o topo dela (com uma folga), não a borda do
      // viewport, senão o compositor ficaria atrás da barra.
      const nav = document.querySelector<HTMLElement>("[data-mobile-nav]");
      const navRect = nav?.getBoundingClientRect();
      const bottom = navRect && navRect.height > 0 ? navRect.top - 8 : viewport;
      setHeight(Math.max(280, Math.round(bottom - top)));
    }

    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("scroll", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("scroll", onResize);
    };
  }, []);

  return { ref, height };
}
