import Link from "next/link";
import {
  parseSellerSalesTab,
  sellerSalesHref,
  type SellerSalesTab,
} from "@/lib/seller/seller-sales";

const TABS: Array<{ key: SellerSalesTab; label: string }> = [
  { key: "conversa", label: "Em conversa" },
  { key: "confirmadas", label: "Confirmadas" },
  { key: "numeros", label: "Números" },
  { key: "pos-venda", label: "Pós-venda" },
];

export function SellerSalesTabs({ current }: { current: string | undefined }) {
  const active = parseSellerSalesTab(current);
  return (
    <nav
      aria-label="Vendas"
      className="flex gap-1 overflow-x-auto border-b border-white/[0.08] pb-px"
    >
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={sellerSalesHref(tab.key)}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center px-3 text-sm font-semibold ${
              selected
                ? "border-b-2 border-od-accent text-white"
                : "text-od-text-3 hover:text-od-text"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
