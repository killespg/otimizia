"use client";

import { type ReactNode, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * O card do painel nasce inclinado em 3D e "endireita" (gira e cresce um
 * pouco) conforme a seção entra na tela, na rolagem — não em loop, só uma
 * vez, acompanhando o scroll. Com `prefers-reduced-motion`, o card já nasce
 * na posição final: sem transform nenhum, não é opcional.
 */
export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start start"],
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-[1180px] px-5 py-20 sm:px-8 md:py-24 min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px]"
    >
      <div className="mx-auto max-w-5xl text-center min-[1536px]:max-w-6xl min-[1800px]:max-w-7xl min-[2200px]:max-w-[1600px]">
        {titleComponent}
      </div>

      <motion.div
        style={
          reduceMotion
            ? { rotateX: 0, scale: 1, y: 0 }
            : {
                rotateX: rotate,
                scale,
                y: translateY,
                transformPerspective: 1200,
                // O pivô ficava no centro do card (padrão do CSS): a linha
                // de cima e a de baixo se afastam em direções opostas da
                // câmera conforme o ângulo muda, e a keystone da perspectiva
                // desloca cada linha de um jeito diferente — o "Bom dia,
                // Mariana" só se destaca porque é a linha maior/mais grossa
                // do bloco. Ancorar o pivô no topo faz o cabeçalho ficar
                // parado (é onde a câmera "encosta") e só o resto do card
                // recua para trás dele.
                transformOrigin: "top",
                willChange: "transform",
              }
        }
        className="mx-auto h-[38rem] w-full max-w-5xl overflow-hidden rounded-lg border border-od-border bg-od-surface p-2 shadow-od-card sm:h-[42rem] md:h-[46rem] md:p-3 min-[1536px]:max-w-6xl min-[1800px]:max-w-7xl min-[2200px]:max-w-[1600px]"
      >
        <div className="h-full w-full overflow-hidden rounded bg-od-muted-surface">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
