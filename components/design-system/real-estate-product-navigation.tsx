"use client";

import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleGauge,
  ContactRound,
  HandCoins,
  HousePlus,
  Images,
  KanbanSquare,
  MapPinned,
  MessageCircle,
  Settings,
  Users,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { TwoLevelNav, type NavGroup, type NavItem } from "@/components/design-system/product-nav-groups";
import { TimIcon } from "@/components/design-system/tim-icon";

type RealEstateCounts = { properties: number; visits: number; collections: number; deals: number };
type Props = {
  workspaceKey: string;
  workspaceOptions: Array<{ value: string; label: string }>;
  displayName: string;
  organizationName: string;
  counts: RealEstateCounts;
};

export function RealEstateProductNavigation({ workspaceKey, workspaceOptions, displayName, organizationName, counts }: Props) {
  // Nomeado em vez de posicional: mobileTabs e barHrefs referenciavam este item
  // por indice (commercial[2]), entao move-lo de grupo trocaria silenciosamente
  // a aba do celular por outra.
  const whatsapp: NavItem = { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageCircle };
  const overview: NavItem[] = [
    { href: "/painel/imoveis/dashboard", label: "Visão geral", icon: CircleGauge, exact: true },
    { href: "/painel/assistente", label: "Tim", icon: TimIcon },
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

  return (
    <TwoLevelNav
      namespace="real-estate"
      groups={groups}
      submenu={{
        parentHref: "/painel/imoveis/dashboard",
        items: [
          { href: "/painel/imoveis/dashboard", label: "Minha operação" },
          { href: "/painel/imoveis/comissoes", label: "Metas e comissões" },
        ],
      }}
      logoHref="/painel/imoveis/dashboard"
      subtitle="Corretor de imóveis"
      organizationName={organizationName}
      displayName={displayName}
      workspaceOptions={workspaceOptions}
      workspaceKey={workspaceKey}
      onLogout={logout}
      railAriaLabel="Navegação imobiliária"
      detailAriaLabel="Detalhes da navegação imobiliária"
      mobileTabs={mobileTabs}
      mobileTimHref={overview[1].href}
      mobileGroups={mobileGroups}
      mobileQuickActions={quickActions}
      mobileAriaLabel="Navegação imobiliária no celular"
    />
  );
}
