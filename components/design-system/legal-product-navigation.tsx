"use client";

import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarDays,
  CircleGauge,
  FileSearch,
  Files,
  Landmark,
  KanbanSquare,
  ListTodo,
  MessageCircle,
  ReceiptText,
  Scale,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { TwoLevelNav, type NavItem } from "@/components/design-system/product-nav-groups";
import { TimIcon } from "@/components/design-system/tim-icon";

type Props = {
  displayName: string;
  organizationName: string;
  canViewFinance: boolean;
  counts: { cases: number; deadlines: number; documents: number; receivables: number };
};

export function LegalProductNavigation({ displayName, organizationName, canViewFinance, counts }: Props) {
  const overview: NavItem[] = [
    { href: "/painel/juridico", label: "Visão geral", icon: CircleGauge, exact: true },
    { href: "/painel/assistente", label: "Tim", icon: TimIcon },
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
    <TwoLevelNav
      namespace="legal"
      groups={groups}
      logoHref="/painel/juridico"
      subtitle="Escritório de advocacia"
      organizationName={organizationName}
      displayName={displayName}
      onLogout={logout}
      railAriaLabel="Navegação do escritório"
      detailAriaLabel="Detalhes da navegação do escritório"
      mobileTabs={mobileTabs}
      mobileTimHref={overview[1].href}
      mobileGroups={mobileGroups}
      mobileAriaLabel="Navegação jurídica no celular"
    />
  );
}
