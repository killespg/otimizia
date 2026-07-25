"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// template.tsx remonta a cada troca de rota dentro do /painel — então cada
// tela entra com uma transição suave (fade + leve subida), dando a sensação
// de troca instantânea e intencional em vez de um "pop" seco. O provider do
// Tim vive no layout (acima daqui), então a conversa não reinicia na troca.
export default function PainelTemplate({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
