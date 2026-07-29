"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
  /** Marca à esquerda, antes dos itens. */
  brand?: React.ReactNode;
  /** Ação à direita: entrar, criar conta. */
  actions?: React.ReactNode;
  /** Ações repetidas dentro do menu compacto. */
  mobileActions?: React.ReactNode;
}

/**
 * Barra de navegação com indicador que desliza entre os itens.
 *
 * Adaptada da versão original ("tubelight"), que vinha como pílula flutuante
 * com backdrop-blur e sombra em repouso. As três coisas são proibidas pelo
 * DESIGN.md: raio total fora de círculo lê como balão, glassmorphism não é
 * decoração padrão, e sombra só aparece como resposta a estado. O que se
 * preservou é o que fazia a peça boa — o indicador que se move de um item para
 * o outro com `layoutId`, em vez de aparecer e sumir.
 *
 * A versão original também mantinha um estado `isMobile` calculado num listener
 * de resize e nunca usado: a troca de rótulo por ícone já era feita por
 * breakpoint no CSS. Saiu.
 */
export function NavBar({ items, className, brand, actions, mobileActions }: NavBarProps) {
  const [activeTab, setActiveTab] = React.useState(items[0]?.name ?? "");
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function selectItem(name: string) {
    setActiveTab(name);
    setMobileOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-sticky)] border-b border-od-border bg-od-bg",
        className,
      )}
    >
      <nav className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-5 sm:px-8 min-[1536px]:max-w-[1480px] min-[1800px]:max-w-[1720px] min-[2200px]:max-w-[1960px]">
        {brand ? <div className="flex min-h-11 shrink-0 items-center lg:mr-2">{brand}</div> : null}

        <ul className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <li key={item.name}>
                <Link
                  href={item.url}
                  onClick={() => selectItem(item.name)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-2 rounded-md px-3 text-[13px] font-semibold transition-colors",
                    isActive ? "text-od-text" : "text-od-text-3 hover:text-od-text-2",
                  )}
                >
                  <Icon size={15} strokeWidth={2} className="shrink-0 xl:hidden" />
                  <span>{item.name}</span>

                  {isActive ? (
                    <motion.span
                      layoutId="navbar-indicator"
                      className="absolute inset-x-1 -bottom-px h-[2px] rounded bg-od-accent"
                      initial={false}
                      transition={{ type: "spring", stiffness: 320, damping: 32 }}
                      aria-hidden="true"
                    >
                      {/* Assinatura da peça original, contida: um brilho só, no
                          acento da marca, em vez das três manchas borradas. */}
                      <span className="absolute -top-1 left-1/2 h-3 w-10 -translate-x-1/2 rounded-full bg-od-accent/25 blur-md" />
                    </motion.span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
          <div className="relative lg:hidden">
            <button
              type="button"
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((current) => !current)}
              className="grid size-11 place-items-center rounded-md border border-od-border text-od-text-2 transition-colors hover:border-od-border-hover hover:text-od-text"
            >
              <Menu className="size-5" strokeWidth={2} />
            </button>
            {mobileOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[min(320px,calc(100vw-40px))] rounded-lg border border-od-border bg-od-surface p-2">
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.name;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.url}
                        onClick={() => selectItem(item.name)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded px-3 text-sm font-semibold transition-colors",
                          isActive
                            ? "bg-od-accent-tint text-od-text"
                            : "text-od-text-2 hover:bg-white/[0.04] hover:text-od-text",
                        )}
                      >
                        <Icon className="size-4 shrink-0" strokeWidth={2} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {mobileActions ? (
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-od-border pt-2">
                  {mobileActions}
                </div>
              ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  );
}
