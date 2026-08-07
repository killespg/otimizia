"use client";

import { type ReactNode, useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/** Falso no servidor e no primeiro quadro do cliente, verdadeiro depois da
 *  hidratação. `useSyncExternalStore` em vez de `useState` + `useEffect`
 *  porque é o caminho que o React oferece para valores que só existem no
 *  cliente — e não dispara render em cascata dentro de efeito. */
const semInscricao = () => () => {};
function useHidratado() {
  return useSyncExternalStore(
    semInscricao,
    () => true,
    () => false,
  );
}

/**
 * O card do painel nasce inclinado em 3D e "endireita" conforme a seção entra
 * na tela, na rolagem — não em loop, só uma vez.
 *
 * Três correções nesta versão:
 *
 * 1. Moldura única. Havia quatro caixas em volta de um elemento só — esta com
 *    borda e sombra, uma interna com raio próprio, outra na página com padding
 *    e fundo, e a borda do próprio preview. Três bordas concêntricas é card
 *    dentro de card (regra 4). Ficou uma.
 *
 * 2. Altura. O card era `h-[38rem]` fixo já em 390 px, e o painel de dentro —
 *    que TEM layout de celular próprio — era cortado no meio: a captura
 *    mostrava "2 captações no período" partido ao meio da frase. Abaixo de
 *    `sm` a altura passa a ser do conteúdo.
 *
 * 3. Hidratação. `useReducedMotion` só existe no cliente: o servidor
 *    renderizava o transform e o cliente com movimento reduzido renderizava
 *    `none`, e o React acusava divergência (era o "1 Issue" do overlay do
 *    Next em toda visita com movimento reduzido). Agora o primeiro quadro é
 *    sempre o estado final, parado, e o vínculo com o scroll entra depois da
 *    montagem — o que também tira o salto de escala na entrada.
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
  const hidratado = useHidratado();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start start"],
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const anima = hidratado && !reduceMotion;

  return (
    <div ref={containerRef} className="lp-shell">
      <div className="mx-auto max-w-[720px] text-center">{titleComponent}</div>

      <motion.div
        style={
          anima
            ? {
                rotateX: rotate,
                scale,
                y: translateY,
                transformPerspective: 1200,
                // O pivô ficava no centro do card (padrão do CSS): a linha
                // de cima e a de baixo se afastam em direções opostas da
                // câmera conforme o ângulo muda, e a keystone da perspectiva
                // desloca cada linha de um jeito diferente. Ancorar o pivô no
                // topo faz o cabeçalho ficar parado e só o resto recuar.
                transformOrigin: "top",
                willChange: "transform",
              }
            : { rotateX: 0, scale: 1, y: 0 }
        }
        className="lp-panel lp-panel-quiet mx-auto mt-[clamp(32px,4vw,56px)] w-full max-w-5xl overflow-hidden sm:h-[42rem] md:h-[46rem] min-[1536px]:max-w-6xl"
      >
        {children}
      </motion.div>
    </div>
  );
}
