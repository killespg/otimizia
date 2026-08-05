import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export function LegalPage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1640px]">{children}</div>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-5 border-b border-od-border pb-7 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold text-od-text-2">{eyebrow}</p><h1 className="mt-2 text-od-title text-od-text">{title}</h1>{description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-od-text-3">{description}</p> : null}</div>{action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}</header>;
}

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon; href?: string };

export function PrimaryAction({ icon: Icon, children, href, className = "", ...props }: ActionProps) {
  const styles = `inline-flex min-h-11 items-center gap-2 rounded-md bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-od-accent-hover ${className}`;
  if (href) return <Link href={href} className={styles}>{Icon ? <Icon size={16} /> : null}{children}</Link>;
  return <button type="button" className={styles} {...props}>{Icon ? <Icon size={16} /> : null}{children}</button>;
}

export function QuietAction({ icon: Icon, children, href, className = "", ...props }: ActionProps) {
  const styles = `inline-flex min-h-11 items-center gap-2 px-3 text-xs font-semibold text-od-text-2 hover:text-od-text ${className}`;
  if (href) return <Link href={href} className={styles}>{Icon ? <Icon size={16} /> : null}{children}</Link>;
  return <button type="button" className={styles} {...props}>{Icon ? <Icon size={16} /> : null}{children}</button>;
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex items-end justify-between gap-4"><div><h2 className="text-base font-semibold text-od-text">{title}</h2>{description ? <p className="mt-1 text-xs text-od-text-3">{description}</p> : null}</div>{action}</div>;
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: string; note?: string; tone?: "danger" | "success" }> }) {
  return <section className="grid grid-cols-2 border-b border-od-border py-1 lg:grid-cols-4">{items.map((item) => <div key={item.label} className="border-t border-od-border py-6 sm:border-l sm:border-t-0 sm:px-7 sm:first:border-l-0 sm:first:pl-0"><div className="flex items-baseline gap-2.5"><span className={`text-[28px] font-semibold tracking-[-0.02em] ${item.tone === "danger" ? "text-[#ff8175]" : item.tone === "success" ? "text-emerald-300/80" : "text-od-text"}`}>{item.value}</span>{item.note ? <span className="text-xs text-od-text-3">{item.note}</span> : null}</div><p className="mt-1.5 text-xs text-od-text-2">{item.label}</p></div>)}</section>;
}

export function StatusTag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "danger" | "success" | "warning" }) {
  const tones = { neutral: "border-od-border text-od-text-3", brand: "border-od-accent/20 text-od-text/70", danger: "border-red-400/20 text-[#ff8175]", success: "border-emerald-400/20 text-emerald-300/70", warning: "border-amber-400/20 text-amber-300/70" };
  return <span className={`inline-flex w-fit rounded-[3px] border px-2 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Avatar({ initials }: { initials: string }) {
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.07] text-xs font-semibold text-od-text-2">{initials}</span>;
}
