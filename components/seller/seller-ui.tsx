import type { ReactNode } from "react";
import { Box, PackageSearch } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/format";

export function SellerPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold text-od-text-2">Operação de vendas</p>
        <h1 className="mt-2 text-od-title text-white">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/52">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SellerSummaryStrip({ items }: { items: Array<{ label: string; value: ReactNode; tone?: "default" | "warning" | "success" }> }) {
  const count = Math.max(1, Math.min(6, items.length));
  const smallColumns = count <= 3 ? count : 2;
  const smallColumnClass = smallColumns === 1 ? "grid-cols-1" : smallColumns === 2 ? "grid-cols-2" : "grid-cols-3";
  const wideColumnClass = count === 1 ? "xl:grid-cols-1" : count === 2 ? "xl:grid-cols-2" : count === 3 ? "xl:grid-cols-3" : count === 4 ? "xl:grid-cols-4" : count === 5 ? "xl:grid-cols-5" : "xl:grid-cols-6";
  const smallLastRowStart = items.length - (items.length % smallColumns || smallColumns);
  return (
    <section className={`grid border-y border-white/[0.08] bg-[#1e1d22]/80 ${smallColumnClass} ${wideColumnClass}`}>
      {items.map((item, index) => (
        <div key={item.label} className={`border-white/[0.07] px-3 py-3 sm:px-4 ${index >= smallLastRowStart ? "border-b-0" : "border-b"} ${(index + 1) % smallColumns === 0 || index === items.length - 1 ? "border-r-0" : "border-r"} xl:border-b-0 ${index === items.length - 1 ? "xl:border-r-0" : "xl:border-r"}`}>
          <p className="text-xs text-od-text-3">{item.label}</p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${item.tone === "warning" ? "text-amber-300" : item.tone === "success" ? "text-emerald-300" : "text-white/88"}`}>{item.value}</p>
        </div>
      ))}
    </section>
  );
}

export function SellerEmptyState({ title, description, action, icon = "products", className = "" }: { title: string; description: string; action?: ReactNode; icon?: "products" | "box"; className?: string }) {
  const Icon = icon === "box" ? Box : PackageSearch;
  return (
    <div className={`flex min-h-56 flex-col items-center justify-center border-y border-white/[0.08] px-5 py-10 text-center ${className}`}>
      <span className="grid size-11 place-items-center border border-od-accent/20 bg-od-accent/[0.07] text-od-text-2"><Icon size={21} /></span>
      <h2 className="mt-4 text-base font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-od-text-3">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ProductThumb({ src, name, size = "md" }: { src?: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "size-9" : size === "lg" ? "size-24" : "size-11";
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden border border-white/[0.09] bg-white/[0.035] text-od-text-3 ${sizeClass}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : <Box size={size === "lg" ? 28 : 17} strokeWidth={1.5} />}
    </span>
  );
}

export function SellerStatus({ tone = "neutral", children }: { tone?: "neutral" | "violet" | "success" | "warning" | "danger"; children: ReactNode }) {
  const tones = {
    neutral: "border-white/[0.1] text-white/56",
    violet: "border-od-accent/25 bg-od-accent/[0.07] text-od-text",
    success: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300",
    warning: "border-amber-300/25 bg-amber-300/[0.06] text-amber-300",
    danger: "border-[#fb7767]/30 bg-[#fb7767]/[0.06] text-[#fb7767]",
  };
  return <span className={`inline-flex min-h-6 items-center border px-2 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function sellerOrderStatusLabel(status: string) {
  return ({ draft: "Rascunho", confirmed: "Confirmado", preparing: "Em preparação", ready: "Pronto", delivered: "Entregue", completed: "Concluído", cancelled: "Cancelado" } as Record<string, string>)[status] ?? status;
}

export function sellerPaymentStatusLabel(status: string) {
  return ({ pending: "Pendente", partial: "Parcial", paid: "Pago", refunded: "Estornado" } as Record<string, string>)[status] ?? status;
}

export function sellerClaimStatusLabel(status: string) {
  return ({ open: "Aberto", analysis: "Em análise", assistance: "Na assistência", replacement_approved: "Troca aprovada", refund_approved: "Reembolso aprovado", resolved: "Resolvido", cancelled: "Cancelado" } as Record<string, string>)[status] ?? status;
}

export function money(value: number | null | undefined) { return formatBRL(value ?? 0); }
export function date(value: string | null | undefined) { return value ? formatDate(value) : "—"; }
