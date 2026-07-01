"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell,
  IconBot,
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

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: IconGauge, mobile: true },
  { href: "/contacts", label: "Contatos", icon: IconUsers, mobile: true },
  { href: "/pipeline", label: "Vendas", icon: IconColumns, mobile: true },
  { href: "/tasks", label: "Lembretes", icon: IconBell, mobile: true },
  { href: "/dashboard#valor", label: "Valor aberto", icon: IconWallet, passive: true },
  { href: "/tasks", label: "Clientes para chamar", icon: IconPhone, passive: true },
  { href: "/dashboard#agente", label: "Agente IA", icon: IconBot, passive: true },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
}

/* Sidebar desktop. */
export function SidebarNav() {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {NAV.map(({ href, label, icon: Icon, passive }) => {
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/* Mobile tab bar. */
export function MobileTabBar() {
  const isActive = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {NAV.filter((item) => item.mobile).map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "nav-item relative flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 " +
                (active ? "text-brand-700" : "text-ink-muted")
              }
            >
              {active && (
                <span className="absolute inset-x-5 top-0 h-[2px] origin-center bg-brand-700" />
              )}
              <Icon className="h-[22px] w-[22px]" />
              <span
                className={
                  "font-mono text-[10px] uppercase tracking-[0.1em] leading-none " +
                  (active ? "font-semibold" : "font-medium")
                }
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
