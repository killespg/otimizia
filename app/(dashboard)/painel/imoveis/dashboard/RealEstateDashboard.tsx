import Link from "next/link";
import {
  Building2,
  CircleDollarSign,
  HandCoins,
  Images,
  MapPinned,
  Plus,
  Settings2,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  RealEstateDashboardHeader,
  type NotificationPreferences,
} from "@/components/real-estate/real-estate-dashboard-header";
import { PendingButton } from "@/components/ui/PendingButton";
import { getMobileDashboardGreeting } from "@/lib/real-estate/mobile-dashboard-greeting";
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
import { updateDashboardBackgroundVisibility } from "../../_dashboard/actions";

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
  showAnimatedBackground: boolean;
  notificationPreferences: NotificationPreferences;
};

type DashboardMetric = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  href: string;
};

type DashboardPanelVariant = "panel" | "tray";

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
  showAnimatedBackground,
  notificationPreferences,
}: Props) {
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
  const dashboardGreeting = getMobileDashboardGreeting({ now, attentionCount });

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
    <div data-liquid-stage="real-estate" className="dashboard-board relative isolate mx-auto w-full max-w-[1640px] space-y-8">
      <RealEstateDashboardHeader
        displayName={displayName}
        activePropertyCount={activePropertyCount}
        greeting={dashboardGreeting}
        requestedVisits={requestedVisits}
        openOffers={openOffers}
        overdueCommissions={overdueCount}
        notificationPreferences={notificationPreferences}
      />

      <RealEstateMetrics metrics={metrics} />

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-od-text-3">Área de trabalho</p>
            <h2 className="mt-1 text-sm font-semibold text-od-text">Visão geral de imóveis</h2>
          </div>
          <DashboardFilters
            from={from}
            to={to}
            brokerFilter={brokerFilter}
            members={members}
            showAnimatedBackground={showAnimatedBackground}
          />
        </div>

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
      </section>

      <section data-liquid-context-tray="true" className="glass relative grid items-start gap-8 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)] lg:p-6">
        <CommissionPanel
          commissions={commissions}
          members={members}
          deals={deals}
          properties={properties}
          canManage={canManage}
          expectedTotal={expectedTotal}
          receivedTotal={receivedTotal}
          overdueCount={overdueCount}
          variant="tray"
        />
        <TargetsPanel targets={targets} members={members} canManage={canManage} from={from} to={to} variant="tray" />
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
  showAnimatedBackground,
}: Pick<Props, "from" | "to" | "brokerFilter" | "members" | "showAnimatedBackground">) {
  return (
    <details data-dashboard-filters className="group relative self-start sm:self-auto">
      <summary className="liquid-glass-control flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full px-4 text-xs font-semibold text-od-text-2 hover:text-od-text">
        <Settings2 size={15} /> Personalizar painel
      </summary>
      <div className="glass absolute left-0 top-14 z-30 w-[min(38rem,calc(100vw-2rem))] p-4 sm:left-auto sm:right-0">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-od-text">Período e corretor</h3>
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
        <form
          action={updateDashboardBackgroundVisibility}
          className="mt-4 flex flex-col gap-3 rounded-2xl bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <input
            type="hidden"
            name="dashboard_animated_background"
            value={showAnimatedBackground ? "0" : "1"}
          />
          <div>
            <p className="text-xs font-semibold text-od-text-2">Fundo animado</p>
            <p className="mt-1 text-xs text-od-text-3">
              {showAnimatedBackground ? "Ativado na visão geral." : "Desativado na visão geral."}
            </p>
          </div>
          <PendingButton
            className="inline-flex min-h-10 items-center justify-center rounded border border-od-border px-3 text-xs font-semibold text-od-text-2 hover:bg-white/[0.04] hover:text-od-text"
            pendingLabel="Salvando"
          >
            {showAnimatedBackground ? "Desativar fundo" : "Ativar fundo"}
          </PendingButton>
        </form>
      </div>
    </details>
  );
}

function RealEstateMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section
      data-liquid-metric-rail="true"
      data-liquid-metrics-layout="horizontal"
      aria-label="Resumo da operação imobiliária"
      className="glass real-estate-metrics-glass relative grid grid-cols-2 gap-2 p-2 lg:grid-cols-4"
    >
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Link
            data-liquid-metric="true"
            data-hover-lift="true"
            href={metric.href}
            key={metric.label}
            aria-label={`Abrir ${metric.label.toLowerCase()}`}
            className="real-estate-metric-card group relative flex min-h-20 items-start gap-2 overflow-hidden rounded-2xl border border-b-white/[0.04] border-l-white/[0.12] border-r-white/[0.04] border-t-white/[0.16] p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_-20px_rgba(139,92,246,0.72)] focus-visible:z-10 sm:min-h-28 sm:gap-3 sm:p-4 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <MetricSparkline index={index} />
            <span className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-violet-400/[0.13] text-white ring-1 ring-inset ring-violet-200/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:size-8">
              <Icon className="size-3.5 drop-shadow-[0_0_6px_rgba(167,139,250,0.38)] sm:size-4" strokeWidth={1.8} />
              <span aria-hidden="true" className="absolute bottom-1 right-1 size-1 rounded-full bg-violet-300" />
            </span>
            <div className="relative z-10 min-w-0">
              <p className="text-[11px] font-medium leading-tight text-od-text-3 sm:text-xs">{metric.label}</p>
              {/* Valor em branco sólido, não em gradiente. Com o vidro mais
                  transparente a ponta cinza do gradiente caía para 2,52:1
                  contra o material — abaixo de AA-large, justo no dado mais
                  importante do card. DESIGN.md também não admite texto em
                  gradiente no produto. */}
              <p data-metric-value-style="solid" className="mt-1 truncate text-xl font-bold tracking-[-0.03em] text-white sm:mt-2 sm:text-2xl">{metric.value}</p>
              <p data-metric-note="true" className="hidden sm:block mt-2 truncate text-xs text-od-text-3 transition-colors group-hover:text-od-text-3">{metric.note}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

const metricSparklinePaths = [
  "M2 34 C18 31, 23 18, 40 22 S67 38, 84 25 S111 12, 134 18 S150 13, 158 8",
  "M2 30 C20 38, 31 12, 49 20 S74 35, 92 28 S116 9, 132 16 S148 26, 158 14",
  "M2 36 C17 20, 31 29, 45 18 S72 13, 89 26 S115 36, 132 21 S148 16, 158 9",
  "M2 33 C19 34, 28 24, 44 27 S69 14, 86 19 S112 31, 129 17 S146 10, 158 12",
];

function MetricSparkline({ index }: { index: number }) {
  return (
    <svg
      data-metric-sparkline="true"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 160 44"
      preserveAspectRatio="none"
      className="pointer-events-none absolute bottom-0 right-0 hidden md:block h-14 w-40 text-white opacity-[0.16] transition-opacity duration-300 group-hover:opacity-[0.26] motion-reduce:transition-none"
    >
      <path d={metricSparklinePaths[index % metricSparklinePaths.length]} fill="none" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <path d="M0 43 H160" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="0.75" />
    </svg>
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
  const expectedAgainstTarget = progressPercent(expectedTotal, targetTotal);
  const receivedAgainstExpected = progressPercent(receivedTotal, expectedTotal);

  return (
    <section
      data-liquid-indicators="true"
      data-liquid-indicators-surface="dense"
      className="glass real-estate-indicators-glass relative min-w-0 p-5 sm:p-6"
    >
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-od-text">Indicadores imobiliários</h2>
          <p className="mt-1 text-xs text-od-text-3">Carteira, eficiência comercial e resultado financeiro.</p>
        </div>
        <a href="/api/reports/real-estate-commissions" download className="shrink-0 text-xs font-semibold text-od-text-2 hover:text-od-text">Baixar relatório</a>
      </header>
      <div className="mt-5 grid gap-6 lg:grid-cols-3 xl:gap-8">
        <IndicatorGroup title="Conversão e carteira" items={[
          { label: "Taxa de aceitação", value: acceptanceRate === null ? "—" : `${acceptanceRate}%`, note: totalOffers > 0 ? `${acceptedOffers} de ${totalOffers} propostas aceitas` : "Sem propostas no período", href: "/painel/funil" },
          { label: "Visitas concluídas", value: totalVisits > 0 ? `${completedVisits}/${totalVisits}` : "—", note: totalVisits > 0 ? "visitas realizadas no período" : "Nenhuma visita agendada", href: "/painel/imoveis/visitas" },
          { label: "Captações", value: String(capturedCount), note: "imóveis adicionados no período", href: "/painel/imoveis" },
        ]} />
        <IndicatorGroup title="Indicadores financeiros" items={[
          { label: "Comissão prevista", value: centsToReais(expectedTotal), note: "valor esperado no período", href: "/painel/imoveis/comissoes", progress: { value: expectedAgainstTarget, label: "Previsão em relação à meta" } },
          { label: "Comissão recebida", value: centsToReais(receivedTotal), note: expectedTotal > 0 ? `${Math.round((receivedTotal / expectedTotal) * 100)}% da previsão realizada` : "Sem comissão prevista", href: "/painel/imoveis/comissoes", progress: { value: receivedAgainstExpected, label: "Recebido em relação à previsão" } },
          { label: "Meta comercial", value: targetTotal > 0 ? centsToReais(targetTotal) : "Configurar", note: targetTotal > 0 ? "meta total do período" : "Defina uma meta abaixo", href: "/painel/imoveis/comissoes#metas", progress: { value: expectedAgainstTarget, label: "Avanço da meta comercial" } },
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

type IndicatorItem = {
  label: string;
  value: string;
  note: string;
  href: string;
  progress?: { value: number; label: string };
};

function IndicatorGroup({ title, items }: { title: string; items: IndicatorItem[] }) {
  return (
    <div data-indicator-group="true" className="min-w-0">
      <h3 className="text-xs font-semibold text-od-text-2">{title}</h3>
      <div className="mt-3 space-y-1">
        {items.map((item) => (
          <Link href={item.href} key={item.label} className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.055] focus-visible:z-10" aria-label={`Abrir ${item.label.toLowerCase()}`}>
            <span className="text-xs text-od-text-3 transition-colors group-hover:text-od-text-2">{item.label}</span>
            <span className="max-w-44 truncate text-right text-sm font-semibold text-od-text group-hover:text-od-text" title={item.value}>{item.value}</span>
            <span className="col-span-2 text-xs leading-relaxed text-od-text-3 transition-colors group-hover:text-od-text-3">{item.note}</span>
            {item.progress ? (
              <span
                data-financial-progress="true"
                role="progressbar"
                aria-label={item.progress.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.progress.value}
                className="col-span-2 mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              >
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.48)]"
                  style={{ width: `${item.progress.value}%` }}
                />
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function progressPercent(value: number, total: number): number {
  if (total <= 0 || value <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export function CommissionPanel({ commissions, members, deals, properties, canManage, expectedTotal, receivedTotal, overdueCount, variant = "panel" }: Pick<Props, "commissions" | "members" | "deals" | "properties" | "canManage"> & { expectedTotal: number; receivedTotal: number; overdueCount: number; variant?: DashboardPanelVariant }) {
  const isTray = variant === "tray";

  return (
    <section id="comissoes" className={isTray ? "min-w-0 scroll-mt-24" : "panel scroll-mt-24 p-5"}>
      <header className={isTray ? "flex flex-wrap items-end justify-between gap-3" : "flex flex-wrap items-end justify-between gap-3 border-b border-od-border pb-4"}>
        <div><h2 className="text-sm font-semibold text-od-text">Comissões</h2><p className="mt-1 text-xs text-od-text-3">Prevista: {centsToReais(expectedTotal)} · Recebida: {centsToReais(receivedTotal)}</p></div>
        {overdueCount > 0 ? <span className="text-xs font-semibold text-[#fca79b]">{overdueCount} {overdueCount === 1 ? "vencida" : "vencidas"}</span> : null}
      </header>
      <div className={isTray ? "mt-5" : "pt-4"}>
        <div className="space-y-2">
          {commissions.length === 0 ? <p className="text-sm text-od-text-3">Nenhuma comissão registrada no período.</p> : commissions.map((commission) => (
            <div key={commission.id} className={isTray ? "flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-3 py-3" : "flex flex-wrap items-center justify-between gap-3 border-b border-od-border py-3 first:pt-0 last:border-b-0"}>
              <div><p className="text-sm font-semibold text-od-text">{centsToReais(commission.expected_amount_cents)}</p><p className="mt-1 text-xs text-od-text-3">{commission.commission_percent}% de comissão</p></div>
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
          <form action={createCommission} className={isTray ? "mt-5 grid gap-2 rounded-2xl bg-white/[0.04] p-3 sm:grid-cols-2" : "mt-5 grid gap-2 border-t border-od-border pt-5 sm:grid-cols-2"}>
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

export function TargetsPanel({ targets, members, canManage, from, to, variant = "panel" }: Pick<Props, "targets" | "members" | "canManage" | "from" | "to"> & { variant?: DashboardPanelVariant }) {
  const isTray = variant === "tray";

  return (
    <section id="metas" className={isTray ? "min-w-0 scroll-mt-24" : "panel scroll-mt-24 p-5"}>
      <header className={isTray ? "" : "border-b border-od-border pb-4"}><div className="flex items-center gap-2"><Target size={16} className="text-od-text-3" /><h2 className="text-sm font-semibold text-od-text">Metas do período</h2></div><p className="mt-1 text-xs text-od-text-3">Acompanhe o objetivo da equipe ou de cada corretor.</p></header>
      <div className={isTray ? "mt-5" : "pt-4"}>
        {targets.length === 0 ? <p className="text-sm text-od-text-3">Nenhuma meta definida para este período.</p> : (
          <ul className={isTray ? "space-y-2" : "divide-y divide-white/[0.07]"}>{targets.map((target) => { const broker = members.find((member) => member.user_id === target.broker_id); return <li key={target.id} className={isTray ? "flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-3 py-3" : "flex items-center justify-between gap-3 py-3 first:pt-0"}><span className="text-sm text-od-text-2">{broker ? broker.name ?? "Sem nome" : "Equipe"}</span><strong className="text-sm font-semibold text-od-text">{centsToReais(target.target_amount_cents)}</strong></li>; })}</ul>
        )}
        {canManage ? (
          <form action={createTarget} className={isTray ? "mt-5 grid gap-2 rounded-2xl bg-white/[0.04] p-3" : "mt-5 grid gap-2 border-t border-od-border pt-5"}>
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
    <section className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded bg-white/[0.06] text-od-text-2"><CircleDollarSign size={17} /></span><div><h2 className="text-sm font-semibold text-od-text">Página pública do corretor</h2><p className="mt-1 text-xs text-od-text-3">Vitrine permanente com todos os imóveis ativos.</p></div></div>
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
