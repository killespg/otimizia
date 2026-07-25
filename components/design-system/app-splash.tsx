"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// Tela de abertura: cobre o app assim que ele carrega, enquanto o shell
// hidrata e o DashboardRoutePreloader esquenta todas as rotas em segundo
// plano. Depois some com um fade. Como o layout do /painel fica montado
// durante toda a navegação interna (SPA), isso só aparece na carga completa
// do app — nunca nas trocas de aba.
const MIN_VISIBLE_MS = 1100;

export function AppSplash() {
  // Começa visível já no SSR pra cobrir a primeira pintura, sem flash de
  // conteúdo antes de o app terminar de montar.
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-6 bg-[#0f0d11]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Variante com fundo transparente de verdade (alpha=0) — não
                precisa de mix-blend, então não sobra retângulo em fundo
                nenhum, diferente da -approved-dark usada na sidebar. */}
            <Image src="/otimizia-logo-2026-dark.png" alt="OtimizIA" width={156} height={40} priority unoptimized />
          </motion.div>

          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="size-1.5 rounded-full bg-white/[0.06]"
                animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25] }}
                transition={reduceMotion ? undefined : { duration: 1, repeat: Infinity, delay: index * 0.16, ease: "easeInOut" }}
              />
            ))}
          </div>
          <span className="sr-only">Carregando o OtimizIA…</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
