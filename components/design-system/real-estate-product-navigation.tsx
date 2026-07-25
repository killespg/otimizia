"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  ContactRound,
  HandCoins,
  HousePlus,
  Images,
  KanbanSquare,
  LogOut,
  MapPinned,
  MessageCircle,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { PendingButton } from "@/components/PendingButton";
import { LogoMark, LogoWordmark } from "@/components/design-system/logo";
import { MobileAppNav } from "@/components/design-system/mobile-app-nav";
import { WorkspaceSwitcher } from "@/app/(dashboard)/painel/WorkspaceSwitcher";

type RealEstateCounts = { properties: number; visits: number; collections: number; deals: number };
type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number; danger?: boolean };
type Props = {
  workspaceKey: string;
  workspaceOptions: Array<{ value: string; label: string }>;
  displayName: string;
  organizationName: string;
  counts: RealEstateCounts;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "OT";
}

function isCurrent(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function RealEstateProductNavigation({ workspaceKey, workspaceOptions, displayName, organizationName, counts }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(255);
  // Grupos e o submenu da visão geral guardam o estado aberto/fechado. Fechado
  // é a exceção, então só o que o usuário fecha entra no armazenamento.
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const [overviewOpen, setOverviewOpen] = useState(true);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem("otimizia-real-estate-sidebar-collapsed") === "1");
      const savedWidth = Number(window.localStorage.getItem("otimizia-real-estate-sidebar-width"));
      if (Number.isFinite(savedWidth) && savedWidth >= 220 && savedWidth <= 360) setSidebarWidth(savedWidth);
      const savedClosed = window.localStorage.getItem("otimizia-real-estate-nav-closed");
      if (savedClosed) {
        try {
          const parsed: unknown = JSON.parse(savedClosed);
          if (Array.isArray(parsed)) setClosedGroups(parsed.filter((value): value is string => typeof value === "string"));
        } catch {
          // valor corrompido no storage nao pode derrubar a navegacao
        }
      }
      setOverviewOpen(window.localStorage.getItem("otimizia-real-estate-nav-overview") !== "0");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // O efeito fica fora do updater: em StrictMode o React invoca o updater duas
  // vezes, e escrita no storage dentro dele dispara em duplicado.
  function toggleGroup(label: string) {
    const next = closedGroups.includes(label)
      ? closedGroups.filter((item) => item !== label)
      : [...closedGroups, label];
    setClosedGroups(next);
    window.localStorage.setItem("otimizia-real-estate-nav-closed", JSON.stringify(next));
  }

  function toggleOverview() {
    const next = !overviewOpen;
    setOverviewOpen(next);
    window.localStorage.setItem("otimizia-real-estate-nav-overview", next ? "1" : "0");
  }

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("otimizia-real-estate-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    setCollapsed(false);
    window.localStorage.setItem("otimizia-real-estate-sidebar-collapsed", "0");
    const move = (pointerEvent: PointerEvent) => setSidebarWidth(Math.min(360, Math.max(220, startWidth + pointerEvent.clientX - startX)));
    const finish = (pointerEvent: PointerEvent) => {
      const next = Math.min(360, Math.max(220, startWidth + pointerEvent.clientX - startX));
      setSidebarWidth(next);
      window.localStorage.setItem("otimizia-real-estate-sidebar-width", String(next));
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
    { href: "/painel/imoveis/dashboard", label: "Visão geral", icon: CircleGauge, exact: true },
    { href: "/painel/assistente", label: "Tim", icon: Bot },
  ];
  const portfolio: NavItem[] = [
    { href: "/painel/imoveis", label: "Carteira de imóveis", icon: Building2, badge: counts.properties, exact: true },
    { href: "/painel/imoveis/mapa", label: "Mapa", icon: MapPinned },
    { href: "/painel/imoveis/visitas", label: "Agenda de visitas", icon: CalendarDays, badge: counts.visits, danger: counts.visits > 0 },
    { href: "/painel/imoveis/colecoes", label: "Vitrines", icon: Images, badge: counts.collections },
  ];
  const commercial: NavItem[] = [
    { href: "/painel/contatos", label: "Clientes", icon: ContactRound },
    { href: "/painel/funil", label: "Atendimentos", icon: KanbanSquare, badge: counts.deals },
    { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
  ];
  const management: NavItem[] = [
    { href: "/painel/imoveis/comissoes", label: "Comissões e metas", icon: HandCoins },
    { href: "/painel/equipe", label: "Equipe", icon: Users },
    { href: "/painel/funil/relatorio", label: "Relatórios", icon: BarChart3 },
  ];
  const groups = [
    { label: "", items: overview },
    { label: "Imobiliário", items: portfolio },
    { label: "Comercial", items: commercial },
    { label: "Gestão", items: management },
  ];

  function Item({ item }: { item: NavItem }) {
    const active = isCurrent(pathname, item);
    const Icon = item.icon;
    return <Link href={item.href} prefetch={true} title={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={`group flex min-h-8 items-center rounded-xl text-[13px] transition-colors ${collapsed ? "mx-auto size-9 justify-center" : "gap-2 px-2.5"} ${active ? "bg-white/[0.075] font-semibold text-white" : "text-white/58 hover:bg-white/[0.045] hover:text-white"}`}>
      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-od-text-2" : "text-white/55 group-hover:text-white/75"} />
      {!collapsed ? <><span className="min-w-0 flex-1 truncate">{item.label}</span>{typeof item.badge === "number" && item.badge > 0 ? <span className={`text-[11px] font-semibold tabular-nums ${item.danger ? "text-[#fb7767]" : "text-white/65"}`}>{item.badge}</span> : null}</> : null}
    </Link>;
  }

  // O chevron da "Visão geral" era decorativo: cravado no rótulo, sem onClick e
  // sem estado, enquanto os sub-itens apareciam ou sumiam conforme a rota. Um
  // controle que parece clicável precisa responder ao clique, e a estrutura do
  // menu não pode mudar sozinha quando o usuário navega.
  function OverviewDisclosure() {
    return <button
      type="button"
      onClick={toggleOverview}
      aria-expanded={overviewOpen}
      aria-controls="nav-visao-geral"
      title={overviewOpen ? "Recolher visão geral" : "Expandir visão geral"}
      className="grid size-6 shrink-0 place-items-center text-white/38 transition-colors hover:text-white"
    >
      <ChevronRight size={13} className={`transition-transform duration-150 ${overviewOpen ? "rotate-90" : ""}`} />
    </button>;
  }

  // Rótulos curtos só na barra do celular (a sidebar mantém os completos):
  // "Carteira de imóveis" não cabe numa aba e quebrava o layout em telas menores.
  const mobileTabs: [NavItem, NavItem, NavItem] = [
    { ...overview[0], label: "Início" },
    { ...portfolio[0], label: "Imóveis" },
    commercial[2],
  ];
  const barHrefs = new Set([overview[0].href, portfolio[0].href, commercial[2].href, overview[1].href]);
  const mobileGroups = [
    { label: "Imobiliário", items: portfolio },
    { label: "Comercial", items: commercial },
    { label: "Gestão", items: [...management, { href: "/painel/configuracoes", label: "Configurações", icon: Settings }] },
  ]
    .map((group) => ({ label: group.label, items: group.items.filter((item) => !barHrefs.has(item.href)) }))
    .filter((group) => group.items.length > 0);
  const quickActions: NavItem[] = [
    { href: "/painel/imoveis/novo", label: "Novo imóvel", icon: HousePlus },
  ];

  return <>
    <aside className={`relative sticky top-0 z-50 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[#0f0d11] md:flex ${collapsed ? "w-16" : ""}`} style={collapsed ? undefined : { width: sidebarWidth }} aria-label="Navegação imobiliária">
      <header className="border-b border-white/[0.06] p-3 pb-4">
        <div className={`flex h-7 items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/painel/imoveis/dashboard" prefetch={true} aria-label="Visão geral">{collapsed ? <LogoMark size={30} /> : <LogoWordmark height={30} />}</Link>
          {!collapsed ? <button type="button" onClick={toggle} aria-label="Recolher menu" className="grid size-7 place-items-center rounded text-white/38 hover:bg-white/[0.06] hover:text-white"><ChevronLeft size={15} /></button> : null}
        </div>
        {!collapsed ? <div className="mx-1 mt-4 border-t border-white/[0.06] pt-3"><p className="truncate text-xs font-semibold text-white/85">{organizationName}</p><p className="mt-0.5 text-xs text-white/52">Corretor de imóveis</p>{workspaceOptions.length > 1 ? <div className="mt-3"><WorkspaceSwitcher options={workspaceOptions} value={workspaceKey} /></div> : null}</div> : null}
      </header>

      <nav className="flex-1 overflow-y-auto px-2">
        {groups.map((group) => {
          const closed = closedGroups.includes(group.label);
          // Recolhido em ícones não há rótulo de grupo pra clicar, então lá o
          // grupo é sempre mostrado — senão itens sumiriam sem controle visível.
          const hidden = closed && !collapsed && group.label !== "";
          return <section key={group.label || "overview"} className="mb-0 p-2">
            {!collapsed && group.label ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={!closed}
                aria-controls={`nav-grupo-${group.label}`}
                className="flex h-7 w-full items-center gap-1.5 px-2 text-[10px] font-medium text-white/38 transition-colors hover:text-white/60"
              >
                <ChevronRight size={11} className={`shrink-0 transition-transform duration-150 ${closed ? "" : "rotate-90"}`} />
                <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
                {/* Recolher o grupo da pagina atual escondia o item ativo e o
                    usuario perdia a referencia de onde esta. O ponto devolve
                    esse sinal sem precisar reabrir. */}
                {closed && group.items.some((item) => isCurrent(pathname, item)) ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-od-accent" aria-label="Contém a página atual" />
                ) : null}
                {closed ? <span className="text-[11px] tabular-nums text-white/38">{group.items.length}</span> : null}
              </button>
            ) : null}
            {!hidden ? (
              <div id={group.label ? `nav-grupo-${group.label}` : undefined}>
                {group.items.map((item, index) => <Fragment key={item.href + item.label}>
                  {group.label === "" && index === 0 && !collapsed ? (
                    // Uma caixa só: o realce vive no contêiner, e link e seta
                    // ficam dentro dele. Botão fora do item criava um segundo
                    // retângulo de hover só pra seta.
                    <div className={`group flex min-h-8 items-center rounded-xl pr-1 transition-colors ${isCurrent(pathname, item) ? "bg-white/[0.075]" : "hover:bg-white/[0.045]"}`}>
                      <Link href={item.href} prefetch={true} aria-current={isCurrent(pathname, item) ? "page" : undefined} className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 text-[13px] ${isCurrent(pathname, item) ? "font-semibold text-white" : "text-white/58 group-hover:text-white"}`}>
                        <item.icon size={16} strokeWidth={isCurrent(pathname, item) ? 2.2 : 1.8} className={isCurrent(pathname, item) ? "text-od-text-2" : "text-white/55"} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                      <OverviewDisclosure />
                    </div>
                  ) : <Item item={item} />}
                  {group.label === "" && index === 0 && !collapsed && overviewOpen ? (
                    <div id="nav-visao-geral" className="mx-3.5 flex translate-x-px flex-col gap-1 border-l border-white/[0.08] px-2.5 py-0.5">
                      <Link href="/painel/imoveis/dashboard" className={`flex h-7 -translate-x-px items-center rounded-xl px-2 text-[12px] ${pathname === "/painel/imoveis/dashboard" ? "bg-white/[0.055] font-medium text-white" : "text-white/42 hover:text-white"}`}>Minha operação</Link>
                      <Link href="/painel/imoveis/comissoes" className={`flex h-7 -translate-x-px items-center rounded-xl px-2 text-[12px] ${pathname === "/painel/imoveis/comissoes" ? "bg-white/[0.055] font-medium text-white" : "text-white/42 hover:text-white"}`}>Metas e comissões</Link>
                    </div>
                  ) : null}
                </Fragment>)}
              </div>
            ) : null}
          </section>;
        })}
      </nav>

      <footer className="border-t border-white/[0.06] p-2">
        <Link href="/painel/configuracoes" prefetch={true} className={`flex min-h-8 items-center rounded-xl text-[13px] text-white/58 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2.5"}`}><Settings size={16} />{!collapsed ? <span>Configurações</span> : null}</Link>
        {!collapsed ? <div className="mt-1 flex items-center gap-3 px-2 py-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs font-semibold text-white/75">{initials(displayName)}</span><p className="min-w-0 truncate text-xs font-medium text-white/65">{displayName}</p></div> : null}
        <form action={logout}><PendingButton iconOnly={collapsed} pendingLabel="Saindo" className={`flex min-h-8 w-full items-center rounded-xl text-[13px] text-white/48 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2.5"}`}><LogOut size={16} />{!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}</PendingButton></form>
        {collapsed ? <button type="button" onClick={toggle} aria-label="Expandir menu" className="mt-1 grid min-h-9 w-full place-items-center rounded-md text-white/45 hover:bg-white/[0.05] hover:text-white"><ChevronRight size={16} /></button> : null}
      </footer>
      {!collapsed ? <button type="button" aria-label="Redimensionar menu lateral" title="Arraste para redimensionar" onPointerDown={startResize} onDoubleClick={() => { setSidebarWidth(255); window.localStorage.setItem("otimizia-real-estate-sidebar-width", "255"); }} className="group absolute inset-y-0 -right-1 z-[var(--z-modal-backdrop)] flex w-2 cursor-col-resize items-center justify-center touch-none"><span className="h-12 w-1 rounded-full bg-white/15 opacity-70 transition group-hover:bg-od-accent group-hover:opacity-100" /></button> : null}
    </aside>

    <MobileAppNav
      tabs={mobileTabs}
      timHref={overview[1].href}
      groups={mobileGroups}
      quickActions={quickActions}
      ariaLabel="Navegação imobiliária no celular"
    />
  </>;
}
