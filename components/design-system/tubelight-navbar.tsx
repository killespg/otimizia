"use client";

import * as React from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import Link from "next/link";
import { Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/utils";

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
  const [scrolled, setScrolled] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Barra sólida em repouso (topo da página); ao rolar, o fundo fica a 50%
  // — só opacidade, sem blur/glassmorphism (isso já foi tirado daqui antes,
  // ver comentário do componente).
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

  function selectItem(name: string) {
    setActiveTab(name);
    setMobileOpen(false);
  }

  // Mesmo contrato do menu "Mais" do painel (components/design-system/mobile-app-nav.tsx):
  // trava o scroll do body, foca o primeiro item e fecha no Escape. Assim o menu
  // da landing usa a mesma gramática de app da área logada, em vez de um dropdown
  // de site solto no canto.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])")?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function trapFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
    <header
      className={cn(
        "sticky top-0 z-[var(--z-sticky)] border-b border-od-border transition-colors duration-200",
        scrolled ? "bg-od-bg/50" : "bg-od-bg",
        className,
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
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
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMobileOpen((current) => !current)}
            className="grid size-11 place-items-center rounded-md text-od-text-2 transition-colors hover:bg-white/[0.05] hover:text-od-text lg:hidden"
          >
            {mobileOpen ? <X className="size-5" strokeWidth={2} /> : <Menu className="size-5" strokeWidth={2} />}
          </button>
        </div>
      </nav>
    </header>

    {/* Folha que sobe do rodapé, no lugar do dropdown ancorado no canto: mesmo
        padrão do menu "Mais" da área logada (backdrop + painel com trava de
        foco), pra a navegação da landing parar de ler como site e passar a
        ler como o resto do produto. Fora do <header>: um dialog não é filho
        semântico de landmark banner. */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[var(--z-dropdown)] bg-black/55 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            />
            <motion.section
              ref={panelRef}
              id="landing-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              onKeyDown={trapFocus}
              className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] mx-auto max-h-[80dvh] max-w-md overflow-y-auto rounded-t-lg border border-b-0 border-od-border bg-od-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-od-border" aria-hidden="true" />
              <ul className="space-y-2 p-3">
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
                          "flex min-h-14 items-center gap-3 rounded px-3 text-[15px] font-semibold transition-colors",
                          isActive
                            ? "bg-od-accent-tint text-od-text"
                            : "text-od-text-2 hover:bg-white/[0.04] hover:text-od-text",
                        )}
                      >
                        <Icon className="size-[18px] shrink-0" strokeWidth={2} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {mobileActions ? (
                <div className="grid grid-cols-2 gap-3 border-t border-od-border p-3 pt-4">
                  {mobileActions}
                </div>
              ) : null}
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
