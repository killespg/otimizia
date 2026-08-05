"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Menu, X, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/design-system/logo";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
};

export type MobileNavGroup = { label: string; items: MobileNavItem[] };

type Props = {
  tabs: [MobileNavItem, MobileNavItem, MobileNavItem];
  timHref: string;
  groups: MobileNavGroup[];
  quickActions?: MobileNavItem[];
  ariaLabel: string;
};

function isCurrent(pathname: string, item: { href: string; exact?: boolean }) {
  const base = item.href.split("#")[0];
  if (item.exact) return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function MobileAppNav({
  tabs,
  timHref,
  groups,
  quickActions,
  ariaLabel,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 4000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
        ?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [closeMenu, open]);

  const tabActive = (item: { href: string; exact?: boolean }) =>
    pendingHref ? pendingHref === item.href : isCurrent(pathname, item);
  const timActive = pendingHref
    ? pendingHref === timHref
    : isCurrent(pathname, { href: timHref });
  const anyGroupActive = groups.some((group) =>
    group.items.some((item) => isCurrent(pathname, item)),
  );

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
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
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar menu"
              onClick={() => closeMenu()}
              className="fixed inset-0 z-[var(--z-dropdown)] bg-black/55 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            />
            <motion.section
              ref={panelRef}
              id="mobile-area-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Todas as áreas"
              onKeyDown={trapFocus}
              className="glass liquid-glass-mobile-sheet fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[var(--z-sticky)] mx-auto max-h-[66dvh] max-w-md overflow-y-auto rounded-3xl md:hidden"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
              }
            >
              <Link
                href={timHref}
                onClick={() => setOpen(false)}
                className="flex min-h-14 items-center gap-3 border-b border-od-border px-4 hover:bg-white/[0.035]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-od-accent">
                  <LogoMark size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-od-text">
                    Falar com o Tim
                  </span>
                  <span className="block text-xs text-od-text-3">
                    Assistente com o contexto do negócio
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-od-text-3" />
              </Link>

              {quickActions && quickActions.length > 0 ? (
                <MenuGroup label="Criar">
                  {quickActions.map((action, index) => (
                    <MenuRow
                      key={action.href + action.label}
                      {...action}
                      accentIcon
                      divided={index > 0}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </MenuGroup>
              ) : null}

              {groups.map((group) => (
                <MenuGroup key={group.label} label={group.label}>
                  {group.items.map((item, index) => (
                    <MenuRow
                      key={item.href + item.label}
                      {...item}
                      active={isCurrent(pathname, item)}
                      divided={index > 0}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </MenuGroup>
              ))}
              <div className="h-2" />
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>

      {/* Ordem fixa da barra: os dois destinos mais usados, o Tim flutuando no
          centro, o terceiro destino e o menu de áreas. O Tim fica no meio
          porque é a ação, não um destino — e o alcance do polegar é melhor ali. */}
      <nav
        data-mobile-nav
        className="od-chrome liquid-glass-dock fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[var(--z-sticky)] mx-auto flex min-h-16 max-w-md items-center justify-between px-6 md:hidden"
        aria-label={ariaLabel}
      >
          <BarTab
            item={tabs[0]}
            active={tabActive(tabs[0])}
            onTap={() => setPendingHref(tabs[0].href)}
          />
          <BarTab
            item={tabs[1]}
            active={tabActive(tabs[1])}
            onTap={() => setPendingHref(tabs[1].href)}
          />
          <TimTab
            href={timHref}
            active={timActive}
            onTap={() => setPendingHref(timHref)}
          />
          <BarTab
            item={tabs[2]}
            active={tabActive(tabs[2])}
            onTap={() => setPendingHref(tabs[2].href)}
          />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-area-menu"
            // `h-14` e não só `min-h-14`: a regra global de toque
            // (.product-workspace button { min-height: 44px }) tem
            // especificidade maior e achatava só este item, deixando o "Mais"
            // 12px mais baixo que as abas vizinhas, que são links.
            className={`relative flex h-14 min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded px-1 text-[10px] font-medium leading-none transition-colors ${
              open || anyGroupActive
                ? "bg-white/[0.05] text-od-text"
                : "text-od-text-3 hover:text-od-text-2"
            }`}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
            <span>{open ? "Fechar" : "Mais"}</span>
          </button>
      </nav>
    </>
  );
}

function BarTab({
  item,
  active,
  onTap,
}: {
  item: MobileNavItem;
  active: boolean;
  onTap?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      onClick={onTap}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded px-1 text-center text-[10px] font-medium leading-[1.1] transition-colors ${
        active
          ? "bg-white/[0.05] text-od-text"
          : "text-od-text-3 hover:text-od-text-2"
      }`}
    >
      <span className="relative shrink-0">
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        {typeof item.badge === "number" && item.badge > 0 ? (
          <span
            className={`absolute -right-2.5 -top-2 min-w-4 rounded-full px-1 text-[10px] font-semibold leading-4 tabular-nums ${
              item.danger
                ? "bg-danger-500 text-white"
                : "bg-od-surface text-od-text"
            }`}
          >
            {item.badge}
          </span>
        ) : null}
      </span>
      <span className="relative max-w-full text-balance">{item.label}</span>
    </Link>
  );
}

function MenuGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      {label ? (
        <p className="px-4 pb-1 pt-4 text-xs font-semibold text-od-text-2">{label}</p>
      ) : (
        <div className="pt-2" />
      )}
      {children}
    </div>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
  badge,
  danger,
  active,
  accentIcon,
  divided,
  onNavigate,
}: MobileNavItem & {
  active?: boolean;
  accentIcon?: boolean;
  divided: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center gap-3 px-4 hover:bg-white/[0.03] ${
        divided ? "border-t border-od-border" : ""
      }`}
    >
      <Icon
        size={18}
        className={
          active || accentIcon ? "text-od-accent-hover" : "text-od-text-3"
        }
      />
      <span
        className={`min-w-0 flex-1 text-sm ${
          active ? "font-semibold text-od-text" : "text-od-text-2"
        }`}
      >
        {label}
      </span>
      {typeof badge === "number" && badge > 0 ? (
        <span
          className={`text-xs font-semibold tabular-nums ${
            danger ? "text-danger-300" : "text-od-text-3"
          }`}
        >
          {badge}
        </span>
      ) : null}
      {active ? (
        <span className="size-1.5 shrink-0 rounded-full bg-od-accent" />
      ) : null}
    </Link>
  );
}

/**
 * O Tim é o único item elevado da barra: sobe acima do dock e ganha o anel da
 * cor do fundo para parecer recortado nele. Continua sendo `Link`, e não
 * `button`, porque o alvo é uma rota — trocar por `button` perderia prefetch,
 * abrir em nova aba e o botão do meio do mouse.
 */
function TimTab({
  href,
  active,
  onTap,
}: {
  href: string;
  active: boolean;
  onTap?: () => void;
}) {
  return (
    <div className="relative -top-3 flex items-center justify-center">
      <Link
        href={href}
        prefetch
        onClick={onTap}
        aria-current={active ? "page" : undefined}
        aria-label="Falar com o Tim"
        className={`flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-od-bg bg-od-accent text-white shadow-[0_0_15px_rgba(135,87,240,0.5)] ${
          active ? "ring-2 ring-white/45" : ""
        }`}
      >
        {/* A marca é roxa (rgb(124,65,212)) e o círculo é indigo: sobrepostas
            dão contraste ~1:1 e o ícone simplesmente some. Invertida para
            branco a silhueta da marca se mantém e o contraste vai a ~5:1. */}
        <LogoMark size={22} className="brightness-0 invert" />
      </Link>
    </div>
  );
}
