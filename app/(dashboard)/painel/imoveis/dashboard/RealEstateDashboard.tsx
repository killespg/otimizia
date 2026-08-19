import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  HandCoins,
  HousePlus,
  Images,
  MapPinned,
  Plus,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import type { OrgMember } from "@/lib/workspace/org";
import { isCommissionOverdue } from "@/lib/real-estate/real-estate-commissions";
import type {
  RealEstateCommission,
  RealEstateOffer,
  RealEstateTarget,
  RealEstateVisit,
} from "@/lib/supabase/types";
import { regeneratePublicPageToken, togglePublicPage } from "../advanced-actions";
import { createCommission, createTarget, recordCommissionPayment } from "../commission-actions";

type DashboardOrganization = {
  real_estate_public_page_enabled: boolean;
  real_estate_public_page_token: string;
};

type Props = {
  now: Date;
  displayName: string;
  from: string;
  to: string;
  brokerFilter: string;
  members: OrgMember[];
  canManage: boolean;
  activePropertyCount: number;
  capturedCount: number;
  showcaseCount: number;
  visits: Pick<RealEstateVisit, "status">[];
  offers: Pick<RealEstateOffer, "status">[];
  commissions: RealEstateCommission[];
  targets: RealEstateTarget[];
  deals: Array<{ id: string; title: string }>;
  properties: Array<{ id: string; title: string }>;
  organization: DashboardOrganization | null;
};

type DashboardMetric = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  href: string;
};

export function RealEstateDashboard({
  now,
  displayName,
  from,
  to,
  brokerFilter,
  members,
  canManage,
  activePropertyCount,
  capturedCount,
  showcaseCount,
  visits,
  offers,
  commissions,
  targets,
  deals,
  properties,
  organization,
}: Props) {
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now);
  const firstName = displayName.trim().split(/\s+/)[0] || "Corretor";
  const completedVisits = visits.filter((visit) => visit.status === "completed").length;
  const requestedVisits = visits.filter((visit) => visit.status === "requested").length;
  const acceptedOffers = offers.filter((offer) => offer.status === "accepted").length;
  const openOffers = offers.filter((offer) => offer.status === "sent" || offer.status === "viewed").length;
  const acceptanceRate = offers.length > 0 ? Math.round((acceptedOffers / offers.length) * 100) : null;
  const expectedTotal = commissions.reduce((sum, commission) => sum + commission.expected_amount_cents, 0);
  const receivedTotal = commissions.reduce((sum, commission) => sum + commission.received_amount_cents, 0);
  const targetTotal = targets.reduce((sum, target) => sum + target.target_amount_cents, 0);
  const overdueCount = commissions.filter(isCommissionOverdue).length;
  const attentionCount = requestedVisits + openOffers + overdueCount;

  const metrics: DashboardMetric[] = [
    {
      label: "Imóveis ativos",
      value: String(activePropertyCount),
      note: `${capturedCount} ${capturedCount === 1 ? "captação" : "captações"} no período`,
      icon: Building2,
      href: "/painel/imoveis",
    },
    {
      label: "Vitrines enviadas",
      value: String(showcaseCount),
      note: "seleções criadas no período",
      icon: Images,
      href: "/painel/imoveis/colecoes",
    },
    {
      label: "Visitas",
      value: `${completedVisits}/${visits.length}`,
      note: requestedVisits > 0 ? `${requestedVisits} aguardando confirmação` : "nenhuma solicitação pendente",
      icon: MapPinned,
      href: "/painel/imoveis/visitas",
    },
    {
      label: "Comissão prevista",
      value: centsToReais(expectedTotal),
      note: `${centsToReais(receivedTotal)} recebida`,
      icon: HandCoins,
      href: "/painel/imoveis/comissoes",
    },
  ];

  return (
    <div className="dashboard-board relative isolate mx-auto w-full max-w-[1640px] space-y-6">
      <header className="flex flex-col gap-5 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium capitalize text-od-text-3">
            <CalendarDays size={14} />
            <time dateTime={now.toISOString()}>{dateLabel}</time>
          </p>
          <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-[-0.02em] text-white sm:mt-3 sm:text-od-title">
            Bom dia, <span className="text-od-text">{firstName}.</span>
          </h1>
          <p className="mt-1.5 text-[13px] leading-5 text-white/56 sm:mt-2 sm:text-sm sm:leading-relaxed">
            {attentionCount > 0 ? (
              <>
                Sua operação tem <strong className="font-semibold text-[#fca79b]">{attentionCount} {attentionCount === 1 ? "ponto" : "pontos"} de atenção</strong> e <strong className="font-semibold text-od-text">{activePropertyCount} {activePropertyCount === 1 ? "imóvel ativo" : "imóveis ativos"}</strong> na carteira.
              </>
            ) : (
              <>
                Sua operação está em ordem. Há <strong className="font-semibold text-od-text">{activePropertyCount} {activePropertyCount === 1 ? "imóvel ativo" : "imóveis ativos"}</strong> na carteira.
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link href="/painel/imoveis/visitas" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-od-border px-4 text-[13px] font-semibold text-od-text-2 hover:bg-white/[0.04] hover:text-od-text">
            <CalendarDays size={15} /> Agenda de visitas
          </Link>
          <Link href="/painel/imoveis/novo" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-od-accent-hover">
            <HousePlus size={16} /> Novo imóvel
          </Link>
        </div>
      </header>

      <section className="panel px-4">
        <Link href="/painel/assistente" className="group flex min-h-14 items-center gap-3 text-sm text-white/52 hover:text-white/80">
          <Sparkles size={17} className="text-od-accent" />
          <span className="min-w-0 flex-1 truncate">Pergunte ao Tim sobre sua carteira, clientes e negociações</span>
          <ArrowRight size={16} className="text-od-text-3 transition-transform group-hover:translate-x-0.5 group-hover:text-od-text" />
        </Link>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-od-text-3">Área de trabalho</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Visão geral de imóveis</h2>
        </div>
        <DashboardFilters
          from={from}
          to={to}
          brokerFilter={brokerFilter}
          members={members}
        />
      </section>

      <RealEstateMetrics metrics={metrics} />

      <RealEstateCommercialIndicators
        acceptanceRate={acceptanceRate}
        acceptedOffers={acceptedOffers}
        totalOffers={offers.length}
        openOffers={openOffers}
        completedVisits={completedVisits}
        totalVisits={visits.length}
        capturedCount={capturedCount}
        expectedTotal={expectedTotal}
        receivedTotal={receivedTotal}
        targetTotal={targetTotal}
        showcaseCount={showcaseCount}
        overdueCount={overdueCount}
      />

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,.55fr)]">
        <CommissionPanel
          commissions={commissions}
          members={members}
          deals={deals}
          properties={properties}
          canManage={canManage}
          expectedTotal={expectedTotal}
          receivedTotal={receivedTotal}
          overdueCount={overdueCount}
        />
        <TargetsPanel targets={targets} members={members} canManage={canManage} from={from} to={to} />
      </section>

      {canManage && organization ? <PublicPagePanel organization={organization} /> : null}
    </div>
  );
}

function DashboardFilters({
  from,
  to,
  brokerFilter,
  members,
}: Pick<Props, "from" | "to" | "brokerFilter" | "members">) {
  return (
    <details className="group relative self-start sm:self-auto">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius-control)] border border-od-border px-3 text-xs font-semibold text-od-text-2 hover:bg-white/[0.04] hover:text-od-text">
        <Settings2 size={15} /> Personalizar painel
      </summary>
      <div className="absolute right-0 top-12 z-30 w-[min(38rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] border border-od-border bg-od-surface p-4 shadow-lg">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Período e corretor</h3>
          <p className="mt-1 text-xs text-od-text-3">Ajuste quais dados aparecem na visão geral.</p>
        </div>
        <form className="grid gap-3 sm:grid-cols-3" method="get">
          <label className="block">
            <span className="label">De</span>
            <input type="date" name="from" defaultValue={from} className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Até</span>
            <input type="date" name="to" defaultValue={to} className="field mt-1" />
          </label>
          <label className="block">
            <span className="label">Corretor</span>
            <select name="broker" defaultValue={brokerFilter} className="field mt-1">
              <option value="">Todos</option>
              {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name ?? "Sem nome"}</option>)}
            </select>
          </label>
          <div className="flex justify-end sm:col-span-3">
            <button type="submit" className="btn">Aplicar filtros</button>
          </div>
        </form>
      </div>
    </details>
  );
}

function RealEstateMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section data-dashboard-card className="grid grid-cols-2 overflow-hidden panel xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Link href={metric.href} key={metric.label} aria-label={`Abrir ${metric.label.toLowerCase()}`} className="group flex min-h-24 items-start gap-3 border-b border-r border-white/[0.08] px-4 py-4 transition-colors hover:bg-white/[0.025] focus-visible:z-10 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 xl:min-h-28 xl:border-b-0 xl:border-r xl:even:border-r xl:last:border-r-0 xl:px-5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-inner)] bg-white/[0.06] text-od-text-2"><Icon className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-od-text-3">{metric.label}</p>
              <p className="mt-2 truncate text-2xl font-bold tracking-[-0.03em] text-white">{metric.value}</p>
              <p className="mt-2 truncate text-xs text-od-text-3 transition-colors group-hover:text-white/52">{metric.note}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

function RealEstateCommercialIndicators({
  acceptanceRate,
  acceptedOffers,
  totalOffers,
  openOffers,
  completedVisits,
  totalVisits,
  capturedCount,
  expectedTotal,
  receivedTotal,
  targetTotal,
  showcaseCount,
  overdueCount,
}: {
  acceptanceRate: number | null;
  acceptedOffers: number;
  totalOffers: number;
  openOffers: number;
  completedVisits: number;
  totalVisits: number;
  capturedCount: number;
  expectedTotal: number;
  receivedTotal: number;
  targetTotal: number;
  showcaseCount: number;
  overdueCount: number;
}) {
  return (
    <section data-dashboard-card className="overflow-hidden panel">
      <header className="flex items-end justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Indicadores imobiliários</h2>
          <p className="mt-1 text-xs text-od-text-3">Carteira, eficiência comercial e resultado financeiro.</p>
        </div>
        <a href="/api/reports/real-estate-commissions" download className="shrink-0 text-xs font-semibold text-od-text-2 hover:text-od-text">Baixar relatório</a>
      </header>
      <div className="grid gap-2 pb-2 lg:grid-cols-3">
        <IndicatorGroup title="Conversão e carteira" items={[
          { label: "Taxa de aceitação", value: acceptanceRate === null ? "—" : `${acceptanceRate}%`, note: totalOffers > 0 ? `${acceptedOffers} de ${totalOffers} propostas aceitas` : "Sem propostas no período", href: "/painel/funil" },
          { label: "Visitas concluídas", value: totalVisits > 0 ? `${completedVisits}/${totalVisits}` : "—", note: totalVisits > 0 ? "visitas realizadas no período" : "Nenhuma visita agendada", href: "/painel/imoveis/visitas" },
          { label: "Captações", value: String(capturedCount), note: "imóveis adicionados no período", href: "/painel/imoveis" },
        ]} />
        <IndicatorGroup title="Indicadores financeiros" items={[
          { label: "Comissão prevista", value: centsToReais(expectedTotal), note: "valor esperado no período", href: "/painel/imoveis/comissoes" },
          { label: "Comissão recebida", value: centsToReais(receivedTotal), note: expectedTotal > 0 ? `${Math.round((receivedTotal / expectedTotal) * 100)}% da previsão realizada` : "Sem comissão prevista", href: "/painel/imoveis/comissoes" },
          { label: "Meta comercial", value: targetTotal > 0 ? centsToReais(targetTotal) : "Configurar", note: targetTotal > 0 ? "meta total do período" : "Defina uma meta abaixo", href: "/painel/imoveis/comissoes#metas" },
        ]} />
        <IndicatorGroup title="Esforço operacional" items={[
          { label: "Vitrines enviadas", value: String(showcaseCount), note: "seleções compartilhadas com clientes", href: "/painel/imoveis/colecoes" },
          { label: "Propostas em aberto", value: String(openOffers), note: openOffers > 0 ? "aguardando resposta" : "nenhuma aguardando resposta", href: "/painel/funil" },
          { label: "Comissões vencidas", value: String(overdueCount), note: overdueCount > 0 ? "exigem acompanhamento" : "nenhuma pendência financeira", href: "/painel/imoveis/comissoes" },
        ]} />
      </div>
    </section>
  );
}

function IndicatorGroup({ title, items }: { title: string; items: Array<{ label: string; value: string; note: string; href: string }> }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <h3 className="text-xs font-semibold text-white/68">{title}</h3>
      <div className="mt-3 space-y-1">
        {items.map((item) => (
          <Link href={item.href} key={item.label} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 rounded-[var(--radius-inner)] px-2 py-3 transition-colors hover:bg-white/[0.02] focus-visible:z-10" aria-label={`Abrir ${item.label.toLowerCase()}`}>
            <span className="text-xs text-od-text-3 transition-colors group-hover:text-white/64">{item.label}</span>
            <span className="max-w-44 truncate text-right text-sm font-semibold text-white/82 group-hover:text-od-text" title={item.value}>{item.value}</span>
            <span className="col-span-2 text-xs leading-relaxed text-od-text-3 transition-colors group-hover:text-od-text-3">{item.note}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CommissionPanel({ commissions, members, deals, properties, canManage, expectedTotal, receivedTotal, overdueCount }: Pick<Props, "commissions" | "members" | "deals" | "properties" | "canManage"> & { expectedTotal: number; receivedTotal: number; overdueCount: number }) {
  return (
    <section id="comissoes" className="panel scroll-mt-24 p-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div><h2 className="text-sm font-semibold text-white">Comissões</h2><p className="mt-1 text-xs text-od-text-3">Prevista: {centsToReais(expectedTotal)} · Recebida: {centsToReais(receivedTotal)}</p></div>
        {overdueCount > 0 ? <span className="text-xs font-semibold text-[#fca79b]">{overdueCount} {overdueCount === 1 ? "vencida" : "vencidas"}</span> : null}
      </header>
      <div className="pt-4">
        <div className="space-y-2">
          {commissions.length === 0 ? <p className="text-sm text-od-text-3">Nenhuma comissão registrada no período.</p> : commissions.map((commission) => (
            <div key={commission.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] py-3 first:pt-0 last:border-b-0">
              <div><p className="text-sm font-semibold text-white">{centsToReais(commission.expected_amount_cents)}</p><p className="mt-1 text-xs text-od-text-3">{commission.commission_percent}% de comissão</p></div>
              <span className={`tag ${isCommissionOverdue(commission) ? "bg-danger-50 text-danger-700" : "bg-surface-2 text-ink-muted"}`}>{isCommissionOverdue(commission) ? "Vencida" : commission.status === "received" ? "Recebida" : commission.status === "partial" ? "Parcial" : commission.status === "cancelled" ? "Cancelada" : "Prevista"}</span>
              {canManage && commission.status !== "received" && commission.status !== "cancelled" ? (
                <form action={recordCommissionPayment} className="flex items-center gap-2">
                  <input type="hidden" name="commission_id" value={commission.id} />
                  <input name="amount" placeholder="Valor recebido" className="field w-36 text-xs" />
                  <PendingButton className="btn-secondary px-3" pendingLabel="...">Registrar</PendingButton>
                </form>
              ) : null}
            </div>
          ))}
        </div>
        {canManage ? (
          <form action={createCommission} className="mt-5 grid gap-2 border-t border-white/[0.08] pt-5 sm:grid-cols-2">
            <select name="deal_id" required className="field"><option value="">Atendimento</option>{deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title}</option>)}</select>
            <select name="property_id" required className="field"><option value="">Imóvel</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select>
            <select name="broker_id" required className="field"><option value="">Corretor</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name ?? "Sem nome"}</option>)}</select>
            <input name="gross_sale_value" required placeholder="Valor da venda (R$)" className="field" />
            <input name="commission_percent" required placeholder="% de comissão" className="field" />
            <input type="date" name="due_at" aria-label="Vencimento da comissão" className="field" />
            <div className="sm:col-span-2"><PendingButton className="btn" pendingLabel="Registrando"><Plus size={15} /> Registrar comissão</PendingButton></div>
          </form>
        ) : null}
      </div>
    </section>
  );
}

export function TargetsPanel({ targets, members, canManage, from, to }: Pick<Props, "targets" | "members" | "canManage" | "from" | "to">) {
  // Antes: borda-esquerda fingindo separador, porque nao havia painel nenhum.
  // Com superficie propria, o proprio bloco delimita a coluna.
  return (
    <section id="metas" className="panel scroll-mt-24 p-5">
      <header className="border-b border-white/[0.08] pb-4"><div className="flex items-center gap-2"><Target size={16} className="text-od-text-3" /><h2 className="text-sm font-semibold text-white">Metas do período</h2></div><p className="mt-1 text-xs text-od-text-3">Acompanhe o objetivo da equipe ou de cada corretor.</p></header>
      <div className="pt-4">
        {targets.length === 0 ? <p className="text-sm text-od-text-3">Nenhuma meta definida para este período.</p> : (
          <ul className="divide-y divide-white/[0.07]">{targets.map((target) => { const broker = members.find((member) => member.user_id === target.broker_id); return <li key={target.id} className="flex items-center justify-between gap-3 py-3 first:pt-0"><span className="text-sm text-white/62">{broker ? broker.name ?? "Sem nome" : "Equipe"}</span><strong className="text-sm font-semibold text-white">{centsToReais(target.target_amount_cents)}</strong></li>; })}</ul>
        )}
        {canManage ? (
          <form action={createTarget} className="mt-5 grid gap-2 border-t border-white/[0.08] pt-5">
            <select name="broker_id" className="field"><option value="">Equipe inteira</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name ?? "Sem nome"}</option>)}</select>
            <input name="target_amount" required placeholder="Meta (R$)" className="field" />
            <div className="grid grid-cols-2 gap-2"><input type="date" name="period_start" required defaultValue={from} className="field" aria-label="Início da meta" /><input type="date" name="period_end" required defaultValue={to} className="field" aria-label="Fim da meta" /></div>
            <PendingButton className="btn-secondary" pendingLabel="Criando">Definir meta</PendingButton>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function PublicPagePanel({ organization }: { organization: DashboardOrganization }) {
  return (
    <section className="panel flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-inner)] bg-white/[0.06] text-od-text-2"><CircleDollarSign size={17} /></span><div><h2 className="text-sm font-semibold text-white">Página pública do corretor</h2><p className="mt-1 text-xs text-od-text-3">Vitrine permanente com todos os imóveis ativos.</p></div></div>
      <div className="flex flex-wrap items-center gap-2">
        <form action={togglePublicPage}><input type="hidden" name="enabled" value={organization.real_estate_public_page_enabled ? "" : "on"} /><PendingButton className="btn-secondary" pendingLabel="...">{organization.real_estate_public_page_enabled ? "Desativar" : "Ativar"}</PendingButton></form>
        {organization.real_estate_public_page_enabled ? <><Link href={`/share/corretor/${organization.real_estate_public_page_token}`} target="_blank" className="btn">Ver página</Link><form action={regeneratePublicPageToken}><PendingButton className="btn-secondary" pendingLabel="...">Gerar novo link</PendingButton></form></> : null}
      </div>
    </section>
  );
}

function centsToReais(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
