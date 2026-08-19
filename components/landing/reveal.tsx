import * as React from "react";

/**
 * Entrada suave quando o bloco chega na viewport.
 *
 * Só é aplicado abaixo da dobra. Hero, navegação e CTA nunca animam: animar o
 * que já está na tela no primeiro quadro só atrasa a leitura.
 *
 * Compromisso conhecido: o estado inicial é opacidade 0, então com JavaScript
 * desativado o bloco não aparece. Por isso o conteúdo essencial da página —
 * proposta, preço e as duas ações — fica fora daqui.
 *
 * Com prefers-reduced-motion o componente sai do caminho e renderiza direto.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      data-reveal-delay={delay}
    >
      {children}
    </div>
  );
}
