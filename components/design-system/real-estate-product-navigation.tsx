"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { PendingButton } from "@/components/PendingButton";
import { LogoMark, LogoWordmark } from "@/components/design-system/logo";
import { MobileAppNav } from "@/components/design-system/mobile-app-nav";
import { ProductNavGroups, type NavGroup, type NavItem } from "@/components/design-system/product-nav-groups";
import { WorkspaceSwitcher } from "@/app/(dashboard)/painel/WorkspaceSwitcher";

type RealEstateCounts = { properties: number; visits: number; collections: number; deals: number };
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

export function RealEstateProductNavigation({ workspaceKey, workspaceOptions, displayName, organizationName, counts }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(255);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem("otimizia-real-estate-sidebar-collapsed") === "1");
      const savedWidth = Number(window.localStorage.getItem("otimizia-real-estate-sidebar-width"));
      if (Number.isFinite(savedWidth) && savedWidth >= 220 && savedWidth <= 360) setSidebarWidth(savedWidth);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);


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

  // Nomeado em vez de posicional: mobileTabs e barHrefs referenciavam este item
  // por indice (commercial[2]), entao move-lo de grupo trocaria silenciosamente
  // a aba do celular por outra.
  const whatsapp: NavItem = { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle };
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
    whatsapp,
    { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
  ];
  const management: NavItem[] = [
    { href: "/painel/imoveis/comissoes", label: "Comissões e metas", icon: HandCoins },
    { href: "/painel/equipe", label: "Equipe", icon: Users },
    { href: "/painel/funil/relatorio", label: "Relatórios", icon: BarChart3 },
  ];
  const groups: NavGroup[] = [
    { label: "", items: overview },
    { label: "Imobiliário", items: portfolio },
    { label: "Comercial", items: commercial },
    { label: "Gestão", items: management },
  ];


  // Rótulos curtos só na barra do celular (a sidebar mantém os completos):
  // "Carteira de imóveis" não cabe numa aba e quebrava o layout em telas menores.
  const mobileTabs: [NavItem, NavItem, NavItem] = [
    { ...overview[0], label: "Início" },
    { ...portfolio[0], label: "Imóveis" },
    whatsapp,
  ];
  const barHrefs = new Set([overview[0].href, portfolio[0].href, whatsapp.href, overview[1].href]);
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
          {!collapsed ? <button type="button" onClick={toggle} aria-label="Recolher menu" className="grid size-7 place-items-center rounded text-od-text-3 hover:bg-white/[0.06] hover:text-white"><ChevronLeft size={15} /></button> : null}
        </div>
        {!collapsed ? <div className="mx-1 mt-4 border-t border-white/[0.06] pt-3"><p className="truncate text-xs font-semibold text-white/85">{organizationName}</p><p className="mt-0.5 text-xs text-white/52">Corretor de imóveis</p>{workspaceOptions.length > 1 ? <div className="mt-3"><WorkspaceSwitcher options={workspaceOptions} value={workspaceKey} /></div> : null}</div> : null}
      </header>

      <nav className="flex-1 overflow-y-auto px-2">
        <ProductNavGroups
          namespace="real-estate"
          groups={groups}
          collapsed={collapsed}
          pathname={pathname}
          defaultPinned={[whatsapp.href]}
          submenu={{
            parentHref: "/painel/imoveis/dashboard",
            items: [
              { href: "/painel/imoveis/dashboard", label: "Minha operação" },
              { href: "/painel/imoveis/comissoes", label: "Metas e comissões" },
            ],
          }}
        />
      </nav>

      <footer className="border-t border-white/[0.06] p-2">
        <Link href="/painel/configuracoes" prefetch={true} className={`flex min-h-8 items-center rounded-xl text-[13px] text-white/58 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2.5"}`}><Settings size={16} />{!collapsed ? <span>Configurações</span> : null}</Link>
        {!collapsed ? <div className="mt-1 flex items-center gap-3 px-2 py-2"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs font-semibold text-white/75">{initials(displayName)}</span><p className="min-w-0 truncate text-xs font-medium text-white/65">{displayName}</p></div> : null}
        <form action={logout}><PendingButton iconOnly={collapsed} pendingLabel="Saindo" className={`flex min-h-8 w-full items-center rounded-xl text-[13px] text-od-text-3 hover:bg-white/[0.05] hover:text-white ${collapsed ? "justify-center" : "gap-2 px-2.5"}`}><LogOut size={16} />{!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}</PendingButton></form>
        {collapsed ? <button type="button" onClick={toggle} aria-label="Expandir menu" className="mt-1 grid min-h-9 w-full place-items-center rounded-md text-od-text-3 hover:bg-white/[0.05] hover:text-white"><ChevronRight size={16} /></button> : null}
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
