"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
  BellRing,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  ContactRound,
  KanbanSquare,
  Layers3,
  ClipboardList,
  LogOut,
  MessageCircle,
  PackageSearch,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { PendingButton } from "@/components/PendingButton";
import { LogoMark, LogoWordmark } from "@/components/design-system/logo";
import { MobileAppNav } from "@/components/design-system/mobile-app-nav";
import { WorkspaceSwitcher } from "@/app/(dashboard)/painel/WorkspaceSwitcher";
import type { SellerModule } from "@/lib/supabase/types";

type SellerCounts = { contacts: number; deals: number; reminders: number };

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
};

type Props = {
  workspaceKey: string;
  workspaceOptions: Array<{ value: string; label: string }>;
  displayName: string;
  organizationName: string;
  counts: SellerCounts;
  enabledModules: SellerModule[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OT";
}

function isCurrent(pathname: string, item: NavItem) {
  if (item.href === "/painel" && pathname === "/painel/funil/relatorio") return true;
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SellerProductNavigation({ workspaceKey, workspaceOptions, displayName, organizationName, counts, enabledModules }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(255);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCollapsed(window.localStorage.getItem("otimizia-seller-sidebar-collapsed") === "1");
      const savedWidth = Number(window.localStorage.getItem("otimizia-seller-sidebar-width-v2"));
      if (Number.isFinite(savedWidth) && savedWidth >= 220 && savedWidth <= 360) {
        setSidebarWidth(savedWidth);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("otimizia-seller-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    setCollapsed(false);
    window.localStorage.setItem("otimizia-seller-sidebar-collapsed", "0");

    const move = (pointerEvent: PointerEvent) => {
      setSidebarWidth(Math.min(360, Math.max(220, startWidth + pointerEvent.clientX - startX)));
    };
    const finish = (pointerEvent: PointerEvent) => {
      const next = Math.min(360, Math.max(220, startWidth + pointerEvent.clientX - startX));
      setSidebarWidth(next);
      window.localStorage.setItem("otimizia-seller-sidebar-width-v2", String(next));
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  }

  const overview: NavItem[] = [
    { href: "/painel", label: "Visão geral", icon: CircleGauge, exact: true },
    { href: "/painel/assistente", label: "Tim", icon: Bot },
  ];
  const crm: NavItem[] = [
    { href: "/painel/contatos", label: "Clientes", icon: ContactRound, badge: counts.contacts },
    { href: "/painel/funil", label: "Funil de vendas", icon: KanbanSquare, badge: counts.deals, exact: true },
    { href: "/painel/tarefas", label: "Lembretes", icon: BellRing, badge: counts.reminders, danger: counts.reminders > 0 },
    { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
  ];
  const operation: NavItem[] = [
    { href: "/painel/produtos", label: "Produtos", icon: PackageSearch },
    ...(enabledModules.includes("collections") ? [{ href: "/painel/colecoes", label: "Coleções", icon: Layers3 }] : []),
    { href: "/painel/pedidos", label: "Pedidos", icon: ClipboardList },
    ...(enabledModules.includes("warranties") ? [{ href: "/painel/pos-venda", label: "Pós-venda", icon: ShieldCheck }] : []),
  ];
  const management: NavItem[] = [
    { href: "/painel/equipe", label: "Meu negócio", icon: Users },
    { href: "/painel/operacao/configuracoes", label: "Configurar operação", icon: SlidersHorizontal },
  ];
  const groups = [
    { label: "", items: overview },
    { label: "CRM", items: crm },
    { label: "Operação", items: operation },
    { label: "Gestão", items: management },
  ];

  function Item({ item }: { item: NavItem }) {
    const active = isCurrent(pathname, item);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        prefetch={true}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={`group flex min-h-9 items-center rounded-xl text-sm transition-colors ${collapsed ? "mx-auto size-9 justify-center" : "gap-2 px-2"} ${active ? "bg-white/[0.075] font-semibold text-white" : "text-white/58 hover:bg-white/[0.045] hover:text-white"}`}
      >
        <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-od-text-2" : "text-white/55 group-hover:text-white/75"} />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.label === "Visão geral" ? <ChevronRight size={14} className="text-white/28" /> : null}
            {typeof item.badge === "number" && item.badge > 0 ? (
              <span className={`text-[11px] font-semibold tabular-nums ${item.danger ? "text-[#fb7767]" : "text-white/65"}`}>
                {item.badge}
              </span>
            ) : null}
          </>
        ) : null}
      </Link>
    );
  }

  const mobileTabs: [NavItem, NavItem, NavItem] = [overview[0], crm[3], crm[1]];
  const barHrefs = new Set([overview[0].href, crm[3].href, crm[1].href, overview[1].href]);
  const mobileGroups = [
    { label: "CRM", items: crm },
    { label: "Operação", items: operation },
    { label: "Gestão", items: [...management, { href: "/painel/configuracoes", label: "Configurações", icon: Settings }] },
  ]
    .map((group) => ({ label: group.label, items: group.items.filter((item) => !barHrefs.has(item.href)) }))
    .filter((group) => group.items.length > 0);
  const quickActions: NavItem[] = [
    { href: "/painel/funil#new-deal", label: "Nova venda", icon: KanbanSquare },
    { href: "/painel/tarefas#new-task", label: "Novo lembrete", icon: BellRing },
  ];

  return (
    <>
      <aside
        className={`relative sticky top-0 z-50 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[#0f0d11] md:flex ${collapsed ? "w-16" : ""}`}
        style={collapsed ? undefined : { width: sidebarWidth }}
        data-sidebar-state={collapsed ? "collapsed" : "expanded"}
        aria-label="Navegação de vendas"
      >
        <header className="border-b border-white/[0.06] p-3 pb-4">
          <div className={`flex h-7 items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            <Link href="/painel" prefetch={true} aria-label="Visão geral">
              {collapsed ? <LogoMark size={30} /> : <LogoWordmark height={30} />}
            </Link>
            {!collapsed ? (
              <button type="button" onClick={toggle} aria-label="Recolher menu" className="grid size-7 place-items-center rounded-xl text-white/38 hover:bg-white/[0.06] hover:text-white">
                <ChevronLeft size={15} />
              </button>
            ) : null}
          </div>
          {!collapsed ? (
            <div className="mx-1 mt-4 border-t border-white/[0.06] pt-3">
              <p className="truncate text-xs font-semibold text-white/85">{organizationName}</p>
              <p className="mt-0.5 text-xs text-white/52">Vendedor autônomo</p>
              {workspaceOptions.length > 1 ? (
                <div className="mt-3"><WorkspaceSwitcher options={workspaceOptions} value={workspaceKey} /></div>
              ) : null}
            </div>
          ) : null}
        </header>

        <nav className="flex-1 overflow-y-auto px-2">
          {groups.map((group) => (
            <section key={group.label || "overview"} className="mb-0 p-2">
              {!collapsed && group.label ? <p className="flex h-8 items-center px-2 text-xs font-medium text-white/46">{group.label}</p> : null}
              <div>
                {group.items.map((item, index) => (
                  <Fragment key={item.href + item.label}>
                    <Item item={item} />
                    {group.label === "" && index === 0 && !collapsed && (pathname === "/painel" || pathname === "/painel/funil/relatorio") ? (
                      <div className="mx-3.5 flex translate-x-px flex-col gap-1 border-l border-white/[0.08] px-2.5 py-0.5">
                        <Link href="/painel" prefetch={true} className={`flex h-7 -translate-x-px items-center rounded-xl px-2 text-sm font-medium ${pathname === "/painel" ? "bg-white/[0.055] text-white" : "text-white/42 hover:text-white"}`}>Meu dia</Link>
                        <Link href="/painel/funil/relatorio" prefetch={true} className={`flex h-7 -translate-x-px items-center rounded-xl px-2 text-sm ${pathname === "/painel/funil/relatorio" ? "bg-white/[0.055] font-medium text-white" : "text-white/42 hover:text-white"}`}>Desempenho</Link>
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <footer className="border-t border-white/[0.06] p-2">
          <Link href="/painel/configuracoes" prefetch={true} className={`flex min-h-9 items-center rounded-xl text-sm text-white/58 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2"}`}>
            <Settings size={16} />{!collapsed ? <span>Configurações</span> : null}
          </Link>
          {!collapsed ? (
            <div className="mt-1 flex items-center gap-3 px-2 py-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs font-semibold text-white/75">{initials(displayName)}</span>
              <p className="min-w-0 truncate text-xs font-medium text-white/65">{displayName}</p>
            </div>
          ) : null}
          <form action={logout}>
            <PendingButton iconOnly={collapsed} pendingLabel="Saindo" className={`flex min-h-9 w-full items-center rounded-xl text-sm text-white/48 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2"}`}>
              <LogOut size={16} />{!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}
            </PendingButton>
          </form>
          {collapsed ? (
            <button type="button" onClick={toggle} aria-label="Expandir menu" className="mt-1 grid min-h-9 w-full place-items-center rounded text-white/45 hover:bg-white/[0.05] hover:text-white">
              <ChevronRight size={16} />
            </button>
          ) : null}
        </footer>

        {!collapsed ? (
          <button
            type="button"
            aria-label="Redimensionar menu lateral"
            title="Arraste para redimensionar"
            onPointerDown={startResize}
            onDoubleClick={() => {
              setSidebarWidth(255);
              window.localStorage.setItem("otimizia-seller-sidebar-width-v2", "255");
            }}
            className="group absolute inset-y-0 -right-1 z-[var(--z-modal-backdrop)] flex w-2 cursor-col-resize items-center justify-center touch-none"
          >
            <span className="h-12 w-1 rounded-full bg-white/15 opacity-70 transition group-hover:bg-od-accent group-hover:opacity-100" />
          </button>
        ) : null}
      </aside>

      <MobileAppNav
        tabs={mobileTabs}
        timHref={overview[1].href}
        groups={mobileGroups}
        quickActions={quickActions}
        ariaLabel="Navegação de vendas no celular"
      />
    </>
  );
}
