import { ChevronRight } from "lucide-react";

type FaqItem = { q: string; a: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="faq-list divide-y divide-od-border border-y border-od-border">
      {items.map((faq) => (
        <details key={faq.q} className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-od-focus [&::-webkit-details-marker]:hidden">
            <span className="text-[15px] font-semibold text-od-text sm:text-base">{faq.q}</span>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md border border-od-border text-od-text-3 transition-transform duration-200 group-open:rotate-90">
              <ChevronRight className="size-4" />
            </span>
          </summary>
          <p className="max-w-[68ch] pb-5 pr-12 text-sm leading-relaxed text-od-text-2">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
