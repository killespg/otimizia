"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell,
  IconBot,
  IconChartBar,
  IconColumns,
  IconGauge,
  IconPhone,
  IconUsers,
  IconWallet,
  type IconProps,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: (p: IconProps) => JSX.Element;
  passive?: boolean;
  mobile?: boolean;
};

type NavLabels = {
  contacts: string;
  pipeline: string;
  value: string;
  followups: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: IconGauge, mobile: true },
  { href: "/contacts", label: "Contatos", icon: IconUsers, mobile: true },
  { href: "/pipeline", label: "Vendas", icon: IconColumns, mobile: true },
  { href: "/tasks", label: "Lembretes", icon: IconBell, mobile: true },
  { href: "/dashboard#valor", label: "Valor aberto", icon: IconWallet, passive: true },
  { href: "/tasks", label: "Clientes para chamar", icon: IconPhone, passive: true },
  { href: "/assistant", label: "Sócio-Assistente", icon: IconBot },
  { href: "/team", label: "Equipe", icon: IconUsers },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
}

/* Sidebar desktop. */
export function SidebarNav({
  labels,
  isAdmin = false,
}: {
  labels?: NavLabels;
  isAdmin?: boolean;
}) {
  const isActive = useActive();
  const text = labels ?? {
    contacts: "Contatos",
    pipeline: "Vendas",
    value: "Valor aberto",
    followups: "Clientes para chamar",
  };
  const items = isAdmin
    ? [...NAV, { href: "/dev", label: "Métricas", icon: IconChartBar }]
    : NAV;
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {items.map(({ href, label, icon: Icon, passive }) => {
        const displayLabel =
          href === "/pipeline"
            ? text.pipeline
            : href === "/contacts"
            ? text.contacts
            : label === "Valor aberto"
            ? text.value
            : label === "Clientes para chamar"
            ? text.followups
            : label;
        const active = !passive && isActive(href);
        return (
          <Link
            key={`${href}-${label}`}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "nav-item group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 " +
              (active
                ? "bg-brand-50 text-brand-800 shadow-[inset_0_0_0_1px_rgba(123,63,242,0.06)]"
                : "text-ink-soft hover:bg-surface-2 hover:text-ink")
            }
          >
            <Icon
              className={
                "h-[20px] w-[20px] shrink-0 transition-colors duration-150 ease-out " +
                (active ? "text-brand-700" : "text-ink-muted group-hover:text-brand-700")
              }
            />
            {displayLabel}
          </Link>
        );
      })}
    </nav>
  );
}

/* Mobile tab bar. */
export function MobileTabBar({ labels }: { labels?: Pick<NavLabels, "contacts" | "pipeline"> }) {
  const isActive = useActive();
  const contactsLabel = labels?.contacts ?? "Contatos";
  const pipelineLabel = labels?.pipeline ?? "Vendas";
  return (
    <nav
      className="mobile-tabbar fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-line bg-surface/95 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_22px_50px_-30px_rgba(7,8,28,0.75)] backdrop-blur-xl sm:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {NAV.filter((item) => item.mobile).map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const displayLabel =
            href === "/pipeline" ? pipelineLabel : href === "/contacts" ? contactsLabel : label;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "mobile-tab nav-item relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 " +
                (active ? "bg-brand-50 text-brand-700" : "text-ink-muted")
              }
            >
              {active && (
                <span className="mobile-tab-dot absolute top-1.5 h-1 w-1 rounded-full bg-brand-700" />
              )}
              <Icon className="h-[22px] w-[22px]" />
              <span
                className={
                  "text-[11px] font-black leading-none tracking-[-0.01em] " +
                  (active ? "font-semibold" : "font-medium")
                }
              >
                {displayLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
