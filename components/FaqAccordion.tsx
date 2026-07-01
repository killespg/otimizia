"use client";

import { useRef, useState } from "react";
import { IconChevronRight } from "@/app/(app)/icons";

type FaqItem = {
  q: string;
  a: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const [closingItems, setClosingItems] = useState<Record<number, boolean>>({});
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  function toggle(index: number) {
    const isOpen = openItems[index];

    window.clearTimeout(timers.current[index]);

    if (isOpen) {
      setClosingItems((current) => ({ ...current, [index]: true }));
      timers.current[index] = setTimeout(() => {
        setOpenItems((current) => ({ ...current, [index]: false }));
        setClosingItems((current) => ({ ...current, [index]: false }));
      }, 260);
      return;
    }

    setOpenItems((current) => ({ ...current, [index]: true }));
    setClosingItems((current) => ({ ...current, [index]: false }));
  }

  return (
    <div className="faq-list divide-y divide-line border-y border-line" data-reveal>
      {items.map((faq, index) => {
        const isOpen = !!openItems[index];
        const isClosing = !!closingItems[index];

        return (
          <div
            key={faq.q}
            className="faq-item group"
            data-open={isOpen ? "true" : undefined}
            data-closing={isClosing ? "true" : undefined}
          >
            <button
              type="button"
              className="faq-summary flex w-full cursor-pointer list-none items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen && !isClosing}
              aria-controls={`faq-answer-${index}`}
              onClick={() => toggle(index)}
            >
              <span className="faq-question text-base font-black text-ink transition-colors group-data-[open=true]:text-brand-800 sm:text-lg">
                {faq.q}
              </span>
              <span className="faq-icon grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-muted">
                <IconChevronRight className="h-4 w-4" />
              </span>
            </button>

            {isOpen ? (
              <div
                id={`faq-answer-${index}`}
                className="faq-answer"
                role="region"
                aria-hidden={isClosing}
              >
                <p className="max-w-2xl pb-5 text-sm font-medium leading-relaxed text-ink-soft sm:text-base">
                  {faq.a}
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
