import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { MetricBand } from "@/components/ui/data-display";
import { Page, PageHeader as ProductPageHeader } from "@/components/ui/surface";

export function LegalPage({ children }: { children: React.ReactNode }) {
  return <Page>{children}</Page>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title?: string; description?: string; action?: React.ReactNode }) {
  return <ProductPageHeader eyebrow={eyebrow} title={title} description={description} actions={action} />;
}

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon; href?: string };

export function PrimaryAction({ icon: Icon, children, href, className = "", ...props }: ActionProps) {
  const styles = `inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-od-accent-hover ${className}`;
  if (href) return <Link href={href} className={styles}>{Icon ? <Icon size={16} /> : null}{children}</Link>;
  return <button type="button" className={styles} {...props}>{Icon ? <Icon size={16} /> : null}{children}</button>;
}

export function QuietAction({ icon: Icon, children, href, className = "", ...props }: ActionProps) {
  const styles = `inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-3 text-xs font-semibold text-white/55 hover:bg-od-surface-hover hover:text-white ${className}`;
  if (href) return <Link href={href} className={styles}>{Icon ? <Icon size={16} /> : null}{children}</Link>;
  return <button type="button" className={styles} {...props}>{Icon ? <Icon size={16} /> : null}{children}</button>;
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex items-end justify-between gap-4"><div><h2 className="text-base font-semibold text-white">{title}</h2>{description ? <p className="mt-1 text-xs text-white/52">{description}</p> : null}</div>{action}</div>;
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string; note?: string; tone?: "danger" | "success" }> }) {
  return <MetricBand items={items.map((item) => ({ label: item.label, value: <span className={item.tone === "danger" ? "text-[#ff8175]" : item.tone === "success" ? "text-emerald-300/80" : undefined}>{item.value}</span>, detail: item.note }))} />;
}

export function StatusTag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "danger" | "success" | "warning" }) {
  const tones = { neutral: "border-white/[0.08] text-od-text-3", brand: "border-od-accent/20 text-od-text/70", danger: "border-red-400/20 text-[#ff8175]", success: "border-emerald-400/20 text-emerald-300/70", warning: "border-amber-400/20 text-amber-300/70" };
  return <span className={`inline-flex w-fit rounded-[var(--radius-round)] border px-2 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Avatar({ initials }: { initials: string }) {
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.07] text-xs font-semibold text-white/58">{initials}</span>;
}
