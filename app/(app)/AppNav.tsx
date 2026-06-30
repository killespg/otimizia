"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconGauge,
  IconColumns,
  IconUsers,
  IconBell,
  type IconProps,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: (p: IconProps) => JSX.Element;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: IconGauge },
  { href: "/pipeline", label: "Vendas", icon: IconColumns },
  { href: "/contacts", label: "Contatos", icon: IconUsers },
  { href: "/tasks", label: "Lembretes", icon: IconBell },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
}

/* Sidebar (desktop): links empilhados com ícone + rótulo mono em caixa-alta.
   Ativo = fundo verde-claro sólido (nada de fio lateral). */
export function SidebarNav() {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "nav-item group flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 " +
              (active
                ? "bg-brand-50 font-semibold text-brand-800"
                : "font-medium text-ink-muted hover:bg-surface-2 hover:text-ink")
            }
          >
            <Icon
              className={
                "h-[20px] w-[20px] shrink-0 transition-colors duration-150 ease-out " +
                (active ? "text-brand-700" : "text-ink-soft group-hover:text-ink")
              }
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/* Mobile: barra de abas fixa no rodapé — alcance do polegar, alvos ≥56px. */
export function MobileTabBar() {
  const isActive = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => {
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
