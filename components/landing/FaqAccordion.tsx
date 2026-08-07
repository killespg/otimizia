"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconChevronRight } from "@/app/(dashboard)/painel/icons";

type FaqItem = {
  q: string;
  a: string;
};

/**
 * Abre e fecha com animação de altura.
 *
 * A versão anterior era feita à mão: dois mapas de estado (aberto e fechando) e
 * um setTimeout de 260ms só para atrasar a desmontagem — que é exatamente o que
 * AnimatePresence resolve. Aquele arranjo tinha dois defeitos reais: os timers
 * nunca eram limpos ao desmontar, e clicar rápido dessincronizava os dois mapas,
 * deixando o item preso no estado "fechando".
 *
 * 200ms com ease-out: o registro de produto pede 150–250ms, porque quem está
 * lendo não deve esperar coreografia. Com prefers-reduced-motion a transição
 * vira instantânea.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const reduceMotion = useReducedMotion();

  function toggle(index: number) {
    setOpenItems((current) => ({ ...current, [index]: !current[index] }));
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div
      data-landing-faq-stage="true"
      /* Vidro virou conteúdo, e as seis réguas viraram faixa alternada
         (regra 4a): a pergunta continua delimitada, sem seis traços iguais
         empilhados. O `overflow-hidden` é o que faz a faixa da primeira e da
         última linha respeitarem o raio do painel. */
      className="faq-list lp-panel lp-rows overflow-hidden"
    >
      {items.map((faq, index) => {
        const isOpen = !!openItems[index];

        return (
          <div key={faq.q} className="group px-5 sm:px-7" data-open={isOpen ? "true" : undefined}>
            <button
              type="button"
              className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${index}`}
              onClick={() => toggle(index)}
            >
              <span className="text-[15px] font-semibold text-od-text sm:text-base">
                {faq.q}
              </span>
              <motion.span
                aria-hidden="true"
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={transition}
                className="grid size-7 shrink-0 place-items-center text-od-text-3"
              >
                <IconChevronRight className="h-4 w-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="answer"
                  id={`faq-answer-${index}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={transition}
                  className="overflow-hidden"
                >
                  <p className="max-w-[68ch] pb-5 text-[14px] leading-relaxed text-od-text-2">
                    {faq.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
