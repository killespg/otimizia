"use client";

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  Columns3,
  ContactRound,
  FileStack,
  Gauge,
  House,
  Map,
  MessageCircle,
  SearchCheck,
  Settings,
  Users,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { TwoLevelNav, type NavGroup, type NavItem } from "@/components/design-system/product-nav-groups";
import { TimIcon } from "@/components/design-system/tim-icon";

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

export function ProductNavigation(props: Props) {
  const overview: NavItem[] = [
    { href: "/painel", label: "Visão geral", icon: Gauge, exact: true },
    { href: "/painel/assistente", label: "Tim", icon: TimIcon },
  ];
  const core: NavItem[] = [
    { href: "/painel/contatos", label: props.labels.contacts, icon: ContactRound },
    { href: "/painel/funil", label: props.labels.pipeline, icon: Columns3 },
    { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/painel/calendario", label: "Calendário", icon: CalendarDays },
    { href: "/painel/tarefas", label: props.labels.followups, icon: ClipboardCheck },
    { href: "/painel/equipe", label: "Equipe", icon: Users },
  ];

  const groups: NavGroup[] = [{ label: "", items: overview }, { label: "Trabalho", items: core }];
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

  const mobileTabs: [NavItem, NavItem, NavItem] = [overview[0], overview[1], core[2]];
  const timHref = "/painel/assistente";
  const barHrefs = new Set([overview[0].href, overview[1].href, core[2].href]);
  const mobileGroups = [
    ...groups.slice(1),
    { label: "Conta", items: [{ href: "/painel/configuracoes", label: "Configurações", icon: Settings }] },
  ]
    .map((group) => ({ label: group.label, items: group.items.filter((item) => !barHrefs.has(item.href)) }))
    .filter((group) => group.items.length > 0);

  return (
    <TwoLevelNav
      namespace="crm"
      groups={groups}
      logoHref="/painel"
      subtitle=""
      organizationName={props.workspaceLabel}
      displayName={props.displayName}
      workspaceOptions={props.workspaceOptions}
      workspaceKey={props.workspaceKey}
      onLogout={logout}
      railAriaLabel="Navegação principal"
      detailAriaLabel="Detalhes da navegação principal"
      mobileTabs={mobileTabs}
      mobileTimHref={timHref}
      mobileGroups={mobileGroups}
      mobileAriaLabel="Navegação principal no celular"
    />
  );
}
