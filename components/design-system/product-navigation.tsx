"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Columns3,
  ContactRound,
  FileStack,
  Gauge,
  House,
  LogOut,
  Map,
  MessageCircle,
  SearchCheck,
  Settings,
  Users,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { PendingButton } from "@/components/PendingButton";
import { LogoMark, LogoWordmark } from "@/components/design-system/logo";
import { MobileAppNav } from "@/components/design-system/mobile-app-nav";
import { ProductNavGroups, type NavGroup, type NavItem } from "@/components/design-system/product-nav-groups";
import { WorkspaceSwitcher } from "@/app/(dashboard)/painel/WorkspaceSwitcher";


type Props = {
  workspaceKey: string;
  workspaceOptions: Array<{ value: string; label: string }>;
  workspaceLabel: string;
  displayName: string;
  isAdmin: boolean;
  lawOfficeAccess: { enabled: boolean; canViewLegal: boolean; canViewFinance: boolean };
  realEstateAccess: { enabled: boolean; canManage: boolean };
  labels: { contacts: string; pipeline: string; followups: string };
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "OT";
}

export function ProductNavigation(props: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCollapsed(window.localStorage.getItem("otimizia-sidebar-collapsed") === "1");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("otimizia-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  const core: NavItem[] = [
    { href: "/painel", label: "Visão geral", icon: Gauge, exact: true },
    { href: "/painel/contatos", label: props.labels.contacts, icon: ContactRound },
    { href: "/painel/funil", label: props.labels.pipeline, icon: Columns3 },
    { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/painel/tarefas", label: props.labels.followups, icon: ClipboardCheck },
    { href: "/painel/assistente", label: "Tim", icon: Bot },
    { href: "/painel/equipe", label: "Equipe", icon: Users },
  ];

  const groups: NavGroup[] = [{ label: "Trabalho", items: core }];
  if (props.lawOfficeAccess.enabled && props.lawOfficeAccess.canViewLegal) {
    groups.push({
      label: "Jurídico",
      items: [
        { href: "/painel/juridico", label: "Painel jurídico", icon: BriefcaseBusiness, exact: true },
        { href: "/painel/juridico/processos", label: "Processos", icon: FileStack },
        { href: "/painel/juridico/prazos", label: "Prazos", icon: CalendarDays },
        { href: "/painel/juridico/consulta", label: "Consulta DataJud", icon: SearchCheck },
        { href: "/painel/juridico/documentos", label: "Documentos", icon: FileStack },
      ],
    });
  }
  if (props.realEstateAccess.enabled) {
    groups.push({
      label: "Imobiliário",
      items: [
        { href: "/painel/imoveis", label: "Imóveis", icon: Building2 },
        { href: "/painel/imoveis/mapa", label: "Mapa", icon: Map },
        { href: "/painel/imoveis/visitas", label: "Visitas", icon: House },
        { href: "/painel/imoveis/colecoes", label: "Vitrines", icon: ChartNoAxesCombined },
      ],
    });
  }
  if (props.lawOfficeAccess.canViewFinance) {
    groups.push({ label: "Gestão", items: [{ href: "/painel/financeiro", label: "Financeiro", icon: CircleDollarSign }] });
  }
  if (props.isAdmin) {
    groups.push({ label: "Administração", items: [{ href: "/painel/metricas", label: "Métricas", icon: ChartNoAxesCombined }] });
  }

  const mobileTabs: [NavItem, NavItem, NavItem] = [core[0], core[3], core[2]];
  const timHref = "/painel/assistente";
  const barHrefs = new Set([core[0].href, core[3].href, core[2].href, timHref]);
  const mobileGroups = [
    ...groups,
    { label: "Conta", items: [{ href: "/painel/configuracoes", label: "Configurações", icon: Settings }] },
  ]
    .map((group) => ({ label: group.label, items: group.items.filter((item) => !barHrefs.has(item.href)) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <aside
        className={`sticky top-0 z-50 hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-[#120f1c] transition-[width] duration-200 ease-out md:flex ${collapsed ? "w-16" : "w-[248px]"}`}
        aria-label="Navegação principal"
      >
        <div className={`flex h-16 items-center border-b border-white/[0.06] ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <Link href="/painel" aria-label="Ir para o painel" className="nav-item rounded-md focus-visible:ring-2 focus-visible:ring-od-accent">
            {collapsed ? <LogoMark size={30} /> : <LogoWordmark height={30} />}
          </Link>
          {!collapsed ? (
            <button type="button" onClick={toggleCollapsed} aria-label="Recolher menu" className="grid size-9 place-items-center rounded-md text-od-text-3 hover:bg-white/[0.06] hover:text-white">
              <ChevronLeft size={16} />
            </button>
          ) : null}
        </div>

        {!collapsed && props.workspaceOptions.length > 1 ? (
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-od-text-3">Área ativa</p>
            <WorkspaceSwitcher options={props.workspaceOptions} value={props.workspaceKey} />
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto px-2">
          <ProductNavGroups
            namespace="crm"
            groups={groups}
            collapsed={collapsed}
            pathname={pathname}
            defaultPinned={["/painel/whatsapp"]}
          />
        </nav>

        <div className="border-t border-white/[0.06] p-2">
          <Link href="/painel/configuracoes" title={collapsed ? "Configurações" : undefined} className={`nav-item flex min-h-8 items-center rounded-xl text-[12px] text-od-text-3 hover:bg-white/[0.05] hover:text-white/80 ${collapsed ? "justify-center" : "gap-3 px-3"}`}>
            <Settings size={17} />{!collapsed ? <span>Configurações</span> : null}
          </Link>
          <div className={`mt-1 flex items-center py-2 ${collapsed ? "justify-center" : "gap-3 px-3"}`}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.08] text-xs font-semibold text-white/75">{initials(props.displayName)}</span>
            {!collapsed ? <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white/75">{props.displayName}</p><p className="truncate text-xs text-od-text-3">{props.workspaceLabel}</p></div> : null}
          </div>
          <form action={logout}>
            <PendingButton iconOnly={collapsed} pendingLabel="Saindo" className={`nav-item flex min-h-10 w-full items-center rounded-md text-[12px] text-od-text-3 hover:bg-white/[0.05] hover:text-white/72 ${collapsed ? "justify-center" : "gap-3 px-3"}`}>
              <LogOut size={16} />{!collapsed ? <span>Sair</span> : <span className="sr-only">Sair</span>}
            </PendingButton>
          </form>
          {collapsed ? (
            <button type="button" onClick={toggleCollapsed} aria-label="Expandir menu" className="mt-1 grid min-h-10 w-full place-items-center rounded-md text-od-text-3 hover:bg-white/[0.05] hover:text-white">
              <ChevronRight size={16} />
            </button>
          ) : null}
        </div>
      </aside>

      <MobileAppNav
        tabs={mobileTabs}
        timHref={timHref}
        groups={mobileGroups}
        ariaLabel="Navegação principal no celular"
      />
    </>
  );
}
