"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/**
 * Painel ancorado a um botão, renderizado no `body` por portal.
 *
 * O portal não é preciosismo: `.product-content` combina `isolation: isolate`
 * com `overflow-hidden`, e as superfícies de vidro do painel usam
 * `backdrop-filter`. Dentro dessa raiz de composição, um dropdown aberto sobre
 * a faixa de métricas era pintado por baixo dela mesmo com z-index maior —
 * subir o z-index do cabeçalho, do painel ou tirar o `isolate` não resolvia.
 * Fora da raiz, a ordem volta a ser a esperada.
 *
 * Como o painel deixa de ser descendente do botão, o clique fora precisa
 * considerar os dois nós; é por isso que o fechamento mora aqui e não em cada
 * chamador.
 */
export function AnchoredPanel({
  anchorRef,
  onClose,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    function place() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPlacement({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }

    place();
    window.addEventListener("resize", place);
    // `true` para capturar a rolagem de qualquer contêiner, não só da janela:
    // a topbar é sticky e o conteúdo abaixo dela rola por conta própria.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      window.requestAnimationFrame(() => anchorRef.current?.focus());
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [anchorRef, onClose]);

  if (typeof document === "undefined" || !placement) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: placement.top,
        right: placement.right,
        zIndex: "var(--z-modal)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
