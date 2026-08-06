"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronRight, LogOut, Settings, type LucideIcon } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { LogoMark } from "@/components/design-system/logo";
import { MobileAppNav } from "@/components/design-system/mobile-app-nav";
import { WorkspaceSwitcher } from "@/app/(dashboard)/painel/WorkspaceSwitcher";

/**
 * Um ícone de navegação. Mais largo que `LucideIcon` porque o item do Tim usa
 * a marca dele, e não um ícone genérico de robô: qualquer componente que
 * aceite tamanho, classe e espessura serve.
 */
export type NavIcon = React.ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
};

/** O ícone identifica a categoria na sidebar expandida; quando omitido,
    a navegação usa o ícone do primeiro item do grupo. */
export type NavGroup = { label: string; items: NavItem[]; icon?: LucideIcon };

/** Submenu opcional pendurado num item, com divulgacao propria. */
export type NavSubmenu = {
  parentHref: string;
  items: Array<{ href: string; label: string }>;
};

export function isCurrent(pathname: string, item: Pick<NavItem, "href" | "exact">) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const DEFAULT_NAVIGATION_WIDTH = 288;
const MIN_NAVIGATION_WIDTH = 256;
const MAX_NAVIGATION_WIDTH = 360;
const KEYBOARD_RESIZE_STEP = 16;

function clampNavigationWidth(width: number) {
  return Math.min(MAX_NAVIGATION_WIDTH, Math.max(MIN_NAVIGATION_WIDTH, width));
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "OT";
}

function DetailItem({
  item,
  pathname,
  submenu,
  submenuOpen,
  onToggleSubmenu,
}: {
  item: NavItem;
  pathname: string;
  submenu?: NavSubmenu;
  submenuOpen: boolean;
  onToggleSubmenu: () => void;
}) {
  const active = isCurrent(pathname, item);
  const Icon = item.icon;
  const hasBadge = typeof item.badge === "number" && item.badge > 0;
  const showDisclosure = submenu?.parentHref === item.href;

  return (
    <div>
      <div className={`flex min-h-11 items-center rounded-xl transition-colors ${active ? "bg-white/[0.05]" : "hover:bg-white/[0.035]"}`}>
      <Link
        href={item.href}
        prefetch={true}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-2.5 text-[13px] ${active ? "font-semibold text-od-text" : "text-od-text-2 hover:text-od-text"}`}
      >
        <span className={`relative grid size-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${active ? "bg-violet-400/[0.14] text-white ring-violet-200/[0.14]" : "bg-white/[0.035] text-od-text-3 ring-white/[0.04]"}`}>
          <Icon size={15} strokeWidth={active ? 2 : 1.7} />
          {active ? <span aria-hidden="true" className="absolute bottom-1 right-1 size-1 rounded-full bg-violet-300" /> : null}
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </Link>
      {showDisclosure ? (
        <button type="button" onClick={onToggleSubmenu} aria-expanded={submenuOpen} aria-label={submenuOpen ? `Recolher ${item.label}` : `Expandir ${item.label}`} title={submenuOpen ? "Recolher" : "Expandir"} className="grid size-11 shrink-0 place-items-center text-od-text-3 hover:text-od-text">
          <ChevronRight size={13} className={`transition-transform duration-150 ${submenuOpen ? "rotate-90" : ""}`} />
        </button>
      ) : hasBadge ? (
        <span className={`px-1.5 text-xs font-semibold tabular-nums ${item.danger ? "text-[#c0392b]" : "text-od-text-3"}`}>{item.badge}</span>
      ) : null}
      </div>
      {showDisclosure && submenu && submenuOpen ? (
        <div className="ml-7 mt-1 flex flex-col gap-1 pr-2.5">
          {submenu.items.map((sub) => (
            <Link key={sub.href} href={sub.href} className={`flex min-h-11 items-center rounded-xl px-2 text-[12px] ${pathname === sub.href ? "bg-white/[0.04] font-medium text-od-text" : "text-od-text-3 hover:text-od-text"}`}>
              {sub.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  /** Identificador da vertical, preservado na API compartilhada com o mobile. */
  namespace: string;
  /** groups[0] contém destinos globais; groups[1+] são categorias visíveis. */
  groups: NavGroup[];
  submenu?: NavSubmenu;
  logoHref: string;
  subtitle: string;
  organizationName: string;
  displayName: string;
  workspaceOptions?: Array<{ value: string; label: string }>;
  workspaceKey?: string;
  onLogout: (formData: FormData) => void;
  railAriaLabel: string;
  detailAriaLabel: string;
  mobileTabs: [NavItem, NavItem, NavItem];
  mobileTimHref: string;
  mobileGroups: NavGroup[];
  mobileAriaLabel: string;
  mobileQuickActions?: NavItem[];
};

/**
 * Navegação de produto expandida no desktop: um único painel de vidro
 * mantém destinos globais, categorias e itens visíveis durante toda a
 * sessão. As quatro verticais compartilham a mesma gramática; o mobile
 * continua isolado no dock e no sheet próprios.
 */
export function TwoLevelNav({
  namespace,
  groups,
  submenu,
  logoHref,
  subtitle,
  organizationName,
  displayName,
  workspaceOptions = [],
  workspaceKey,
  onLogout,
  railAriaLabel,
  detailAriaLabel,
  mobileTabs,
  mobileTimHref,
  mobileGroups,
  mobileAriaLabel,
  mobileQuickActions,
}: Props) {
  const pathname = usePathname();
  const [submenuOpen, setSubmenuOpen] = useState(true);
  const [navigationWidth, setNavigationWidth] = useState(DEFAULT_NAVIGATION_WIDTH);
  const stopResizeRef = useRef<(() => void) | null>(null);
  const anchor = groups[0] ?? { label: "", items: [] };
  const categories = groups.slice(1);
  const navigationWidthStorageKey = `otimizia:navigation-width:${namespace}`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let storedWidth: string | null = null;
      try {
        storedWidth = window.localStorage.getItem(navigationWidthStorageKey);
      } catch {
        return;
      }
      if (storedWidth === null) return;

      const parsedWidth = Number(storedWidth);
      if (Number.isFinite(parsedWidth)) {
        setNavigationWidth(clampNavigationWidth(parsedWidth));
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [navigationWidthStorageKey]);

  useEffect(() => () => stopResizeRef.current?.(), []);

  function updateNavigationWidth(width: number, persist = true) {
    const nextWidth = clampNavigationWidth(width);
    setNavigationWidth(nextWidth);

    if (persist) {
      try {
        window.localStorage.setItem(navigationWidthStorageKey, String(nextWidth));
      } catch {
        // O ajuste continua funcional mesmo quando o armazenamento está indisponível.
      }
    }
  }

  function startNavigationResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    stopResizeRef.current?.();

    const startX = event.clientX;
    const startWidth = navigationWidth;
    const pointerId = event.pointerId;
    const controller = new AbortController();
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const stopResize = () => {
      controller.abort();
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      if (stopResizeRef.current === stopResize) stopResizeRef.current = null;
    };

    const widthFromPointer = (pointerEvent: globalThis.PointerEvent) =>
      clampNavigationWidth(startWidth + pointerEvent.clientX - startX);

    const handlePointerMove = (pointerEvent: globalThis.PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      updateNavigationWidth(widthFromPointer(pointerEvent), false);
    };

    const finishPointerResize = (pointerEvent: globalThis.PointerEvent) => {
      if (pointerEvent.pointerId !== pointerId) return;
      updateNavigationWidth(widthFromPointer(pointerEvent));
      stopResize();
    };

    stopResizeRef.current = stopResize;
    window.addEventListener("pointermove", handlePointerMove, { signal: controller.signal });
    window.addEventListener("pointerup", finishPointerResize, { signal: controller.signal });
    window.addEventListener("pointercancel", finishPointerResize, { signal: controller.signal });
  }

  function resizeNavigationWithKeyboard(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const nextWidth = {
      ArrowLeft: navigationWidth - KEYBOARD_RESIZE_STEP,
      ArrowRight: navigationWidth + KEYBOARD_RESIZE_STEP,
      Home: MIN_NAVIGATION_WIDTH,
      End: MAX_NAVIGATION_WIDTH,
    }[event.key];

    if (nextWidth === undefined) return;
    event.preventDefault();
    updateNavigationWidth(nextWidth);
  }

  function toggleSubmenu() {
    setSubmenuOpen((current) => !current);
  }

  return (
    <>
      <div
        data-liquid-glass-shell
        data-product-nav-expanded="true"
        data-navigation-width={navigationWidth}
        className="od-chrome product-nav-glass-shell sticky top-3 z-50 ml-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 md:flex"
        style={{ width: navigationWidth }}
      >
        <aside className="flex h-full min-h-0 min-w-0 flex-1 flex-col" aria-label={detailAriaLabel}>
          <header className="flex items-start gap-3 p-4 pb-3">
            <Link href={logoHref} prefetch={true} aria-label="Visão geral" className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.04]">
              <LogoMark size={26} />
            </Link>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-xs font-semibold text-od-text">{organizationName}</p>
              <p className="mt-0.5 truncate text-xs text-od-text-3">{subtitle}</p>
            </div>
          </header>

          {workspaceOptions.length > 1 && workspaceKey ? (
            <div className="px-4 pb-3"><WorkspaceSwitcher options={workspaceOptions} value={workspaceKey} /></div>
          ) : null}

          <nav aria-label={railAriaLabel} className="liquid-glass-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <div className="flex flex-col gap-0.5">
              {anchor.items.map((item) => (
                <DetailItem key={item.href} item={item} pathname={pathname} submenu={submenu} submenuOpen={submenuOpen} onToggleSubmenu={toggleSubmenu} />
              ))}
            </div>

            {categories.map((group) => {
              const GroupIcon = group.icon ?? group.items[0]?.icon;
              return (
                <section key={group.label} className="mt-4" aria-label={group.label}>
                  <div className="flex min-h-8 items-center gap-2 px-2.5 text-od-text-3">
                    {GroupIcon ? <GroupIcon size={14} strokeWidth={1.8} className="text-violet-300" aria-hidden="true" /> : null}
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em]">{group.label}</h2>
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <DetailItem key={item.href} item={item} pathname={pathname} submenu={submenu} submenuOpen={submenuOpen} onToggleSubmenu={toggleSubmenu} />
                    ))}
                  </div>
                </section>
              );
            })}
          </nav>

          <div className="p-3 pt-1">
            <Link
              href="/painel/configuracoes"
              prefetch={true}
              aria-current={pathname.startsWith("/painel/configuracoes") ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-[13px] transition-colors ${pathname.startsWith("/painel/configuracoes") ? "bg-white/[0.05] font-semibold text-od-text" : "text-od-text-2 hover:bg-white/[0.035] hover:text-od-text"}`}
            >
              <Settings size={16} strokeWidth={1.8} className="text-od-text-3" />
              Configurações
            </Link>
            <form action={onLogout}>
              <PendingButton pendingLabel="Saindo" className="group relative flex min-h-11 w-full items-center justify-start gap-2.5 rounded-xl px-2.5 text-[13px] text-od-text-2 transition-colors hover:bg-white/[0.035] hover:text-od-text" aria-label="Sair">
                <LogOut size={16} strokeWidth={1.8} className="text-od-text-3" />
                Sair
              </PendingButton>
            </form>
            <div className="mt-1 flex min-h-11 items-center gap-2.5 px-2.5">
              <span title={displayName} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[11px] font-semibold text-od-text-2">{initials(displayName)}</span>
              <span className="min-w-0 truncate text-xs text-od-text-3">{displayName}</span>
            </div>
          </div>
        </aside>
        <button
          type="button"
          role="separator"
          aria-label="Redimensionar menu lateral"
          aria-orientation="vertical"
          aria-valuemin={MIN_NAVIGATION_WIDTH}
          aria-valuemax={MAX_NAVIGATION_WIDTH}
          aria-valuenow={navigationWidth}
          aria-keyshortcuts="ArrowLeft ArrowRight Home End"
          title="Arraste ou use as setas para ajustar a largura. Clique duas vezes para restaurar."
          onPointerDown={startNavigationResize}
          onKeyDown={resizeNavigationWithKeyboard}
          onDoubleClick={() => updateNavigationWidth(DEFAULT_NAVIGATION_WIDTH)}
          className="group relative z-10 flex h-full w-3 shrink-0 cursor-col-resize touch-none items-center justify-center focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="h-14 w-1 rounded-full bg-white/25 opacity-50 shadow-[0_0_10px_rgba(255,255,255,0.12)] transition-all duration-200 group-hover:bg-white/45 group-hover:opacity-100 group-focus-visible:bg-violet-300 group-focus-visible:opacity-100"
          />
        </button>
      </div>

      <MobileAppNav
        tabs={mobileTabs}
        timHref={mobileTimHref}
        groups={mobileGroups}
        quickActions={mobileQuickActions}
        ariaLabel={mobileAriaLabel}
      />
    </>
  );
}
