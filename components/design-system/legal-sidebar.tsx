"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Bot, BriefcaseBusiness, Calculator, CalendarClock, ChevronDown, ChevronRight, CircleDollarSign, DatabaseSearch, FileStack, KanbanSquare, LayoutDashboard, ListTodo, MessageCircle, Scale, Settings, Users, type LucideIcon } from "lucide-react";
import { LogoWordmark } from "@/components/design-system/logo";

const overview = [
  { label: "Visão geral", href: "/painel/juridico" },
  { label: "Minha carteira", href: "/painel/juridico/processos?responsavel=eu" },
  { label: "Movimentações", href: "/painel/juridico/processos?visao=movimentacoes" },
];

const legalModules = [
  { icon: BriefcaseBusiness, label: "Processos", href: "/painel/juridico/processos", count: "48", expandable: true },
  { icon: DatabaseSearch, label: "Consulta DataJud", href: "/painel/juridico/consulta" },
  { icon: Users, label: "Clientes", href: "/painel/contatos" },
  { icon: CalendarClock, label: "Agenda e prazos", href: "/painel/juridico/prazos", count: "7", expandable: true },
  { icon: Calculator, label: "Calcular prazo", href: "/painel/juridico/prazos/calculadora" },
  { icon: FileStack, label: "Documentos", href: "/painel/juridico/documentos", expandable: true },
];

type NavModule = {
  icon: LucideIcon;
  label: string;
  href: string;
  count?: string;
  expandable?: boolean;
};

const platformModules: NavModule[] = [
  { icon: KanbanSquare, label: "Atendimentos", href: "/painel/funil?workspace=law_office" },
  { icon: MessageCircle, label: "WhatsApp", href: "/painel/whatsapp?workspace=law_office" },
  { icon: CalendarClock, label: "Calendário", href: "/painel/calendario?workspace=law_office" },
  { icon: ListTodo, label: "Tarefas", href: "/painel/tarefas?workspace=law_office" },
];

const officeModules = [
  { icon: CircleDollarSign, label: "Financeiro", href: "/painel/financeiro", expandable: true },
  { icon: Users, label: "Equipe", href: "/painel/equipe" },
  { icon: Bot, label: "Sócio-assistente", href: "/painel/assistente", expandable: true },
];

function isActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  return pathname === base || (base !== "/painel/juridico" && pathname.startsWith(`${base}/`));
}
function ModuleLink({ item, pathname }: { item: NavModule; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return <Link href={item.href} className={`group flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-left text-[12px] transition-colors ${active ? "bg-white/[0.04] text-white/80" : "text-white/42 hover:bg-white/[0.035] hover:text-white/72"}`}><Icon size={14} strokeWidth={1.7} className={active ? "text-violet-300/75" : "text-white/27 group-hover:text-white/45"} /><span className="flex-1">{item.label}</span>{item.count ? <span className="font-mono text-[8px] text-white/22">{item.count}</span> : null}{item.expandable ? <ChevronRight size={10} className="text-white/22" /> : null}</Link>;
}

export function LegalSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(true);

  function isOverviewActive(href: string) {
    if (href === "/painel/juridico") return pathname === href;
    if (href.includes("responsavel=eu")) return pathname === "/painel/juridico/processos" && searchParams.get("responsavel") === "eu";
    if (href.includes("visao=movimentacoes")) return pathname === "/painel/juridico/processos" && searchParams.get("visao") === "movimentacoes";
    return false;
  }
  return (
    <aside className="sticky top-0 z-20 hidden h-screen w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0d0b0f]/96 lg:flex">
      <div className="flex h-16 items-center border-b border-white/[0.07] px-4"><LogoWordmark height={30} /></div>
      <Link href="/painel/workspaces" className="mx-4 mt-4 flex items-center gap-2 border-b border-white/[0.06] px-0 pb-3 text-left hover:text-white"><span className="grid size-6 place-items-center text-violet-300/65"><Scale size={13} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-white/68">Ribeiro & Associados</span><span className="block text-[9px] text-white/27">Advocacia · trocar workspace</span></span><ChevronDown size={10} className="text-white/25" /></Link>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
        <section>
          <p className="mb-2.5 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">Plataforma</p>
          <div className="space-y-0.5">{platformModules.map((item) => <ModuleLink key={item.href} item={item} pathname={pathname} />)}</div>
        </section>
        <section>
          <p className="mb-2.5 mt-6 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">Jurídico</p>
          <button type="button" aria-expanded={panelOpen} onClick={() => setPanelOpen((open) => !open)} className="flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-left text-[12px] font-medium text-white/48 hover:bg-white/[0.03] hover:text-white/72"><LayoutDashboard size={14} strokeWidth={1.8} className="text-violet-300/80" /><span className="flex-1">Painel jurídico</span><ChevronDown size={10} className={`text-white/34 transition-transform ${panelOpen ? "" : "-rotate-90"}`} /></button>
          {panelOpen ? <div className="relative ml-[13px] mt-1 py-1 pl-5 before:absolute before:bottom-2 before:left-0 before:top-0 before:w-px before:bg-white/[0.08]">{overview.map((item) => { const active = isOverviewActive(item.href); return <Link key={item.href} href={item.href} className={`relative flex min-h-8 w-full items-center rounded px-2 text-left text-[11px] transition-colors ${active ? "bg-violet-400/[0.09] font-medium text-violet-200" : "text-white/32 hover:bg-white/[0.025] hover:text-white/62"}`}><span className={`absolute -left-[21px] size-1 rounded-full ${active ? "bg-violet-400" : "bg-white/20"}`} />{item.label}</Link>; })}</div> : null}
          <div className="mt-1 space-y-0.5">{legalModules.map((item) => <ModuleLink key={item.href} item={item} pathname={pathname} />)}</div>
        </section>
        <section className="mt-6"><p className="mb-2.5 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">Escritório</p><div className="space-y-0.5">{officeModules.map((item) => <ModuleLink key={item.href} item={item} pathname={pathname} />)}</div></section>
      </nav>

      <div className="border-t border-white/[0.07] p-3"><Link href="/painel/configuracoes" className={`flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 text-[11px] ${pathname === "/painel/configuracoes" ? "text-white/75" : "text-white/35 hover:bg-white/[0.03] hover:text-white/62"}`}><Settings size={13} />Configurações</Link><div className="mt-1 flex items-center gap-2.5 px-2 py-2"><span className="grid size-7 place-items-center rounded-full bg-white/[0.07] text-[9px] font-semibold text-white/58">MR</span><div className="min-w-0"><p className="truncate text-[9px] font-medium text-white/60">Marina Ribeiro</p><p className="truncate text-[8px] text-white/23">Sócia administradora</p></div></div></div>
    </aside>
  );
}
