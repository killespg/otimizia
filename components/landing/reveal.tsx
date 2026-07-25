"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

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
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Luz de fundo posicionada.
 *
 * Substitui o holofote que seguia o mouse: em vez de uma luz que persegue o
 * cursor pela página inteira, cada faixa recebe a sua, ancorada onde o conteúdo
 * está. Fica atrás de tudo, não captura ponteiro e some com movimento reduzido.
 */
export function Glow({
  className,
  size = 520,
  intensity = 0.16,
  pulse = false,
}: {
  className?: string;
  size?: number;
  intensity?: number;
  pulse?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, color-mix(in oklab, var(--od-accent) ${Math.round(intensity * 100)}%, transparent), transparent 70%)`,
      }}
      animate={pulse && !reduceMotion ? { opacity: [0.65, 1, 0.65] } : undefined}
      transition={pulse && !reduceMotion ? { duration: 7, repeat: Infinity, ease: "easeInOut" } : undefined}
    />
  );
}
