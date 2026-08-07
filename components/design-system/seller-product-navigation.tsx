"use client";

import {
  BellRing,
  CalendarDays,
  CircleGauge,
  ContactRound,
  KanbanSquare,
  Layers3,
  ClipboardList,
  MessageCircle,
  PackageSearch,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { TwoLevelNav, type NavItem } from "@/components/design-system/product-nav-groups";
import type { SellerModule } from "@/lib/supabase/types";
import { TimIcon } from "@/components/design-system/tim-icon";

type SellerCounts = { contacts: number; deals: number; reminders: number };

type Props = {
  workspaceKey: string;
  workspaceOptions: Array<{ value: string; label: string }>;
  displayName: string;
  avatarUrl: string | null;
  organizationName: string;
  counts: SellerCounts;
  enabledModules: SellerModule[];
};

export function SellerProductNavigation({ workspaceKey, workspaceOptions, displayName, avatarUrl, organizationName, counts, enabledModules }: Props) {
  const overview: NavItem[] = [
    { href: "/painel", label: "Visão geral", icon: CircleGauge, exact: true },
    { href: "/painel/assistente", label: "Tim", icon: TimIcon },
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

  const mobileTabs: [NavItem, NavItem, NavItem] = [overview[0], crm[2], crm[3]];
  const barHrefs = new Set([overview[0].href, crm[2].href, crm[3].href, overview[1].href]);
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
    <TwoLevelNav
      namespace="seller"
      groups={groups}
      submenu={{
        parentHref: "/painel",
        items: [
          { href: "/painel", label: "Minha operação" },
          { href: "/painel/funil/relatorio", label: "Relatórios" },
        ],
      }}
      logoHref="/painel"
      subtitle="Vendedor autônomo"
      organizationName={organizationName}
      displayName={displayName}
      avatarUrl={avatarUrl}
      workspaceOptions={workspaceOptions}
      workspaceKey={workspaceKey}
      onLogout={logout}
      railAriaLabel="Navegação de vendas"
      detailAriaLabel="Detalhes da navegação de vendas"
      mobileTabs={mobileTabs}
      mobileTimHref={overview[1].href}
      mobileGroups={mobileGroups}
      mobileQuickActions={quickActions}
      mobileAriaLabel="Navegação de vendas no celular"
    />
  );
}
