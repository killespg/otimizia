"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  BellRing,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  ClipboardList,
  ContactRound,
  FileSearch,
  Files,
  HandCoins,
  HousePlus,
  KanbanSquare,
  Landmark,
  Layers3,
  LogOut,
  MapPinned,
  MessageCircle,
  PackageSearch,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { WorkspaceSwitcher } from "@/app/(dashboard)/painel/WorkspaceSwitcher";
import { LogoMark, LogoWordmark } from "@/components/design-system/logo";
import { MobileAppNav } from "@/components/design-system/mobile-app-nav";
import {
  ProductNavGroups,
  type NavGroup,
  type NavItem,
  type NavSubmenu,
} from "@/components/design-system/product-nav-groups";
import { PendingButton } from "@/components/ui/PendingButton";
import type {
  NavigationIconKey,
  NavigationItem,
  ProductNavigationContract,
} from "@/lib/design-system/navigation";

const ICONS: Record<NavigationIconKey, LucideIcon> = {
  overview: CircleGauge,
  assistant: Bot,
  contacts: ContactRound,
  pipeline: KanbanSquare,
  tasks: BellRing,
  whatsapp: MessageCircle,
  calendar: CalendarDays,
  team: Users,
  products: PackageSearch,
  collections: Layers3,
  orders: ClipboardList,
  warranty: ShieldCheck,
  settings: Settings,
  processes: BriefcaseBusiness,
  deadlines: CalendarDays,
  search: FileSearch,
  documents: Files,
  finance: BadgeDollarSign,
  receivables: WalletCards,
  expenses: ReceiptText,
  reports: Landmark,
  properties: Building2,
  map: MapPinned,
  visits: CalendarDays,
  commissions: HandCoins,
  admin: BarChart3,
  create: HousePlus,
};

function toWebItem(item: NavigationItem): NavItem {
  return { ...item, icon: ICONS[item.icon] };
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OT"
  );
}

type Props = {
  navigation: ProductNavigationContract;
  workspaceKey: string;
  workspaceOptions: Array<{ value: string; label: string }>;
  organizationName: string;
  displayName: string;
};

export function ProductShellNavigation({
  navigation,
  workspaceKey,
  workspaceOptions,
  organizationName,
  displayName,
}: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(
        window.localStorage.getItem("otimizia-sidebar-collapsed") === "1",
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        "otimizia-sidebar-collapsed",
        next ? "1" : "0",
      );
      return next;
    });
  }

  const groups: NavGroup[] = navigation.groups.map((group) => ({
    label: group.label,
    items: group.items.map(toWebItem),
  }));
  const bottomTabs = navigation.bottomTabs.map(toWebItem) as [
    NavItem,
    NavItem,
    NavItem,
  ];
  const quickActions = navigation.quickActions.map(toWebItem);
  const hiddenFromMenu = new Set([
    ...navigation.bottomTabs.map((tab) => tab.href.split("#")[0]),
    navigation.assistantHref,
  ]);
  const mobileGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !hiddenFromMenu.has(item.href.split("#")[0]),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const submenuParent = navigation.submenu
    ? navigation.groups
        .flatMap((group) => group.items)
        .find((entry) => entry.key === navigation.submenu?.parentKey)
    : undefined;
  const submenu: NavSubmenu | undefined =
    navigation.submenu && submenuParent
      ? {
          parentHref: submenuParent.href,
          items: navigation.submenu.items.map(({ href, label }) => ({
            href,
            label,
          })),
        }
      : undefined;

  return (
    <>
      <aside
        className={`product-sidebar sticky top-0 z-50 hidden h-screen shrink-0 flex-col border-r border-od-border bg-od-sidebar transition-[width] duration-200 ease-out md:flex ${collapsed ? "w-16" : "w-56"}`}
        aria-label="Navegação principal"
        data-sidebar-state={collapsed ? "collapsed" : "expanded"}
      >
        <div
          className={`flex h-16 items-center border-b border-od-border ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}
        >
          <Link
            href="/painel"
            aria-label="Ir para o painel"
            className="nav-item rounded-[var(--radius-control)] focus-visible:ring-2 focus-visible:ring-od-accent"
          >
            {collapsed ? <LogoMark size={30} /> : <LogoWordmark height={28} />}
          </Link>
          {!collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Recolher menu lateral"
              className="grid size-11 place-items-center rounded-[var(--radius-control)] text-od-text-3 hover:bg-[var(--surface-hover)] hover:text-od-text"
            >
              <ChevronLeft size={17} />
            </button>
          ) : null}
        </div>

        <nav className={`product-scroll-region min-h-0 flex-1 overflow-y-auto py-1 ${collapsed ? "px-1" : "px-0"}`}>
          <ProductNavGroups
            namespace={navigation.namespace}
            groups={groups}
            collapsed={collapsed}
            pathname={pathname}
            defaultPinned={[]}
            submenu={submenu}
          />
        </nav>

        <div className="border-t border-od-border py-2">
          <Link
            href="/configuracoes"
            aria-label={`Abrir configurações da conta de ${displayName}`}
            title={collapsed ? "Configurações da conta" : undefined}
            className={`mx-1 flex min-h-11 items-center rounded-[var(--radius-control)] transition-colors ${collapsed ? "justify-center" : "gap-3 px-3"} text-od-text-2 hover:bg-[var(--surface-hover)] hover:text-od-text`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-od-accent-tint text-xs font-semibold text-od-accent-soft">
              {initials(displayName)}
            </span>
            {!collapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-od-text-2">
                  {displayName}
                </span>
                <span className="block truncate text-[11px] text-od-text-3">
                  {organizationName}
                </span>
              </span>
            ) : null}
          </Link>
          {!collapsed && workspaceOptions.length > 1 ? (
            <div className="mx-1 px-3 pb-1">
              <WorkspaceSwitcher
                options={workspaceOptions}
                value={workspaceKey}
              />
            </div>
          ) : null}
          <form action={logout} className="mx-1">
            <PendingButton
              intent="quiet"
              iconOnly={collapsed}
              pendingLabel="Saindo"
              className={`w-full ${collapsed ? "px-0" : "justify-start px-3"}`}
            >
              <LogOut size={16} />
              {!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}
            </PendingButton>
          </form>
          {collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expandir menu lateral"
              className="mx-1 mt-1 grid min-h-11 w-full place-items-center rounded-[var(--radius-control)] text-od-text-3 hover:bg-[var(--surface-hover)] hover:text-od-text"
            >
              <ChevronRight size={17} />
            </button>
          ) : null}
        </div>
      </aside>

      <MobileAppNav
        tabs={bottomTabs}
        timHref={navigation.assistantHref}
        groups={mobileGroups}
        quickActions={quickActions}
        ariaLabel="Navegação principal no celular"
      />
    </>
  );
}
