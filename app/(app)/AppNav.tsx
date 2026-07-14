"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell,
  IconBot,
  IconBuilding,
  IconCalendar,
  IconChartBar,
  IconColumns,
  IconGauge,
  IconImage,
  IconMessage,
  IconPhone,
  IconPlus,
  IconUsers,
  IconWallet,
  type IconProps,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: (p: IconProps) => JSX.Element;
  passive?: boolean;
  mobile?: boolean;
};

type NavLabels = {
  contacts: string;
  pipeline: string;
  value: string;
  followups: string;
  dealSingular: string;
};

type LawOfficeAccess = {
  enabled: boolean;
  canViewLegal: boolean;
  canViewFinance: boolean;
};

type RealEstateAccess = {
  enabled: boolean;
  canManage: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: IconGauge, mobile: true },
  { href: "/contacts", label: "Contatos", icon: IconUsers, mobile: true },
  { href: "/pipeline", label: "Vendas", icon: IconColumns, mobile: true },
  { href: "/whatsapp", label: "WhatsApp", icon: IconMessage },
  { href: "/tasks", label: "Tarefas", icon: IconBell, mobile: true },
  { href: "/calendar", label: "Calendário", icon: IconCalendar },
  { href: "/dashboard#valor", label: "Valor aberto", icon: IconWallet, passive: true },
  { href: "/tasks", label: "Clientes para chamar", icon: IconPhone, passive: true },
  { href: "/assistant", label: "Sócio-Assistente", icon: IconBot },
  { href: "/team", label: "Equipe", icon: IconUsers },
];

const LAW_NAV: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: IconGauge, mobile: true },
  { href: "/contacts", label: "Clientes", icon: IconUsers, mobile: true },
  { href: "/pipeline", label: "Atendimentos", icon: IconPhone, mobile: true },
  { href: "/law", label: "Casos", icon: IconColumns, mobile: true },
  { href: "/law/deadlines", label: "Prazos", icon: IconBell },
  { href: "/calendar", label: "Calendário", icon: IconCalendar },
  { href: "/whatsapp", label: "WhatsApp", icon: IconMessage },
  { href: "/tasks", label: "Tarefas", icon: IconBell },
  { href: "/assistant", label: "Assistente IA", icon: IconBot },
  { href: "/team", label: "Equipe", icon: IconUsers },
];

const REAL_ESTATE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: IconGauge, mobile: true },
  { href: "/contacts", label: "Clientes", icon: IconUsers, mobile: true },
  { href: "/pipeline", label: "Atendimentos", icon: IconPhone, mobile: true },
  { href: "/imoveis", label: "Imóveis", icon: IconBuilding, mobile: true },
  { href: "/imoveis/colecoes", label: "Vitrines", icon: IconImage },
  { href: "/calendar", label: "Calendário", icon: IconCalendar },
  { href: "/whatsapp", label: "WhatsApp", icon: IconMessage },
  { href: "/tasks", label: "Tarefas", icon: IconBell },
  { href: "/assistant", label: "Assistente IA", icon: IconBot },
  { href: "/team", label: "Equipe", icon: IconUsers },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(href + "/");
}

// A substituição dinâmica (labels.pipeline/labels.contacts) só faz sentido
// pro NAV genérico, cujos rótulos ("Vendas"/"Contatos") são placeholder pra
// cada profissão renomear. LAW_NAV e REAL_ESTATE_NAV já vêm com o rótulo
// final e correto por item — aplicar a substituição neles de qualquer jeito
// sobrescrevia "/pipeline" (Atendimentos) com labels.pipeline, que pro preset
// imobiliário é "Imóveis" (mesmo texto da aba dedicada "/imoveis"), gerando
// duas abas "Imóveis" na navegação.
function displayLabelFor(href: string, label: string, labels: NavLabels, dynamic: boolean) {
  if (!dynamic) return label;
  if (href === "/pipeline") return labels.pipeline;
  if (href === "/contacts") return labels.contacts;
  if (label === "Valor aberto") return labels.value;
  if (label === "Clientes para chamar") return labels.followups;
  return label;
}

export function SidebarNav({
  labels,
  isAdmin = false,
  lawOfficeAccess,
  realEstateAccess,
}: {
  labels?: NavLabels;
  isAdmin?: boolean;
  lawOfficeAccess?: LawOfficeAccess;
  realEstateAccess?: RealEstateAccess;
}) {
  const isActive = useActive();
  const text = labels ?? {
    contacts: "Contatos",
    pipeline: "Vendas",
    value: "Valor aberto",
    followups: "Clientes para chamar",
    dealSingular: "venda",
  };
  let items = isAdmin
    ? [...NAV, { href: "/dev", label: "Métricas", icon: IconChartBar }]
    : NAV;
  let useDynamicLabels = true;
  if (lawOfficeAccess?.enabled) {
    items = LAW_NAV.filter((item) => {
      if ((item.href === "/law" || item.href === "/law/deadlines") && !lawOfficeAccess.canViewLegal) return false;
      return true;
    });
    if (lawOfficeAccess.canViewFinance) {
      items = [
        ...items.slice(0, 5),
        { href: "/finance", label: "Financeiro", icon: IconWallet },
        ...items.slice(5),
      ];
    }
    if (isAdmin) items = [...items, { href: "/dev", label: "Métricas", icon: IconChartBar }];
    useDynamicLabels = false;
  } else if (realEstateAccess?.enabled) {
    items = REAL_ESTATE_NAV.filter((item) => item.href !== "/imoveis/colecoes" || realEstateAccess.canManage);
    if (isAdmin) items = [...items, { href: "/dev", label: "Métricas", icon: IconChartBar }];
    useDynamicLabels = false;
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {items.map(({ href, label, icon: Icon, passive }) => {
        const active = !passive && isActive(href);
        const displayLabel = displayLabelFor(href, label, text, useDynamicLabels);
        return (
          <Link
            key={`${href}-${label}`}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "sidebar-nav-item nav-item group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 " +
              (active
                ? "bg-brand-50 text-brand-800 shadow-[inset_0_0_0_1px_rgba(123,63,242,0.06)] dark:bg-brand-700 dark:text-white"
                : "text-ink-soft hover:bg-surface-2 hover:text-ink")
            }
          >
            <Icon
              className={
                "h-[20px] w-[20px] shrink-0 transition-colors duration-150 " +
                (active ? "text-brand-700 dark:text-white" : "text-ink-muted group-hover:text-brand-700")
              }
            />
            <span className="relative z-[1]">{displayLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar({
  labels,
  lawOfficeAccess,
  realEstateAccess,
}: {
  labels?: Pick<NavLabels, "contacts" | "pipeline" | "dealSingular">;
  lawOfficeAccess?: LawOfficeAccess;
  realEstateAccess?: RealEstateAccess;
}) {
  const isActive = useActive();
  const [menuOpen, setMenuOpen] = useState(false);
  const contactsLabel = labels?.contacts ?? "Contatos";
  const pipelineLabel = labels?.pipeline ?? "Vendas";
  const dealSingular = labels?.dealSingular ?? "venda";
  const contactSingular = contactsLabel === "Sujeitos" ? "sujeito" : "contato";
  // Mesmo motivo do SidebarNav: LAW_NAV/REAL_ESTATE_NAV já trazem o rótulo
  // final por item, então a renomeação dinâmica de "/pipeline"/"/contacts"
  // só se aplica ao NAV genérico (senão duplica "Imóveis" no tab bar também).
  const useDynamicLabels = !lawOfficeAccess?.enabled && !realEstateAccess?.enabled;
  const mobileItems = lawOfficeAccess?.enabled
    ? LAW_NAV.filter((item) => item.mobile).filter((item) => item.href !== "/law" || lawOfficeAccess.canViewLegal)
    : realEstateAccess?.enabled
    ? REAL_ESTATE_NAV.filter((item) => item.mobile)
    : [
        ...NAV.filter((item) => item.mobile && item.href !== "/tasks"),
        { href: "/assistant", label: "IA", icon: IconBot, mobile: true },
      ];
  const leftItems = mobileItems.slice(0, 2);
  const rightItems = mobileItems.slice(2);
  const quickActions = [
    {
      href: "/whatsapp",
      label: "WhatsApp",
      description: "Ver conversas e responder clientes",
      icon: IconMessage,
    },
    {
      href: "/tasks#new-task",
      label: "Lembrete",
      description: "Chamar alguém depois",
      icon: IconBell,
    },
    {
      href: "/calendar",
      label: "Calendário",
      description: "Ver tarefas e prazos no mês",
      icon: IconCalendar,
    },
    {
      href: "/contacts#new-contact",
      label: capitalize(contactSingular),
      description: "Salvar uma pessoa",
      icon: IconUsers,
    },
    {
      href: "/pipeline#new-deal",
      label: lawOfficeAccess?.enabled ? "Atendimento" : capitalize(dealSingular),
      description: lawOfficeAccess?.enabled
        ? "Triagem, consulta ou proposta"
        : `Criar ${articleFor(dealSingular)} ${dealSingular}`,
      icon: lawOfficeAccess?.enabled ? IconPhone : IconColumns,
    },
    ...(lawOfficeAccess?.enabled && lawOfficeAccess.canViewLegal
      ? [{
          href: "/law#new-case",
          label: "Caso",
          description: "Abrir caso jurídico",
          icon: IconColumns,
        }, {
          href: "/law/deadlines",
          label: "Prazo",
          description: "Ver proximos prazos",
          icon: IconBell,
        }]
      : []),
    ...(lawOfficeAccess?.enabled && lawOfficeAccess.canViewFinance
      ? [{
          href: "/finance",
          label: "Financeiro",
          description: "Honorários e recebimentos",
          icon: IconWallet,
        }]
      : []),
    ...(lawOfficeAccess?.enabled
      ? [{
          href: "/assistant",
          label: "Assistente IA",
          description: "Tire dúvidas e gere rascunhos",
          icon: IconBot,
        }]
      : []),
    ...(realEstateAccess?.enabled && realEstateAccess.canManage
      ? [{
          href: "/imoveis/novo",
          label: "Imóvel",
          description: "Cadastrar um novo imóvel",
          icon: IconBuilding,
        }, {
          href: "/imoveis/colecoes/nova",
          label: "Vitrine",
          description: "Selecionar imóveis para compartilhar",
          icon: IconImage,
        }]
      : []),
    ...(realEstateAccess?.enabled
      ? [{
          href: "/assistant",
          label: "Assistente IA",
          description: "Tire dúvidas e ajude a cadastrar imóveis",
          icon: IconBot,
        }]
      : []),
    {
      href: "/team",
      label: "Equipe",
      description: "Gerenciar sua equipe",
      icon: IconUsers,
    },
  ];

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = isActive(href);
    const displayLabel = !useDynamicLabels
      ? label
      : href === "/pipeline"
      ? pipelineLabel
      : href === "/contacts"
      ? contactsLabel
      : label;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          "mobile-tab nav-item relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 " +
          (active ? "bg-brand-50 text-brand-700" : "text-ink-muted")
        }
      >
        {active && (
          <span className="mobile-tab-dot absolute top-1.5 h-1 w-1 rounded-full bg-brand-700" />
        )}
        <Icon className="h-[22px] w-[22px]" />
        <span
          className={
            "text-[11px] font-black leading-none tracking-[-0.01em] " +
            (active ? "font-semibold" : "font-medium")
          }
        >
          {displayLabel}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-18px_42px_-30px_rgba(7,8,28,0.9)] backdrop-blur-xl sm:hidden"
      aria-label="Navegação principal"
    >
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar menu rápido"
            className="mobile-create-backdrop fixed inset-0 bottom-[calc(4.9rem+env(safe-area-inset-bottom))] -z-10 cursor-default bg-ink/5"
            onClick={() => setMenuOpen(false)}
          />
          <div className="mobile-create-menu absolute bottom-[calc(5.15rem+env(safe-area-inset-bottom))] left-1/2 z-20 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_22px_54px_-26px_rgba(7,8,28,0.82)]">
            {quickActions.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="nav-item flex min-h-[58px] items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-ink">{label}</span>
                  <span className="block text-xs font-semibold text-ink-muted">{description}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
        {leftItems.map(renderItem)}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Mais opções"
          className="mobile-create nav-item relative mx-auto mb-1 grid h-[58px] w-[64px] place-items-center rounded-2xl bg-brand-700 text-white shadow-[0_18px_36px_-18px_rgba(92,34,232,0.92)] focus-visible:ring-2 focus-visible:ring-white"
        >
          <IconPlus className={"h-7 w-7 transition-transform duration-200 " + (menuOpen ? "rotate-45" : "")} />
        </button>
        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function articleFor(value: string) {
  return /a$|ção$|dade$|gem$/i.test(value) ? "uma" : "um";
}
