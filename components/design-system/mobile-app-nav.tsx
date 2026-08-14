"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
        setOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
              onClick={() => setOpen(false)}
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
              className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[var(--z-sticky)] mx-auto max-h-[66dvh] max-w-md overflow-y-auto rounded-t-[var(--radius-panel)] border border-b-0 border-od-border bg-od-muted-surface md:hidden"
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
                className="flex min-h-14 items-center gap-3 border-b border-od-border px-4 hover:bg-[var(--surface-hover)]"
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

      <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-od-border bg-od-sidebar pb-[env(safe-area-inset-bottom)] md:hidden">
        <nav
          data-mobile-nav
          className="mx-auto grid min-h-16 max-w-md grid-cols-5 px-1"
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
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-area-menu"
            className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] px-1 text-[10px] font-medium leading-none transition-colors ${
              open || anyGroupActive
                ? "bg-od-accent-tint text-od-text"
                : "text-od-text-3 hover:text-od-text-2"
            }`}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
            <span>{open ? "Fechar" : "Mais"}</span>
          </button>
          <BarTab
            item={tabs[2]}
            active={tabActive(tabs[2])}
            onTap={() => setPendingHref(tabs[2].href)}
          />
          <TimTab
            href={timHref}
            active={timActive}
            onTap={() => setPendingHref(timHref)}
          />
        </nav>
      </div>
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
      className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] px-1 text-center text-[10px] font-medium leading-[1.1] transition-colors ${
        active
          ? "bg-od-accent-tint text-od-text"
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
      className={`flex min-h-12 items-center gap-3 px-4 hover:bg-[var(--surface-hover)] ${
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
    <Link
      href={href}
      prefetch
      onClick={onTap}
      aria-current={active ? "page" : undefined}
      aria-label="Falar com o Tim"
      className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] px-1 text-[10px] font-medium leading-none transition-colors ${
        active
          ? "bg-od-accent-tint text-od-text"
          : "text-od-text-3 hover:text-od-text-2"
      }`}
    >
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full ${
          active ? "bg-od-accent" : "bg-od-surface"
        }`}
      >
        <LogoMark size={13} />
      </span>
      <span>Tim</span>
    </Link>
  );
}
