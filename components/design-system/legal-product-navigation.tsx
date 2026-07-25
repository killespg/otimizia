"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Bot,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  FileSearch,
  Files,
  Landmark,
  KanbanSquare,
  ListTodo,
  LogOut,
  MessageCircle,
  ReceiptText,
  Scale,
  Settings,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { PendingButton } from "@/components/PendingButton";
import { LogoMark, LogoWordmark } from "@/components/design-system/logo";
import { MobileAppNav } from "@/components/design-system/mobile-app-nav";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: number;
  danger?: boolean;
};

type Props = {
  displayName: string;
  organizationName: string;
  canViewFinance: boolean;
  counts: { cases: number; deadlines: number; documents: number; receivables: number };
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "OT";
}

function isCurrent(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function LegalProductNavigation({ displayName, organizationName, canViewFinance, counts }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(255);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("otimizia-legal-sidebar-collapsed") === "1");
    const savedWidth = Number(window.localStorage.getItem("otimizia-legal-sidebar-width"));
    if (Number.isFinite(savedWidth) && savedWidth >= 220 && savedWidth <= 360) setSidebarWidth(savedWidth);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("otimizia-legal-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    setCollapsed(false);
    window.localStorage.setItem("otimizia-legal-sidebar-collapsed", "0");

    const move = (pointerEvent: PointerEvent) => {
      const next = Math.min(360, Math.max(220, startWidth + pointerEvent.clientX - startX));
      setSidebarWidth(next);
    };
    const finish = (pointerEvent: PointerEvent) => {
      const next = Math.min(360, Math.max(220, startWidth + pointerEvent.clientX - startX));
      setSidebarWidth(next);
      window.localStorage.setItem("otimizia-legal-sidebar-width", String(next));
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
    { href: "/painel/juridico", label: "Visão geral", icon: CircleGauge, exact: true },
    { href: "/painel/assistente", label: "Tim", icon: Bot },
  ];
  const legal: NavItem[] = [
    { href: "/painel/juridico/processos", label: "Processos", icon: BriefcaseBusiness, badge: counts.cases },
    { href: "/painel/juridico/prazos", label: "Agenda e prazos", icon: CalendarDays, badge: counts.deadlines, danger: counts.deadlines > 0 },
    { href: "/painel/juridico/consulta", label: "Consulta DataJud", icon: FileSearch },
    { href: "/painel/juridico/documentos", label: "Documentos", icon: Files, badge: counts.documents },
  ];
  const finance: NavItem[] = canViewFinance ? [
    { href: "/painel/financeiro", label: "Honorários", icon: BadgeDollarSign },
    { href: "/painel/financeiro#recebiveis", label: "Recebíveis", icon: WalletCards, badge: counts.receivables },
    { href: "/painel/financeiro#despesas", label: "Despesas", icon: ReceiptText },
  ] : [];
  const office: NavItem[] = [
    { href: "/painel/contatos", label: "Clientes e atendimentos", icon: Users },
    { href: "/painel/funil", label: "Atendimentos", icon: KanbanSquare },
    { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/painel/calendario", label: "Calendário", icon: CalendarCheck2 },
    { href: "/painel/tarefas", label: "Retornos do dia", icon: ListTodo },
    { href: "/painel/equipe", label: "Equipe", icon: Scale },
    { href: "/painel/funil/relatorio", label: "Relatórios", icon: Landmark },
  ];
  const groups = [
    { label: "", items: overview },
    { label: "Jurídico", items: legal },
    ...(finance.length ? [{ label: "Financeiro", items: finance }] : []),
    { label: "Escritório", items: office },
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
        className={`group flex min-h-8 items-center rounded-xl text-[13px] transition-colors ${collapsed ? "mx-auto size-9 justify-center" : "gap-2 px-2.5"} ${active ? "bg-white/[0.075] font-semibold text-white" : "text-white/58 hover:bg-white/[0.045] hover:text-white"}`}
      >
        <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-od-text-2" : "text-white/55 group-hover:text-white/75"} />
        {!collapsed ? <><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.label === "Visão geral" ? <ChevronRight size={14} className="text-white/28"/> : null}{typeof item.badge === "number" && item.badge > 0 ? <span className={`text-[11px] font-semibold tabular-nums ${item.danger ? "text-[#fb7767]" : "text-white/65"}`}>{item.badge}</span> : null}</> : null}
      </Link>
    );
  }

  const mobileTabs: [NavItem, NavItem, NavItem] = [overview[0], legal[0], legal[1]];
  const barHrefs = new Set([overview[0].href, legal[0].href, legal[1].href, overview[1].href]);
  const mobileGroups = [
    { label: "Jurídico", items: legal },
    ...(finance.length ? [{ label: "Financeiro", items: finance }] : []),
    { label: "Escritório", items: [...office, { href: "/painel/configuracoes", label: "Configurações", icon: Settings }] },
  ]
    .map((group) => ({ label: group.label, items: group.items.filter((item) => !barHrefs.has(item.href.split("#")[0])) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <aside
        className={`relative sticky top-0 z-50 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[#0f0d11] md:flex ${collapsed ? "w-16" : ""}`}
        style={collapsed ? undefined : { width: sidebarWidth }}
        aria-label="Navegação do escritório"
      >
        <header className="border-b border-white/[0.06] p-3 pb-4">
          <div className={`flex h-7 items-center ${collapsed ? "justify-center" : "justify-between"}`}>
            <Link href="/painel/juridico" prefetch={true} aria-label="Visão geral">{collapsed ? <LogoMark size={30} /> : <LogoWordmark height={30} />}</Link>
            {!collapsed ? <button type="button" onClick={toggle} aria-label="Recolher menu" className="grid size-7 place-items-center rounded-xl text-white/38 hover:bg-white/[0.06] hover:text-white"><ChevronLeft size={15} /></button> : null}
          </div>
          {!collapsed ? <div className="mx-1 mt-4 border-t border-white/[0.06] pt-3"><p className="truncate text-xs font-semibold text-white/85">{organizationName}</p><p className="mt-0.5 text-xs text-white/52">Escritório de advocacia</p></div> : null}
        </header>

        <nav className="flex-1 overflow-y-auto px-2">
          {groups.map((group) => <section key={group.label || "overview"} className="mb-0 p-2">
            {!collapsed && group.label ? <p className="flex h-8 items-center px-2 text-xs font-medium text-white/46">{group.label}</p> : null}
            <div>{group.items.map((item, index) => <Fragment key={item.href + item.label}><Item item={item}/>{group.label === "" && index === 0 && !collapsed && (pathname === "/painel/juridico" || pathname === "/painel/juridico/movimentacoes") ? <div className="mx-3.5 flex translate-x-px flex-col gap-1 border-l border-white/[0.08] px-2.5 py-0.5"><Link href="/painel/juridico" prefetch={true} className={`flex h-7 -translate-x-px items-center rounded-xl px-2 text-sm font-medium ${pathname === "/painel/juridico" ? "bg-white/[0.055] text-white" : "text-white/42 hover:text-white"}`}>Minha carteira</Link><Link href="/painel/juridico/movimentacoes" prefetch={true} className={`flex h-7 -translate-x-px items-center rounded-xl px-2 text-sm ${pathname === "/painel/juridico/movimentacoes" ? "bg-white/[0.055] font-medium text-white" : "text-white/42 hover:text-white"}`}>Movimentações</Link></div> : null}</Fragment>)}</div>
          </section>)}
        </nav>

        <footer className="border-t border-white/[0.06] p-2">
          <Link href="/painel/configuracoes" prefetch={true} className={`flex min-h-8 items-center rounded-xl text-[13px] text-white/58 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2.5"}`}><Settings size={16}/>{!collapsed ? <span>Configurações</span> : null}</Link>
          {!collapsed ? <div className="mt-1 flex items-center gap-3 px-2 py-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs font-semibold text-white/75">{initials(displayName)}</span><p className="min-w-0 truncate text-xs font-medium text-white/65">{displayName}</p></div> : null}
          <form action={logout}><PendingButton iconOnly={collapsed} pendingLabel="Saindo" className={`flex min-h-8 w-full items-center rounded-xl text-[13px] text-white/48 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2.5"}`}><LogOut size={16}/>{!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}</PendingButton></form>
          {collapsed ? <button type="button" onClick={toggle} aria-label="Expandir menu" className="mt-1 grid min-h-9 w-full place-items-center rounded-md text-white/45 hover:bg-white/[0.05] hover:text-white"><ChevronRight size={16}/></button> : null}
        </footer>
        {!collapsed ? (
          <button
            type="button"
            aria-label="Redimensionar menu lateral"
            title="Arraste para redimensionar"
            onPointerDown={startResize}
            onDoubleClick={() => {
              setSidebarWidth(255);
              window.localStorage.setItem("otimizia-legal-sidebar-width", "255");
            }}
            className="group absolute inset-y-0 -right-1 z-[70] flex w-2 cursor-col-resize items-center justify-center touch-none"
          >
            <span className="h-12 w-1 rounded-full bg-white/15 opacity-70 transition group-hover:bg-od-accent group-hover:opacity-100" />
          </button>
        ) : null}
      </aside>

      <MobileAppNav
        tabs={mobileTabs}
        timHref={overview[1].href}
        groups={mobileGroups}
        ariaLabel="Navegação jurídica no celular"
      />
    </>
  );
}
