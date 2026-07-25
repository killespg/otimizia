import Link from "next/link";
import type { ReactElement } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Handshake,
  MessageCircle,
  PackageSearch,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Truck,
  UserRound,
} from "lucide-react";
import { DashboardCustomizePanel } from "@/components/DashboardCustomizePanel";
import { DashboardWidgetGrid } from "@/components/DashboardWidgetGrid";
import { PendingButton } from "@/components/PendingButton";
import type { DashboardPreferences, DashboardWidgetKey } from "@/lib/dashboard-preferences";
import type { DevMetrics } from "@/lib/devMetrics";
import { formatBRL, formatDate } from "@/lib/format";
import type { MetricKey, ProfessionPreset } from "@/lib/professions";
import type { SellerCommercialInsights } from "@/lib/seller-insights";
import type { Contact, Deal, DealStage, SellerModule, Task } from "@/lib/supabase/types";
import { claimDeal, claimTask, createTask, dismissChecklist } from "../actions";
import { updateDashboardPreferences } from "./actions";
import { RevenueLineChart } from "./RevenueLineChart";

type ContactOption = Pick<Contact, "id" | "name" | "company">;
type CalendarItem = { date: Date; title: string; href: string; tone: "danger" | "warning" | "brand" };

type SellerMetric = {
  metricKey: MetricKey;
  label: string;
  value: string;
  compare?: string;
  delta?: string;
  icon: (props: { className?: string }) => ReactElement;
  visible: boolean;
  order: number;
};

type Props = {
  now: Date;
  displayName: string;
  preset: ProfessionPreset;
  preferences: DashboardPreferences;
  metrics: SellerMetric[];
  openDeals: Deal[];
  taskQueue: Task[];
  overdue: Task[];
  contacts: ContactOption[];
  calendarItems: CalendarItem[];
  unclaimedTasks: Task[];
  unclaimedDeals: Deal[];
  openValue: number;
  wonValue: number;
  wonSeries: { day: number; cumulativeCents: number }[];
  conversionRate: number | null;
  avgTicketCents: number | null;
  commercialInsights: SellerCommercialInsights & {
    activitiesThisMonth: number;
    wonCountThisMonth: number;
    lostCountThisMonth: number;
    salesMarketingCostConfigured: boolean;
  };
  operations: {
    lowStockProducts: number;
    expiringWarranties: number;
    openWarrantyClaims: number;
    ordersToFulfill: number;
    enabledModules: SellerModule[];
  };
  founderMetrics: DevMetrics | null;
  onboarding?: {
    isOrgAdmin: boolean;
    done: {
      contact: boolean;
      deal: boolean;
      task: boolean;
      businessContext: boolean;
      assistant: boolean;
      team: boolean;
    };
  };
};

export function SellerDashboard({
  now,
  displayName,
  preset,
  preferences,
  metrics,
  openDeals,
  taskQueue,
  overdue,
  contacts,
  calendarItems,
  unclaimedTasks,
  unclaimedDeals,
  openValue,
  wonValue,
  wonSeries,
  conversionRate,
  avgTicketCents,
  commercialInsights,
  operations,
  founderMetrics,
  onboarding,
}: Props) {
  const contactMap = new Map(contacts.map((contact) => [contact.id, contact]));
  const todayCount = taskQueue.filter((task) => task.due_at && isToday(new Date(task.due_at), now)).length;
  const actionableCount = overdue.length + todayCount;
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now);

  const widgetNodes: Partial<Record<DashboardWidgetKey, ReactElement>> = {
    metrics: <SellerStatistics metrics={metrics} insights={commercialInsights} avgTicketCents={avgTicketCents} conversionRate={conversionRate} />,
    open_claims: unclaimedTasks.length || unclaimedDeals.length ? (
      <SellerOpenClaims tasks={unclaimedTasks} deals={unclaimedDeals} preset={preset} />
    ) : undefined,
    tasks: <SellerPriorities tasks={taskQueue} overdue={overdue} now={now} contacts={contactMap} />,
    deals: <SellerDeals deals={openDeals} contacts={contactMap} preset={preset} />,
    chart: (
      <SellerRevenue
        openValue={openValue}
        wonValue={wonValue}
        series={wonSeries}
        conversionRate={conversionRate}
        avgTicketCents={avgTicketCents}
      />
    ),
    calendar: <SellerAgenda now={now} items={calendarItems} />,
    assistant: <SellerAssistantPreview />,
    onboarding: onboarding ? <SellerOnboarding preset={preset} {...onboarding} /> : undefined,
  };

  return (
    <div
      className={`dashboard-board dashboard-board-${preferences.style} dashboard-accent-${preferences.accent} relative isolate mx-auto w-full max-w-[1640px] space-y-6`}
      data-dashboard-style={preferences.style}
      data-dashboard-accent={preferences.accent}
      data-dashboard-metrics={preferences.metrics.join(",")}
    >
      <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold capitalize text-violet-300">
            <CalendarDays size={14} />
            <time dateTime={now.toISOString()}>{dateLabel}</time>
          </p>
          <h1 className="mt-3 text-od-title text-white">
            Bom dia, <span className="text-violet-300">{displayName}.</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/56">
            {actionableCount > 0 ? (
              <>Você tem <strong className="font-semibold text-[#fca79b]">{actionableCount} {actionableCount === 1 ? "prioridade" : "prioridades"}</strong> para resolver e <strong className="font-semibold text-violet-200">{openDeals.length} {openDeals.length === 1 ? "venda em andamento" : "vendas em andamento"}</strong>.</>
            ) : (
              <>Seu dia está em ordem. Há <strong className="font-semibold text-violet-200">{openDeals.length} {openDeals.length === 1 ? "venda em andamento" : "vendas em andamento"}</strong> na carteira.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/painel/tarefas#new-task" className="inline-flex min-h-11 items-center gap-2 rounded border border-white/[0.1] px-4 text-[13px] font-semibold text-white/68 hover:bg-white/[0.04] hover:text-white">
            <BellRing size={15} /> Novo lembrete
          </Link>
          <Link href="/painel/funil#new-deal" className="inline-flex min-h-11 items-center gap-2 rounded bg-od-accent px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(92,34,232,.6)] hover:bg-od-accent-hover">
            <Plus size={16} /> Nova venda
          </Link>
        </div>
      </header>

      <section className="border-y border-white/[0.08] py-1">
        <Link href="/painel/assistente" className="group flex min-h-14 items-center gap-3 text-sm text-white/52 hover:text-white/80">
          <Sparkles size={17} className="text-violet-400" />
          <span className="min-w-0 flex-1 truncate">Pergunte ao Tim sobre seus clientes e vendas</span>
          <ArrowRight size={16} className="text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-300" />
        </Link>
      </section>

      <SellerOperationsPulse operations={operations} />

      {founderMetrics ? <SellerFounderMetrics metrics={founderMetrics} /> : null}

      <DashboardCustomizePanel preferences={preferences} preset={preset} action={updateDashboardPreferences} />
      <DashboardWidgetGrid
        preferences={preferences}
        action={updateDashboardPreferences}
        layout="balanced"
        items={Object.entries(widgetNodes)
          .map(([widgetKey, node]) => ({
            id: widgetKey as DashboardWidgetKey,
            className: sellerWidgetShellClass(widgetKey as DashboardWidgetKey),
            node,
          }))
          .filter((item): item is { id: DashboardWidgetKey; className: string; node: ReactElement } => Boolean(item.node))}
      />
    </div>
  );
}

function SellerOperationsPulse({ operations }: { operations: Props["operations"] }) {
  const items = [
    { label: "Estoque baixo", value: operations.lowStockProducts, note: "produtos para repor", href: "/painel/produtos?stock=baixo", icon: PackageSearch, alert: operations.lowStockProducts > 0, enabled: operations.enabledModules.includes("inventory") },
    { label: "Pedidos a preparar", value: operations.ordersToFulfill, note: "confirmados ou em separação", href: "/painel/pedidos?status=open", icon: Truck, alert: operations.ordersToFulfill > 0, enabled: true },
    { label: "Garantias próximas", value: operations.expiringWarranties, note: "vencem em até 30 dias", href: "/painel/pos-venda?warranties=expiring", icon: ShieldAlert, alert: false, enabled: operations.enabledModules.includes("warranties") },
    { label: "Trocas e chamados", value: operations.openWarrantyClaims, note: "aguardando conclusão", href: "/painel/pos-venda?claims=open", icon: RotateCcw, alert: operations.openWarrantyClaims > 0, enabled: operations.enabledModules.includes("warranties") },
  ].filter((item) => item.enabled);
  const attentionItems = items.filter((item) => item.value > 0);
  if (attentionItems.length === 0) {
    return (
      <section className="flex min-h-16 items-center gap-3 rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)] px-4" aria-labelledby="seller-operation-title">
        <span className="grid size-8 shrink-0 place-items-center rounded border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"><CheckCircle2 size={16} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="seller-operation-title" className="text-sm font-semibold text-white">Operação em dia</h2>
          <p className="mt-0.5 truncate text-xs text-white/52">Nenhuma pendência operacional agora.</p>
        </div>
        <Link href="/painel/produtos" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold text-violet-300 hover:text-violet-200">Abrir operação <ArrowRight size={14} /></Link>
      </section>
    );
  }
  const columnClass = attentionItems.length === 1 ? "lg:grid-cols-1" : attentionItems.length === 2 ? "lg:grid-cols-2" : attentionItems.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <section className="overflow-hidden rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)] lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]" aria-labelledby="seller-operation-title">
      <header className="flex min-h-20 items-center justify-between gap-3 px-4">
        <div><h2 id="seller-operation-title" className="text-sm font-semibold text-white">Pulso da operação</h2><p className="mt-0.5 text-xs text-white/52">O que precisa de atenção depois da venda.</p></div>
        <Link href="/painel/produtos" className="text-xs font-semibold text-violet-300 hover:text-violet-200">Abrir operação</Link>
      </header>
      <div className={`grid sm:grid-cols-2 ${columnClass}`}>
        {attentionItems.map((item) => { const Icon = item.icon; return (
          <Link key={item.label} href={item.href} className="group flex min-h-20 items-center gap-3 border-t border-white/[0.08] px-4 hover:bg-white/[0.025] sm:[&:nth-child(2n)]:border-l lg:border-l lg:border-t-0">
            <span className={`grid size-8 shrink-0 place-items-center rounded border ${item.alert ? "border-[#fb7767]/25 bg-[#fb7767]/10 text-[#fca79b]" : "border-violet-400/20 bg-violet-400/[0.08] text-violet-300"}`}><Icon size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-white/58">{item.label}</span><span className="mt-1 flex min-w-0 items-baseline gap-2"><strong className="text-lg font-semibold tabular-nums text-white">{item.value}</strong><span className="truncate text-xs text-white/50">{item.note}</span></span></span>
            <ArrowRight size={14} className="ml-auto shrink-0 text-white/28 group-hover:text-violet-300" />
          </Link>
        ); })}
      </div>
    </section>
  );
}

function SellerStatistics({
  metrics,
  insights,
  avgTicketCents,
  conversionRate,
}: {
  metrics: SellerMetric[];
  insights: Props["commercialInsights"];
  avgTicketCents: number | null;
  conversionRate: number | null;
}) {
  return (
    <div className="space-y-4">
      <SellerMetrics metrics={metrics} />
      <SellerCommercialIndicators
        insights={insights}
        avgTicketCents={avgTicketCents}
        conversionRate={conversionRate}
      />
    </div>
  );
}

function SellerMetrics({ metrics }: { metrics: SellerMetric[] }) {
  return (
    <section data-dashboard-card className="grid grid-cols-2 overflow-hidden rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)] xl:grid-cols-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article
            key={metric.metricKey}
            data-dashboard-metric={metric.metricKey}
            className="flex min-h-24 items-start gap-3 border-b border-r border-white/[0.08] px-4 py-4 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 xl:min-h-28 xl:border-b-0 xl:border-r xl:even:border-r xl:last:border-r-0 xl:px-5"
            style={{ display: metric.visible ? undefined : "none", order: metric.order }}
          >
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded bg-violet-400/10 text-violet-300"><Icon className="size-4" /></span>
            <div className="min-w-0">
              <p data-dashboard-metric-label={metric.metricKey} className="text-xs font-medium text-white/48">{metric.label}</p>
              <p className="mt-2 truncate text-2xl font-bold tracking-[-0.03em] text-white">{metric.value}</p>
              {metric.delta || metric.compare ? <p className="mt-2 truncate text-[11px] text-white/38">{metric.delta ? <span className="mr-1.5 font-semibold text-violet-300">{metric.delta}</span> : null}{metric.compare}</p> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function SellerCommercialIndicators({
  insights,
  avgTicketCents,
  conversionRate,
}: {
  insights: Props["commercialInsights"];
  avgTicketCents: number | null;
  conversionRate: number | null;
}) {
  const closedThisMonth = insights.wonCountThisMonth + insights.lostCountThisMonth;
  return (
    <section data-dashboard-card data-commercial-insights className="overflow-hidden rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)]">
      <header className="flex items-end justify-between gap-4 border-b border-white/[0.08] px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Indicadores comerciais</h2>
          <p className="mt-1 text-xs text-white/44">Conversão, eficiência financeira e esforço da operação.</p>
        </div>
        <Link href="/painel/funil/relatorio" className="shrink-0 text-xs font-semibold text-violet-300 hover:text-violet-200">Ver relatório</Link>
      </header>
      <div className="grid divide-y divide-white/[0.08] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <InsightGroup
          title="Conversão e desempenho"
          items={[
            {
              label: "Taxa de conversão",
              value: conversionRate === null ? "—" : `${conversionRate}%`,
              note: closedThisMonth > 0 ? `${insights.wonCountThisMonth} ganhas · ${insights.lostCountThisMonth} perdidas no mês` : "Sem vendas fechadas no mês",
            },
            {
              label: "Ciclo de vendas",
              value: formatCycleDays(insights.salesCycleDays),
              note: insights.salesCycleBasis === "month" ? "média das vendas ganhas no mês" : insights.salesCycleBasis === "history" ? "média do histórico de vendas ganhas" : "Sem vendas ganhas para calcular",
            },
            {
              label: "Origem dos leads",
              value: insights.topLeadSource ?? "Não informada",
              note: insights.topLeadSource ? "origem com mais vendas ganhas" : "Preencha a origem nos contatos",
            },
          ]}
        />
        <InsightGroup
          title="Indicadores financeiros"
          items={[
            {
              label: "Ticket médio",
              value: avgTicketCents === null ? "—" : formatBRL(avgTicketCents),
              note: insights.wonCountThisMonth > 0 ? `${insights.wonCountThisMonth} ${insights.wonCountThisMonth === 1 ? "venda ganha" : "vendas ganhas"} no mês` : "Sem vendas ganhas no mês",
            },
            {
              label: "CAC",
              value: insights.cacCents === null ? "Configurar" : formatBRL(insights.cacCents),
              note: !insights.salesMarketingCostConfigured ? "Informe o custo em Personalizar painel" : insights.acquiredCustomersThisMonth === 0 ? "Sem novos clientes no mês" : "custo comercial por novo cliente",
            },
            {
              label: "LTV observado",
              value: insights.lifetimeValueCents === null ? "—" : formatBRL(insights.lifetimeValueCents),
              note: "receita histórica média por cliente",
            },
          ]}
        />
        <InsightGroup
          title="Esforço operacional"
          items={[
            {
              label: "Volume de atividades",
              value: String(insights.activitiesThisMonth),
              note: "interações registradas no mês",
            },
            {
              label: "Principal motivo de perda",
              value: insights.topLossReason ?? "Não informado",
              note: insights.topLossReason ? "motivo mais recorrente no período" : "Registre o motivo nas vendas perdidas",
            },
          ]}
        />
      </div>
    </section>
  );
}

function InsightGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; note: string }>;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <h3 className="text-xs font-semibold text-white/68">{title}</h3>
      <dl className="mt-3 divide-y divide-white/[0.07]">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
            <dt className="text-xs text-white/46">{item.label}</dt>
            <dd className="max-w-44 truncate text-right text-sm font-semibold text-white/82" title={item.value}>{item.value}</dd>
            <dd className="col-span-2 text-[11px] leading-relaxed text-white/34">{item.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatCycleDays(days: number | null) {
  if (days === null) return "—";
  if (days < 1) return "Menos de 1 dia";
  const value = Number.isInteger(days) ? String(days) : days.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${value} ${days === 1 ? "dia" : "dias"}`;
}

function SellerPriorities({ tasks, overdue, now, contacts }: { tasks: Task[]; overdue: Task[]; now: Date; contacts: Map<string, ContactOption> }) {
  const contactOptions = [...contacts.values()];
  return (
    <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] xl:gap-6">
      <div data-dashboard-card className="overflow-hidden rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)]">
        <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] px-4 py-4">
          <div>
            <h2 className="text-od-subtitle text-white">Prioridades de hoje</h2>
            <p className="mt-1 text-xs text-white/45">{tasks.length ? `${tasks.length} ${tasks.length === 1 ? "item exige" : "itens exigem"} sua atenção` : "Nenhum retorno pendente agora"}</p>
          </div>
          <Link href="/painel/tarefas" className="text-xs font-semibold text-violet-300 hover:text-violet-200">Ver meu dia</Link>
        </div>
        {tasks.length === 0 ? (
          <div className="flex min-h-28 items-center gap-3 px-4 py-5">
            <span className="grid size-9 place-items-center rounded bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={18} /></span>
            <div><p className="text-sm font-semibold text-white">Tudo em dia por aqui.</p><p className="mt-1 text-xs text-white/44">Seus próximos lembretes aparecerão nesta fila.</p></div>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[7rem_minmax(0,1.2fr)_minmax(9rem,.8fr)_7rem_1rem] gap-3 border-b border-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-white/30 md:grid">
              <span>Prioridade</span><span>Próxima ação</span><span>Cliente</span><span>Quando</span><span />
            </div>
            {tasks.map((task) => {
              const isOverdue = overdue.some((item) => item.id === task.id);
              const contact = task.contact_id ? contacts.get(task.contact_id) : undefined;
              return (
                <Link key={task.id} href="/painel/tarefas" className="group grid min-h-16 gap-2 border-b border-white/[0.08] px-4 py-3 last:border-b-0 hover:bg-white/[0.025] md:grid-cols-[7rem_minmax(0,1.2fr)_minmax(9rem,.8fr)_7rem_1rem] md:items-center md:gap-3">
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.03em] ${isOverdue ? "text-[#fb7767]" : "text-violet-300"}`}>{isOverdue ? "Atrasado" : isToday(new Date(task.due_at ?? now), now) ? "Hoje" : "Próximo"}</span>
                  <span className="min-w-0 truncate text-sm font-semibold text-white/88">{task.title}</span>
                  <span className="min-w-0 truncate text-xs text-white/48">{contact?.company || contact?.name || "Sem cliente vinculado"}</span>
                  <span className="text-xs text-white/48">{task.due_at ? formatDate(task.due_at) : "Sem data"}</span>
                  <Check size={15} className="hidden text-white/24 group-hover:text-violet-300 md:block" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <form id="novo-lembrete" action={createTask} data-dashboard-card className="rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)] p-4">
        <input type="hidden" name="return_to" value="/painel" />
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded bg-violet-400/10 text-violet-300"><BellRing size={17} /></span>
          <div><h2 className="text-sm font-semibold text-white">Criar lembrete rápido</h2><p className="mt-1 text-xs text-white/42">Registre o próximo contato sem sair do painel.</p></div>
        </div>
        <div className="mt-4 space-y-3">
          <input name="title" required maxLength={160} placeholder="Ex: Retornar para a Ana" className="field" />
          <input name="due_at" type="datetime-local" defaultValue={defaultDateTimeValue(now)} className="field" />
          <select name="contact_id" defaultValue="" className="field" aria-label="Cliente do lembrete"><option value="">Sem cliente</option>{contactOptions.map((contact) => <option key={contact.id} value={contact.id}>{contact.company || contact.name}</option>)}</select>
          <PendingButton className="btn w-full" pendingLabel="Salvando"><Plus size={15} /> Salvar lembrete</PendingButton>
        </div>
      </form>
    </section>
  );
}

function SellerDeals({ deals, contacts, preset }: { deals: Deal[]; contacts: Map<string, ContactOption>; preset: ProfessionPreset }) {
  const recent = deals.slice(0, 6);
  return (
    <section data-dashboard-card className="h-full overflow-hidden rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-4">
        <div><h2 className="text-sm font-semibold text-white">Vendas em acompanhamento</h2><p className="mt-1 text-xs text-white/42">Ordenadas pela atividade mais recente</p></div>
        <Link href="/painel/funil" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200">Ver funil <ArrowRight size={13} /></Link>
      </div>
      {recent.length === 0 ? (
        <div className="px-4 py-8 text-center"><Handshake size={24} className="mx-auto text-violet-300" /><p className="mt-3 text-sm font-semibold text-white">Nenhuma venda aberta ainda.</p><Link href="/painel/funil#new-deal" className="mt-2 inline-block text-xs font-semibold text-violet-300">Criar primeira venda</Link></div>
      ) : (
        <div>
          <div className="hidden grid-cols-[minmax(0,1.2fr)_9rem_8rem_8rem] gap-3 border-b border-white/[0.07] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-white/30 sm:grid"><span>Cliente / venda</span><span>Etapa</span><span>Valor</span><span>Entrada</span></div>
          {recent.map((deal) => {
            const contact = deal.contact_id ? contacts.get(deal.contact_id) : undefined;
            return (
              <Link href="/painel/funil" key={deal.id} className="grid gap-2 border-b border-white/[0.07] px-5 py-4 last:border-b-0 hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1.2fr)_9rem_8rem_8rem] sm:items-center sm:gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-white/88">{deal.title}</p><p className="mt-1 truncate text-[11px] text-white/38">{contact?.company || contact?.name || "Sem cliente vinculado"}</p></div>
                <span className="w-fit rounded bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-200">{stageLabel(deal.stage, preset)}</span>
                <span className="text-sm font-semibold tabular-nums text-white/72">{formatBRL(deal.value_cents ?? 0)}</span>
                <span className="text-xs text-white/42">{formatDate(deal.created_at)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SellerRevenue({ openValue, wonValue, series, conversionRate, avgTicketCents }: { openValue: number; wonValue: number; series: { day: number; cumulativeCents: number }[]; conversionRate: number | null; avgTicketCents: number | null }) {
  const totalTracked = openValue + wonValue;
  const wonShare = totalTracked > 0 ? Math.round((wonValue / totalTracked) * 100) : 0;
  const hasRevenueData = series.some((point) => point.cumulativeCents > 0);
  return (
    <section data-dashboard-card className="h-full rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)] p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Resultado comercial</h2><p className="mt-1 text-xs text-white/44">Valores reais da sua carteira neste mês</p></div><TrendingUp size={18} className="text-violet-300" /></div>
      {hasRevenueData ? (
        <>
          <p className="mt-6 text-[32px] font-bold tracking-[-0.04em] text-white">{formatBRL(wonValue)}</p>
          <p className="mt-1 text-xs text-white/46">ganhos registrados no mês</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.09]"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${wonShare}%` }} /></div>
          <p className="mt-2 text-[11px] text-white/38">{wonShare}% do volume acompanhado já foi ganho</p>
          <RevenueLineChart series={series} dark />
          <div className="mt-5 grid divide-y divide-white/[0.08] border-y border-white/[0.08] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <MiniStat label="Em aberto" value={formatBRL(openValue)} />
            <MiniStat label="Conversão" value={conversionRate === null ? "—" : `${conversionRate}%`} />
            <MiniStat label="Ticket médio" value={avgTicketCents === null ? "—" : formatBRL(avgTicketCents)} />
          </div>
        </>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(12rem,.75fr)_minmax(0,1.25fr)] lg:items-start">
          <div>
            <p className="text-[32px] font-bold tracking-[-0.04em] text-white">{formatBRL(wonValue)}</p>
            <p className="mt-1 text-xs text-white/46">ganhos registrados no mês</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.09]"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${wonShare}%` }} /></div>
            <p className="mt-2 text-[11px] text-white/38">{wonShare}% do volume acompanhado já foi ganho</p>
          </div>
          <div>
            <div className="flex flex-col gap-4 border-y border-white/[0.08] py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded bg-violet-400/10 text-violet-300"><TrendingUp size={17} /></span>
                <div><p className="text-sm font-semibold text-white/76">Seu gráfico começa com a primeira venda ganha.</p><p className="mt-1 text-xs text-white/42">Mova uma oportunidade para ganha no funil.</p></div>
              </div>
              <Link href="/painel/funil" className="text-xs font-semibold text-violet-300 hover:text-violet-200">Abrir funil</Link>
            </div>
            <div className="mt-4 grid divide-y divide-white/[0.08] border-y border-white/[0.08] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <MiniStat label="Em aberto" value={formatBRL(openValue)} />
              <MiniStat label="Conversão" value={conversionRate === null ? "—" : `${conversionRate}%`} />
              <MiniStat label="Ticket médio" value={avgTicketCents === null ? "—" : formatBRL(avgTicketCents)} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-3 py-3 sm:py-4"><p className="truncate text-[11px] text-white/38">{label}</p><p className="mt-2 truncate text-sm font-semibold text-white/76">{value}</p></div>;
}

function SellerAssistantPreview() {
  return (
    <section data-dashboard-card className="h-full overflow-hidden rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded bg-violet-400/10 text-violet-300">
            <Sparkles size={17} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">Tim</h2>
            <p className="mt-1 text-xs text-white/44">Ações rápidas com o contexto da sua carteira.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400" /> Online
        </span>
      </div>
      <div className="divide-y divide-white/[0.07] xl:grid xl:grid-cols-3 xl:divide-x xl:divide-y-0">
        {[
          "Quem precisa de retorno hoje?",
          "Resuma minhas vendas em andamento",
          "Quais oportunidades estão paradas?",
        ].map((prompt) => (
          <Link
            key={prompt}
            href="/painel/assistente"
            className="group flex min-h-12 items-center gap-3 px-4 text-xs font-medium text-white/62 hover:bg-white/[0.03] hover:text-white"
          >
            <MessageCircle size={14} className="text-violet-300" />
            <span className="min-w-0 flex-1">{prompt}</span>
            <ArrowRight size={14} className="text-white/24 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-300" />
          </Link>
        ))}
      </div>
      <Link href="/painel/assistente" className="flex min-h-11 items-center justify-center gap-2 border-t border-white/[0.08] text-xs font-semibold text-violet-300 hover:bg-violet-400/[0.05] hover:text-violet-200">
        Abrir conversa <ArrowRight size={14} />
      </Link>
    </section>
  );
}

function SellerAgenda({ now, items }: { now: Date; items: CalendarItem[] }) {
  const upcoming = items.filter((item) => item.date >= now || item.tone === "danger").sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 6);
  return (
    <section data-dashboard-card className="h-full rounded border border-white/[0.09] bg-[rgba(30,29,34,0.94)] p-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Próximos lembretes</h2><p className="mt-1 text-xs text-white/42">Quem chamar e quando</p></div><Link href="/painel/calendario" className="text-xs font-semibold text-violet-300 hover:text-violet-200">Calendário</Link></div>
      {upcoming.length === 0 ? <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Clock3 size={18} className="shrink-0 text-white/32" /><div><p className="text-sm font-medium text-white/62">Sua agenda está livre.</p><p className="mt-1 text-xs text-white/40">Crie um lembrete para não perder o próximo retorno.</p></div></div><Link href="#novo-lembrete" className="text-xs font-semibold text-violet-300 hover:text-violet-200">Criar lembrete</Link></div> : <ul className="mt-4 divide-y divide-white/[0.07]">{upcoming.map((item, index) => <li key={`${item.title}-${index}`}><Link href={item.href} className="flex items-center gap-3 py-3 hover:text-white"><span className={`size-2 rounded-full ${item.tone === "danger" ? "bg-[#fb7767]" : item.tone === "warning" ? "bg-amber-300" : "bg-violet-400"}`} /><span className="min-w-0 flex-1 truncate text-xs font-medium text-white/68">{item.title}</span><span className="text-[11px] text-white/38">{formatDate(item.date.toISOString())}</span></Link></li>)}</ul>}
    </section>
  );
}

function SellerOpenClaims({ tasks, deals, preset }: { tasks: Task[]; deals: Deal[]; preset: ProfessionPreset }) {
  return (
    <section data-dashboard-card className="rounded border border-violet-400/20 bg-violet-400/[0.055] p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Disponíveis para assumir</h2><p className="mt-1 text-xs text-white/44">Itens da equipe ainda sem responsável</p></div><span className="rounded bg-violet-400/10 px-2 py-1 text-xs font-semibold text-violet-200">{tasks.length + deals.length}</span></div>
      <div className="mt-4 divide-y divide-violet-300/10 border-y border-violet-300/10">
        {tasks.map((task) => <div key={task.id} className="flex min-h-14 items-center gap-3 py-2"><BellRing size={15} className="text-violet-300" /><span className="min-w-0 flex-1 truncate text-sm font-medium text-white/72">{task.title}</span><form action={claimTask}><input type="hidden" name="task_id" value={task.id} /><input type="hidden" name="return_to" value="/painel" /><PendingButton className="min-h-9 rounded bg-violet-600 px-3 text-xs font-semibold text-white" pendingLabel="Assumindo">Assumir</PendingButton></form></div>)}
        {deals.map((deal) => <div key={deal.id} className="flex min-h-14 items-center gap-3 py-2"><CircleDollarSign size={15} className="text-violet-300" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white/72">{deal.title}</span><span className="text-[11px] text-white/38">{preset.dealSingular} · {formatBRL(deal.value_cents ?? 0)}</span></span><form action={claimDeal}><input type="hidden" name="deal_id" value={deal.id} /><input type="hidden" name="return_to" value="/painel" /><PendingButton className="min-h-9 rounded bg-violet-600 px-3 text-xs font-semibold text-white" pendingLabel="Assumindo">Assumir</PendingButton></form></div>)}
      </div>
    </section>
  );
}

function SellerOnboarding({ preset, isOrgAdmin, done }: NonNullable<Props["onboarding"]> & { preset: ProfessionPreset }) {
  const steps = [
    { label: preset.firstSteps[0], href: "/painel/contatos", done: done.contact, icon: UserRound },
    { label: preset.firstSteps[1], href: "/painel/funil", done: done.deal, icon: Handshake },
    { label: preset.firstSteps[2], href: "/painel/tarefas", done: done.task, icon: BellRing },
    { label: "Conversar com o assistente", href: "/painel/assistente", done: done.assistant, icon: MessageCircle },
    ...(isOrgAdmin ? [{ label: "Configurar o negócio", href: "/painel/equipe", done: done.businessContext, icon: Sparkles }, { label: "Convidar a equipe", href: "/painel/equipe", done: done.team, icon: UserRound }] : []),
  ];
  if (steps.every((step) => step.done)) return <></>;
  return (
    <section data-dashboard-card className="rounded border border-violet-400/20 bg-[rgba(30,29,34,0.94)] p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-violet-300">Primeiros passos</p><h2 className="mt-2 text-od-subtitle text-white">Deixe sua rotina de vendas pronta.</h2></div><form action={dismissChecklist}><PendingButton iconOnly pendingLabel="Fechando" className="grid size-9 place-items-center rounded text-white/38 hover:bg-white/[0.05] hover:text-white" aria-label="Fechar primeiros passos">×</PendingButton></form></div>
      <div className="mt-4 grid border-y border-white/[0.08] sm:grid-cols-2 xl:grid-cols-3">{steps.map((step) => { const Icon = step.icon; return <Link key={step.label} href={step.href} className={`flex min-h-16 items-center gap-3 border-b border-white/[0.08] px-2 py-3 last:border-b-0 hover:bg-white/[0.02] sm:border-r sm:last:border-r-0 ${step.done ? "text-white/38" : "text-white/72"}`}><span className={`grid size-8 place-items-center rounded ${step.done ? "bg-emerald-400/10 text-emerald-300" : "bg-violet-400/10 text-violet-300"}`}>{step.done ? <Check size={16} /> : <Icon size={16} />}</span><span className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>{step.label}</span></Link>; })}</div>
    </section>
  );
}

function SellerFounderMetrics({ metrics }: { metrics: DevMetrics }) {
  const activationRate = metrics.totalUsers ? Math.round((metrics.activatedUsers / metrics.totalUsers) * 100) : 0;
  const items = [["Cadastros", metrics.totalUsers], ["Ativados", `${metrics.activatedUsers} (${activationRate}%)`], ["Em teste", metrics.planCounts.trialing], ["Pagantes", metrics.planCounts.active]];
  return <section className="grid border-y border-violet-400/20 bg-violet-400/[0.035] sm:grid-cols-4">{items.map(([label, value]) => <div key={label} className="border-b border-violet-400/15 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[11px] text-violet-200/55">{label}</p><p className="mt-1 text-lg font-semibold text-white">{value}</p></div>)}</section>;
}

function sellerWidgetShellClass(widget: DashboardWidgetKey) {
  switch (widget) {
    case "deals":
      return "min-w-0 xl:col-span-8";
    case "calendar":
      return "min-w-0 xl:col-span-4";
    default:
      return "min-w-0 xl:col-span-12";
  }
}

function stageLabel(stage: DealStage, preset: ProfessionPreset) {
  return preset.stages[stage]?.label ?? stage;
}

function isToday(date: Date, now: Date) {
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function defaultDateTimeValue(now: Date) {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
