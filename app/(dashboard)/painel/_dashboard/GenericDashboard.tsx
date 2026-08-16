import Link from "next/link";
import { AgentPanel } from "@/components/tim/AgentPanel";
import { BrandName } from "@/components/design-system/BrandName";
import { DashboardCustomizePanel } from "@/components/dashboard/DashboardCustomizePanel";
import { DashboardWidgetGrid } from "@/components/dashboard/DashboardWidgetGrid";
import { PendingButton } from "@/components/ui/PendingButton";
import { RecentProcessChanges } from "@/components/legal/recent-process-changes";
import {
  ALL_DASHBOARD_METRICS,
  type DashboardWidgetKey,
  getDashboardPreferences,
  metricLabel,
} from "@/lib/workspace/dashboard-preferences";
import { computeDevMetrics, type DevMetrics } from "@/lib/utils/devMetrics";
import { dealValueOrZero, getCommissionCents } from "@/lib/crm/deals";
import { buildMonthCells } from "@/lib/utils/calendar-grid";
import { canManageLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { DatajudSearchForm } from "../juridico/consulta/DatajudSearchForm";
import { getProfessionPreset, type MetricKey, type ProfessionPreset } from "@/lib/people/professions";
import { isRealEstateV2Enabled } from "@/lib/real-estate/real-estate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_STAGES,
  type Contact,
  type Deal,
  type DealStage,
  type LegalDeadline,
  type LegalWatchedProcess,
  type Task,
} from "@/lib/supabase/types";
import { formatBRL, formatDate } from "@/lib/utils/format";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { buildSellerCommercialInsights } from "@/lib/seller/seller-insights";
import { claimDeal, claimTask, dismissChecklist, dismissRealEstateV2Intro } from "../actions";
import { updateDashboardPreferences } from "./actions";
import { ReminderModal as ReminderModalClient } from "./ReminderModal";
import { RevenueLineChart } from "./RevenueLineChart";
import { SellerDashboard } from "./SellerDashboard";
import {
  IconArrowRight,
  IconBell,
  IconBot,
  IconBuilding,
  IconCalendar,
  IconCheckCircle,
  IconColumns,
  IconMessage,
  IconSearch,
  IconSettings,
  IconUsers,
  IconWallet,
  IconX,
} from "../icons";

const METRIC_ICONS: Record<MetricKey, (props: { className?: string }) => React.ReactElement> = {
  open_value: IconWallet,
  open_deals: IconColumns,
  won_value_month: IconWallet,
  won_count_month: IconCheckCircle,
  contacts: IconUsers,
  overdue_tasks: IconBell,
  conversations_today: IconMessage,
  conversion_rate: IconCheckCircle,
  avg_ticket: IconWallet,
  commission_open: IconWallet,
};

type ContactOption = Pick<Contact, "id" | "name" | "company" | "source">;
type CalendarItem = { date: Date; title: string; href: string; tone: "danger" | "warning" | "brand" };

const DASHBOARD_GREETINGS: Record<ProfessionPreset["key"], string> = {
  autonomous_seller: "Bora olhar os clientes quentes e destravar os próximos fechamentos.",
  law_office: "Triagens, propostas e retornos em ordem para o escritório respirar melhor.",
  real_estate_broker: "Vamos cuidar dos leads, visitas e propostas que podem virar negócio.",
  service_provider: "Pedidos, orçamentos e agenda alinhados para o serviço fluir.",
  consultant: "Hora de acompanhar propostas, diagnósticos e próximos passos com clareza.",
  freelancer: "Projetos, prazos e aprovações no radar para nada escapar.",
  livestock_producer: "Lotes, compradores e retornos organizados para tocar a pecuária.",
  small_business: "Pedidos, clientes e recompra no ponto para vender com mais ritmo.",
  other: "Seu painel está pronto para organizar contatos, oportunidades e retornos.",
  founder: "Acompanhe sua prospecção e as métricas do produto num só lugar.",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select(
        "profession_type, is_admin, checklist_dismissed_at, dashboard_preferences, favorite_tribunals, real_estate_v2_intro_dismissed_at"
      )
      .maybeSingle(),
  ]);
  const orgId = await getActiveOrgId(supabase, user!.id);
  const isAdmin = profile?.is_admin ?? false;
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    isAdmin
  );
  const isLawOffice = workspaceKey === "law_office";
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Consultas independentes entre si (só precisam de orgId/workspaceKey, já
  // conhecidos aqui) — feitas juntas para não formar uma fila de idas e
  // vindas ao banco antes do Promise.all principal logo abaixo.
  const [orgRole, founderMetrics, { data: lawJobRoleRow }, { data: watchedProcessesData }, { data: legalDeadlinesData }] =
    await Promise.all([
      getOrgRole(supabase, orgId, user!.id),
      isAdmin ? loadFounderMetrics() : Promise.resolve(null),
      isLawOffice
        ? supabase
            .from("organization_members")
            .select("job_role")
            .eq("org_id", orgId)
            .eq("user_id", user!.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      isLawOffice
        ? supabase
            .from("legal_watched_processes")
            .select("*")
            .eq("org_id", orgId)
            .not("last_movement_at", "is", null)
        : Promise.resolve({ data: null }),
      isLawOffice
        ? supabase
            .from("legal_deadlines")
            .select("*")
            .eq("org_id", orgId)
            .eq("status", "pending")
            .gte("due_at", monthStart.toISOString())
            .lt("due_at", monthEnd.toISOString())
        : Promise.resolve({ data: null }),
    ]);
  const isOrgAdmin = orgRole === "admin";
  const lawJobRole = lawJobRoleRow?.job_role;
  const watchedProcesses: LegalWatchedProcess[] = watchedProcessesData ?? [];
  const recentProcessChanges = watchedProcesses
    .filter((item) => !item.seen_at || new Date(item.last_movement_at as string) > new Date(item.seen_at))
    .sort((a, b) => new Date(b.last_movement_at as string).getTime() - new Date(a.last_movement_at as string).getTime())
    .slice(0, 8);
  const legalDeadlines: LegalDeadline[] = legalDeadlinesData ?? [];
  const [
    { data: deals },
    { data: tasks },
    { data: contactOptions },
    { count: contactsCount },
    { count: newContactsThisMonth },
    { count: conversationsToday },
    { count: activitiesThisMonth },
    { count: totalTasksCount },
    { data: orgContext },
    { count: assistantMessageCount },
    { count: teamMembersCount },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("*")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .eq("done", false)
      .order("due_at", { ascending: true }),
    supabase
      .from("contacts")
      .select("id,name,company,source")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey),
    supabase
      .from("organizations")
      .select("business_context, real_estate_v2_enabled")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("assistant_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("org_id", orgId)
      .eq("role", "user"),
    isOrgAdmin
      ? supabase
          .from("organization_members")
          .select("user_id", { count: "exact", head: true })
          .eq("org_id", orgId)
      : Promise.resolve({ count: null }),
  ]);

  const allDeals = (deals ?? []) as Deal[];
  const openTasks = (tasks ?? []) as Task[];
  const contacts = contactsCount ?? 0;
  const contactsForForms = (contactOptions ?? []) as ContactOption[];
  const contactMap = new Map(contactsForForms.map((contact) => [contact.id, contact]));
  const preset = getProfessionPreset(workspaceKey);
  const dashboardPreferences = getDashboardPreferences(
    profile?.dashboard_preferences,
    preset,
    workspaceKey
  );

  const displayName =
    typeof user?.user_metadata?.name === "string" && user.user_metadata.name
      ? firstName(user.user_metadata.name)
      : firstName(user?.email?.split("@")[0] ?? "João");

  const openDeals = allDeals.filter(
    (deal) => deal.stage !== "ganho" && deal.stage !== "perdido"
  );
  const unclaimedTasks = openTasks.filter((task) => !task.assignee_id);
  const unclaimedDeals = openDeals.filter((deal) => !deal.assignee_id);
  const openValue = openDeals.reduce((sum, deal) => sum + dealValueOrZero(deal), 0);
  const openCommissionValues = openDeals
    .map((deal) => getCommissionCents(deal))
    .filter((value): value is number => value !== null);
  const openCommissionCents = openCommissionValues.reduce((sum, value) => sum + value, 0);
  const openDealsWithCommission = openCommissionValues.length;
  const wonThisMonth = allDeals.filter(
    (deal) =>
      deal.stage === "ganho" &&
      deal.closed_at &&
      new Date(deal.closed_at) >= monthStart
  );
  const wonValue = wonThisMonth.reduce((sum, deal) => sum + dealValueOrZero(deal), 0);
  const lostThisMonth = allDeals.filter(
    (deal) =>
      deal.stage === "perdido" &&
      deal.closed_at &&
      new Date(deal.closed_at) >= monthStart
  );
  const commercialInsights = buildSellerCommercialInsights({
    allDeals,
    wonThisMonth,
    lostThisMonth,
    contacts: contactsForForms,
    salesMarketingCostCents: dashboardPreferences.salesMarketingCostCents ?? 0,
  });
  const closedThisMonth = wonThisMonth.length + lostThisMonth.length;
  const conversionRate = closedThisMonth > 0
    ? Math.round((wonThisMonth.length / closedThisMonth) * 100)
    : null;
  const avgTicketCents = wonThisMonth.length > 0
    ? Math.round(wonValue / wonThisMonth.length)
    : null;

  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const wonPreviousMonth = allDeals.filter(
    (deal) =>
      deal.stage === "ganho" &&
      deal.closed_at &&
      new Date(deal.closed_at) >= previousMonthStart &&
      new Date(deal.closed_at) < monthStart
  );
  const lostPreviousMonth = allDeals.filter(
    (deal) =>
      deal.stage === "perdido" &&
      deal.closed_at &&
      new Date(deal.closed_at) >= previousMonthStart &&
      new Date(deal.closed_at) < monthStart
  );
  const wonValuePreviousMonth = wonPreviousMonth.reduce((sum, deal) => sum + dealValueOrZero(deal), 0);
  const closedPreviousMonth = wonPreviousMonth.length + lostPreviousMonth.length;
  const conversionRatePreviousMonth = closedPreviousMonth > 0
    ? Math.round((wonPreviousMonth.length / closedPreviousMonth) * 100)
    : null;
  const avgTicketPreviousMonthCents = wonPreviousMonth.length > 0
    ? Math.round(wonValuePreviousMonth / wonPreviousMonth.length)
    : null;

  const metricDeltas: Partial<Record<MetricKey, { delta?: string; compare?: string }>> = {
    open_value: {
      compare: `${openDeals.length} ${openDeals.length === 1 ? "venda em andamento" : "vendas em andamento"}`,
    },
    won_value_month: {
      delta: percentChange(wonValue, wonValuePreviousMonth),
      compare: `${formatBRL(wonValuePreviousMonth)} mês passado`,
    },
    won_count_month: {
      delta: countChange(wonThisMonth.length, wonPreviousMonth.length),
      compare: `${wonPreviousMonth.length} mês passado`,
    },
    conversion_rate:
      conversionRate !== null && conversionRatePreviousMonth !== null
        ? {
            delta: pointsChange(conversionRate, conversionRatePreviousMonth),
            compare: `${conversionRatePreviousMonth}% mês passado`,
          }
        : { compare: "Feche uma venda para calcular" },
    avg_ticket:
      avgTicketCents !== null && avgTicketPreviousMonthCents !== null
        ? {
            delta: percentChange(avgTicketCents, avgTicketPreviousMonthCents),
            compare: `${formatBRL(avgTicketPreviousMonthCents)} mês passado`,
          }
        : {},
    contacts: {
      compare: `+${newContactsThisMonth ?? 0} este mês`,
    },
    commission_open: {
      compare:
        openDeals.length === 0
          ? "Sem vendas em aberto"
          : openDealsWithCommission === 0
            ? "Defina a % nas vendas"
            : `${openDealsWithCommission} de ${openDeals.length} com comissão definida`,
    },
  };

  const daysElapsed = now.getDate();
  const dailyWonCents = new Array(daysElapsed).fill(0);
  for (const deal of wonThisMonth) {
    const dayIndex = new Date(deal.closed_at!).getDate() - 1;
    if (dayIndex >= 0 && dayIndex < daysElapsed) {
      dailyWonCents[dayIndex] += dealValueOrZero(deal);
    }
  }
  const wonSeries = dailyWonCents.map((_, index) => ({
    day: index + 1,
    cumulativeCents: dailyWonCents
      .slice(0, index + 1)
      .reduce((total, cents) => total + cents, 0),
  }));

  const overdue = openTasks
    .filter((task) => task.due_at && new Date(task.due_at) < now)
    .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1));
  const todayTasks = openTasks
    .filter(
      (task) =>
        task.due_at &&
        new Date(task.due_at) >= now &&
        new Date(task.due_at) <= endOfToday
    )
    .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1));
  const taskQueue = [...overdue, ...todayTasks, ...openTasks]
    .filter((task, index, arr) => arr.findIndex((item) => item.id === task.id) === index)
    .slice(0, 5);

  const calendarItems: CalendarItem[] = [
    ...openTasks
      .filter((task) => task.due_at)
      .map((task) => ({
        date: new Date(task.due_at as string),
        title: task.title,
        href: "/painel/tarefas",
        tone: (new Date(task.due_at as string) < now ? "danger" : "brand") as CalendarItem["tone"],
      })),
    ...legalDeadlines.map((deadline) => ({
      date: new Date(deadline.due_at),
      title: deadline.title,
      href: `/painel/juridico/processos/${deadline.case_id}`,
      tone: (deadline.priority === "critical" || deadline.priority === "high" ? "warning" : "brand") as CalendarItem["tone"],
    })),
  ];

  const metricValues: Record<MetricKey, string> = {
    open_value: formatBRL(openValue),
    open_deals: String(openDeals.length),
    won_value_month: formatBRL(wonValue),
    won_count_month: String(wonThisMonth.length),
    contacts: String(contacts),
    overdue_tasks: String(overdue.length),
    conversations_today: String(conversationsToday ?? 0),
    conversion_rate: conversionRate === null ? "—" : `${conversionRate}%`,
    avg_ticket: avgTicketCents === null ? "—" : formatBRL(avgTicketCents),
    commission_open: openDealsWithCommission > 0 ? formatBRL(openCommissionCents) : "—",
  };

  const metrics = ALL_DASHBOARD_METRICS.map(({ key }, index) => ({
    metricKey: key,
    label: metricLabel(key, preset, dashboardPreferences),
    value: metricValues[key],
    delta: metricDeltas[key]?.delta,
    compare: metricDeltas[key]?.compare,
    tone: index % 2 === 0 ? ("purple" as const) : ("pink" as const),
    icon: METRIC_ICONS[key],
    visible: dashboardPreferences.metrics.includes(key),
    order: Math.max(0, dashboardPreferences.metrics.indexOf(key)),
  }));

  const isFirstRun =
    contacts === 0 && allDeals.length === 0 && openTasks.length === 0;
  const greeting = dashboardGreeting(preset, {
    overdueCount: overdue.length,
    todayCount: todayTasks.length,
    isFirstRun,
  });

  if (workspaceKey === "autonomous_seller") {
    const warrantyLimit = new Date(now);
    warrantyLimit.setDate(warrantyLimit.getDate() + 30);
    const [
      { data: sellerProducts },
      { count: expiringWarranties },
      { count: openWarrantyClaims },
      { count: ordersToFulfill },
      { data: sellerBusinessProfile },
    ] = await Promise.all([
      supabase
        .from("seller_products")
        .select("id,stock_quantity,reserved_quantity,low_stock_threshold,track_stock")
        .eq("org_id", orgId)
        .eq("status", "active")
        .eq("track_stock", true),
      supabase
        .from("seller_warranties")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active")
        .gte("expires_on", now.toISOString().slice(0, 10))
        .lte("expires_on", warrantyLimit.toISOString().slice(0, 10)),
      supabase
        .from("seller_warranty_claims")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["open", "analysis", "assistance", "replacement_approved", "refund_approved"]),
      supabase
        .from("seller_orders")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["confirmed", "preparing", "ready"]),
      supabase
        .from("seller_business_profiles")
        .select("enabled_modules,low_stock_threshold")
        .eq("org_id", orgId)
        .eq("workspace_key", "autonomous_seller")
        .maybeSingle(),
    ]);
    const lowStockProducts = (sellerProducts ?? []).filter((product) =>
      product.track_stock && product.stock_quantity - product.reserved_quantity <= (product.low_stock_threshold ?? sellerBusinessProfile?.low_stock_threshold ?? 3)
    ).length;

    return (
      <SellerDashboard
        now={now}
        displayName={displayName}
        preset={preset}
        preferences={dashboardPreferences}
        metrics={metrics}
        openDeals={openDeals}
        taskQueue={taskQueue}
        overdue={overdue}
        contacts={contactsForForms}
        calendarItems={calendarItems}
        unclaimedTasks={unclaimedTasks}
        unclaimedDeals={unclaimedDeals}
        openValue={openValue}
        wonValue={wonValue}
        wonSeries={wonSeries}
        conversionRate={conversionRate}
        avgTicketCents={avgTicketCents}
        commercialInsights={{
          ...commercialInsights,
          activitiesThisMonth: activitiesThisMonth ?? 0,
          wonCountThisMonth: wonThisMonth.length,
          lostCountThisMonth: lostThisMonth.length,
          salesMarketingCostConfigured: (dashboardPreferences.salesMarketingCostCents ?? 0) > 0,
        }}
        operations={{
          lowStockProducts,
          expiringWarranties: expiringWarranties ?? 0,
          openWarrantyClaims: openWarrantyClaims ?? 0,
          ordersToFulfill: ordersToFulfill ?? 0,
          enabledModules: (sellerBusinessProfile?.enabled_modules ?? ["catalog", "orders"]) as import("@/lib/supabase/types").SellerModule[],
        }}
        founderMetrics={founderMetrics}
        onboarding={
          profile?.checklist_dismissed_at
            ? undefined
            : {
                isOrgAdmin,
                done: {
                  contact: contacts > 0,
                  deal: allDeals.length > 0,
                  task: (totalTasksCount ?? 0) > 0,
                  businessContext: Boolean(orgContext?.business_context),
                  assistant: (assistantMessageCount ?? 0) > 0,
                  team: (teamMembersCount ?? 0) > 1,
                },
              }
        }
      />
    );
  }

  const widgetNodes: Partial<Record<DashboardWidgetKey, React.ReactElement>> = {
    metrics: (
      <div className="space-y-4 sm:space-y-5">
        {founderMetrics && <FounderMetricsPanel metrics={founderMetrics} />}
        <section className="dashboard-metrics-grid enter grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.metricKey} {...metric} />
          ))}
        </section>
      </div>
    ),
    open_claims: <OpenClaimsPanel tasks={unclaimedTasks} deals={unclaimedDeals} preset={preset} />,
    calendar: <CalendarWidget now={now} items={calendarItems} viewAllHref="/painel/calendario" />,
    chart: (
      <RevenueChart
        openValue={openValue}
        wonValue={wonValue}
        series={wonSeries}
        contacts={contactsForForms}
        defaultDueAt={defaultDateTimeValue(now)}
        preset={preset}
      />
    ),
    deals: <DealsTable deals={openDeals} contactMap={contactMap} preset={preset} />,
    tasks: <TaskQueue tasks={taskQueue} overdue={overdue} now={now} />,
    assistant: <AgentPanel userName={displayName} />,
    onboarding: !profile?.checklist_dismissed_at ? (
      <OnboardingChecklist
        preset={preset}
        isOrgAdmin={isOrgAdmin}
        done={{
          contact: contacts > 0,
          deal: allDeals.length > 0,
          task: (totalTasksCount ?? 0) > 0,
          businessContext: Boolean(orgContext?.business_context),
          assistant: (assistantMessageCount ?? 0) > 0,
          team: (teamMembersCount ?? 0) > 1,
        }}
      />
    ) : undefined,
  };
  return (
    <div
      className={`dashboard-reference dashboard-board dashboard-board-${dashboardPreferences.style} dashboard-accent-${dashboardPreferences.accent} space-y-4 sm:space-y-5`}
      data-dashboard-style={dashboardPreferences.style}
      data-dashboard-accent={dashboardPreferences.accent}
      data-dashboard-metrics={dashboardPreferences.metrics.join(",")}
    >
      <header className="dashboard-header enter flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start justify-between gap-3 max-w-2xl">
          <div>
            <div className="dashboard-context-line">
              <span>Visão operacional</span>
              <span aria-hidden="true">•</span>
              <time dateTime={now.toISOString()}>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(now)}</time>
            </div>
            <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-[-0.02em] text-od-text sm:mt-2 sm:text-[2.15rem] sm:font-black sm:tracking-[-0.035em]">
              Olá, {displayName}!
            </h1>
            <p className="mt-1 text-[13px] font-medium leading-5 text-od-text-2 sm:text-base sm:font-semibold sm:leading-relaxed">
              {greeting}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <Link
              href="/painel/tarefas"
              className="nav-item relative grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-od-border bg-od-surface text-od-text-2 hover:text-brand-700"
              aria-label="Ver lembretes"
            >
              <IconBell className="h-[18px] w-[18px]" />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-xs font-black text-white">
                {Math.min(overdue.length, 9)}
              </span>
            </Link>
            <div className="relative grid h-10 w-10 place-items-center rounded-full bg-brand-700 text-xs font-black text-white">
              {initials(displayName)}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success-500" />
            </div>
          </div>
        </div>

        <form
          action="/painel/contatos"
          className="flex h-11 w-full min-w-0 items-center gap-2 rounded-[var(--radius-inner)] border border-od-border bg-od-surface px-3 text-sm sm:hidden"
        >
          <IconSearch className="h-5 w-5 shrink-0 text-od-text-3" />
          <label className="sr-only" htmlFor="dashboard-contact-search-mobile">
            Buscar contatos
          </label>
          <input
            id="dashboard-contact-search-mobile"
            name="q"
            type="search"
            placeholder="Buscar contatos, empresas..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-od-text outline-none placeholder:text-od-text-3"
          />
        </form>

        <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center">
          <form
            action="/painel/contatos"
            className="flex h-11 w-full min-w-0 items-center gap-2 rounded-[var(--radius-inner)] border border-od-border bg-od-surface px-3 text-sm sm:w-[430px]"
          >
            <IconSearch className="h-5 w-5 shrink-0 text-od-text-3" />
            <label className="sr-only" htmlFor="dashboard-contact-search">
              Buscar contatos
            </label>
            <input
              id="dashboard-contact-search"
              name="q"
              type="search"
              placeholder="Buscar contatos, empresas..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-od-text outline-none placeholder:text-od-text-3"
            />
            <button
              type="submit"
              className="min-h-11 self-stretch rounded-[var(--radius-control)] bg-od-muted-surface px-3 text-xs font-bold text-od-text-3 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-3">
            <Link
              href="/painel/tarefas"
              className="nav-item relative grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-od-border bg-od-surface text-od-text-2 hover:text-brand-700"
              aria-label="Ver lembretes"
            >
              <IconBell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-xs font-black text-white">
                {Math.min(overdue.length, 9)}
              </span>
            </Link>
            <div className="relative grid h-12 w-12 place-items-center rounded-full bg-brand-700 text-sm font-black text-white">
              {initials(displayName)}
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-success-500" />
            </div>
          </div>
        </div>
      </header>

      {workspaceKey === "real_estate_broker" &&
        isRealEstateV2Enabled(orgContext) &&
        !profile?.real_estate_v2_intro_dismissed_at && <RealEstateV2IntroCard />}

      {workspaceKey === "law_office" && (
        <section className="law-docket-strip" aria-label="Expediente do escritório">
          <div className="law-docket-heading">
            <span>Expediente</span>
            <strong>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(now)}</strong>
          </div>
          <Link href="/painel/tarefas" className="law-docket-item">
            <span>Vencidos</span><strong>{overdue.length}</strong><small>{overdue.length === 1 ? "pendência" : "pendências"}</small>
          </Link>
          <Link href="/painel/tarefas" className="law-docket-item">
            <span>Para hoje</span><strong>{todayTasks.length}</strong><small>{todayTasks.length === 1 ? "compromisso" : "compromissos"}</small>
          </Link>
          <Link href="/painel/funil" className="law-docket-item">
            <span>Em andamento</span><strong>{openDeals.length}</strong><small>atendimentos</small>
          </Link>
          <Link href="/painel/juridico/prazos" className="law-docket-action">Abrir pauta <IconArrowRight className="h-4 w-4" /></Link>
        </section>
      )}

      {workspaceKey === "law_office" && recentProcessChanges.length > 0 && (
        <RecentProcessChanges initialItems={recentProcessChanges} />
      )}
      {workspaceKey === "law_office" && recentProcessChanges.length === 0 && watchedProcesses.length > 0 && (
        <section className="panel flex items-center gap-3 p-4 sm:p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
            <IconCheckCircle className="h-5 w-5" />
          </span>
          <p className="text-sm font-bold text-od-text-2">
            Nenhum processo consultado recentemente teve alteração.
          </p>
        </section>
      )}

      {workspaceKey === "law_office" && (
        <section className="panel p-4 sm:p-5">
          <h2 className="text-sm font-black text-od-text">Consultar processo</h2>
          <p className="mt-1 text-xs font-medium text-od-text-3">
            Busque um processo no DataJud (CNJ) sem sair do painel.
          </p>
          <div className="mt-3">
            <DatajudSearchForm
              initialFavorites={profile?.favorite_tribunals ?? []}
              canManage={canManageLegal(lawJobRole, isOrgAdmin)}
              compact
            />
          </div>
        </section>
      )}

      <DashboardCustomizePanel
        preferences={dashboardPreferences}
        preset={preset}
        action={updateDashboardPreferences}
      />

      <DashboardWidgetGrid
        preferences={dashboardPreferences}
        action={updateDashboardPreferences}
        items={Object.entries(widgetNodes)
          .map(([widgetKey, node]) => ({
            id: widgetKey as DashboardWidgetKey,
            className: widgetShellClass(widgetKey as DashboardWidgetKey),
            node,
          }))
          .filter((item): item is { id: DashboardWidgetKey; className: string; node: React.ReactElement } =>
            Boolean(item.node)
          )}
      />
    </div>
  );
}

function widgetShellClass(widget: DashboardWidgetKey) {
  if (widget === "metrics" || widget === "onboarding" || widget === "open_claims") {
    return "min-w-0 xl:col-span-12";
  }
  if (widget === "chart" || widget === "deals") return "min-w-0 xl:col-span-8";
  return "min-w-0 xl:col-span-4";
}

function MetricCard({
  metricKey,
  label,
  value,
  compare,
  delta,
  tone,
  icon: Icon,
  visible,
  order,
}: {
  metricKey: MetricKey;
  label: string;
  value: string;
  compare?: string;
  delta?: string;
  tone: "purple" | "pink";
  icon: (props: { className?: string }) => React.ReactElement;
  visible: boolean;
  order: number;
}) {
  const toneClass =
    tone === "pink"
      ? {
          icon: "bg-[#fff7e6] text-[#8a6500]",
          badge: "bg-[#fff7e6] text-[#8a6500]",
        }
      : {
          icon: "bg-brand-100 text-brand-700",
          badge: "bg-brand-100 text-brand-800",
        };

  return (
    <article
      data-dashboard-metric={metricKey}
      className="enter relative min-h-[96px] overflow-hidden rounded-md border border-od-border bg-od-surface p-3 sm:min-h-[150px] sm:p-5"
      style={{ display: visible ? undefined : "none", order }}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p
            data-dashboard-metric-label={metricKey}
            className="text-xs font-semibold text-od-text-2 sm:text-sm"
          >
            {label}
          </p>
          <p className="text-safe mt-2 text-xl font-black leading-none tracking-[-0.03em] text-od-text sm:mt-3 sm:text-2xl">
            {value}
          </p>
        </div>
        <span className={`hidden h-9 w-9 shrink-0 place-items-center rounded-full sm:grid sm:h-11 sm:w-11 ${toneClass.icon}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>

      {(delta || compare) && (
        <div className="relative z-10 mt-3 hidden flex-wrap items-center gap-1.5 text-xs font-bold sm:mt-4 sm:flex sm:gap-2">
          {delta && <span className={`rounded-md px-2 py-1 ${toneClass.badge}`}>{delta}</span>}
          {compare && <span className="text-od-text-3">{compare}</span>}
        </div>
      )}
    </article>
  );
}

// Métricas do produto como um todo (todas as organizações) — só para a conta
// fundadora (is_admin), por isso usa o admin client em vez de filtrar por org.
async function loadFounderMetrics(): Promise<DevMetrics> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: contacts }, { data: deals }] = await Promise.all([
    admin
      .from("profiles")
      .select("name,plan,plan_status,trial_ends_at,stripe_subscription_id,created_at"),
    admin.from("contacts").select("owner_id"),
    admin.from("deals").select("owner_id,stage,value_cents"),
  ]);
  return computeDevMetrics(profiles ?? [], contacts ?? [], deals ?? []);
}

function FounderMetricsPanel({ metrics }: { metrics: DevMetrics }) {
  const activationRate =
    metrics.totalUsers > 0 ? Math.round((metrics.activatedUsers / metrics.totalUsers) * 100) : 0;
  const tiles = [
    { label: "Cadastros totais", value: String(metrics.totalUsers) },
    { label: "Ativados", value: `${metrics.activatedUsers} (${activationRate}%)` },
    { label: "Em teste", value: String(metrics.planCounts.trialing) },
    { label: "Pagantes", value: String(metrics.planCounts.active) },
  ];

  return (
    <section className="enter rounded-md border border-brand-200 bg-brand-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-brand-800">Métricas do <BrandName /></p>
        <Link
          href="/painel/metricas"
          className="nav-item inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-900"
        >
          Ver tudo
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-md border border-brand-200 bg-od-surface p-3">
            <p className="text-xs font-semibold text-od-text-2">{tile.label}</p>
            <p className="mt-1 text-lg font-black leading-none tracking-[-0.02em] text-od-text">
              {tile.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OpenClaimsPanel({
  tasks,
  deals,
  preset,
}: {
  tasks: Task[];
  deals: Deal[];
  preset: ProfessionPreset;
}) {
  if (tasks.length === 0 && deals.length === 0) return null;

  return (
    <section className="enter rounded-md border border-brand-200 bg-brand-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-brand-800">Disponíveis pra pegar</p>
          <p className="mt-1 text-xs font-medium text-od-text-3">
            Deixados em aberto pelo admin — quem pegar primeiro fica com o item.
          </p>
        </div>
        <span className="rounded-md bg-od-surface px-2.5 py-1 text-xs font-black text-brand-700">
          {String(tasks.length + deals.length).padStart(2, "0")}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {tasks.map((task) => (
          <li
            key={`task-${task.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-brand-200 bg-od-surface px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="clip-1 text-safe text-sm font-black text-od-text">{task.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-od-text-3">
                Tarefa{task.due_at ? ` · ${formatDate(task.due_at)}` : ""}
              </p>
            </div>
            <form action={claimTask}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="return_to" value="/painel" />
              <PendingButton
                className="min-h-11 shrink-0 rounded-[var(--radius-control)] bg-brand-700 px-3 text-xs font-black text-white hover:bg-brand-800"
                pendingLabel="Pegando"
              >
                Pegar
              </PendingButton>
            </form>
          </li>
        ))}
        {deals.map((deal) => (
          <li
            key={`deal-${deal.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-brand-200 bg-od-surface px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="clip-1 text-safe text-sm font-black text-od-text">{deal.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-od-text-3">
                {capitalize(preset.dealSingular)} · {formatBRL(deal.value_cents ?? 0)}
              </p>
            </div>
            <form action={claimDeal}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <input type="hidden" name="return_to" value="/painel" />
              <PendingButton
                className="min-h-11 shrink-0 rounded-[var(--radius-control)] bg-brand-700 px-3 text-xs font-black text-white hover:bg-brand-800"
                pendingLabel="Pegando"
              >
                Pegar
              </PendingButton>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function percentChange(current: number, previous: number): string | undefined {
  if (previous <= 0) return undefined;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "estável";
  return `${change > 0 ? "+" : ""}${change}%`;
}

function countChange(current: number, previous: number): string | undefined {
  if (previous <= 0) return undefined;
  const change = current - previous;
  if (change === 0) return "estável";
  return `${change > 0 ? "+" : ""}${change}`;
}

function pointsChange(current: number, previous: number): string | undefined {
  const change = current - previous;
  if (change === 0) return "estável";
  return `${change > 0 ? "+" : ""}${change}pp`;
}

function RevenueChart({
  openValue,
  wonValue,
  series,
  contacts,
  defaultDueAt,
  preset,
}: {
  openValue: number;
  wonValue: number;
  series: { day: number; cumulativeCents: number }[];
  contacts: ContactOption[];
  defaultDueAt: string;
  preset: ProfessionPreset;
}) {
  return (
    <section
      id="valor"
      className="enter relative overflow-hidden rounded-md border border-od-border bg-od-surface p-4 sm:min-h-[382px] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Receita</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-od-text sm:text-lg">
            {preset.wonLabel} no mês (R$)
          </h2>
          <p className="mt-1 text-xs font-medium text-od-text-3 sm:text-sm">
            Total aberto: {formatBRL(openValue)} - recebido no mês:{" "}
            {formatBRL(wonValue)}
          </p>
        </div>
      </div>

      <RevenueLineChart series={series} />

      <ReminderModalClient contacts={contacts} defaultDueAt={defaultDueAt} />
    </section>
  );
}

function DealsTable({
  deals,
  contactMap,
  preset,
}: {
  deals: Deal[];
  contactMap: Map<string, ContactOption>;
  preset: ProfessionPreset;
}) {
  const recent = deals.slice(0, 4);

  return (
    <section className="enter rounded-md border border-od-border bg-od-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Pipeline</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-od-text sm:text-lg">
            Negócios recentes
          </h2>
        </div>
        <Link
          href="/painel/funil"
          className="nav-item inline-flex items-center gap-1 text-sm font-black text-brand-700 hover:text-brand-900"
        >
          Ver todos
          <IconArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-od-border bg-[#f8fbff] px-3 py-8 text-center text-sm font-medium text-od-text-3">
          Nenhum negócio aberto ainda.
        </p>
      ) : (
        <>
          {/* Celular: cada negócio vira um card empilhado (a tabela larga
              nao cabe na tela e virava scroll horizontal). */}
          <ul className="mt-4 space-y-2 sm:hidden">
            {recent.map((deal) => {
              const stage = stageMeta(deal.stage, preset);
              const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;
              return (
                <li
                  key={deal.id}
                  className="rounded-md border border-od-border bg-od-surface p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="clip-2 text-safe min-w-0 text-sm font-black leading-snug text-od-text">
                      {deal.title}
                    </p>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-black ${stage.className}`}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-od-text-3">
                      {contact?.company ?? contact?.name ?? "Sem contato"}
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-brand-700">
                      {formatBRL(deal.value_cents ?? 0)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-od-text-3">
                    {formatDate(deal.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>

          {/* Tablet/desktop: tabela completa. */}
          <div className="mt-4 hidden overflow-x-auto rounded-md border border-od-border sm:block">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="bg-[#f8faff]">
                <tr className="text-xs font-bold text-od-text-3">
                  <th className="px-3 py-3">Negócio</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Etapa</th>
                  <th className="px-3 py-3">Valor</th>
                  <th className="px-3 py-3">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-od-surface">
                {recent.map((deal) => {
                  const stage = stageMeta(deal.stage, preset);
                  const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;
                  return (
                    <tr key={deal.id} className="text-xs font-semibold text-od-text-2">
                      <td className="px-3 py-3 text-od-text">{deal.title}</td>
                      <td className="px-3 py-3">
                        {contact?.company ?? contact?.name ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-black ${stage.className}`}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">{formatBRL(deal.value_cents ?? 0)}</td>
                      <td className="px-3 py-3">{formatDate(deal.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function TaskQueue({
  tasks,
  overdue,
  now,
}: {
  tasks: Task[];
  overdue: Task[];
  now: Date;
}) {
  return (
    <section className="enter rounded-md border border-od-border bg-od-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Agenda</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-od-text sm:text-lg">
            Fila de tarefas
          </h2>
        </div>
        <span className="rounded-md bg-od-muted-surface px-2.5 py-1 text-xs font-black text-od-text-3">
          {tasks.length} pendentes
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-od-border bg-[#f8faff] p-5 text-center">
          <IconCheckCircle className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-sm font-black text-od-text">Tudo em dia por aqui.</p>
          <p className="mt-1 text-sm font-medium text-od-text-3">
            Os próximos lembretes vão aparecer nesta fila.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((task, index) => {
            const priority = taskPriority(task, overdue, index);
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-md border border-od-border bg-od-surface px-3 py-3"
              >
                <span className="h-4 w-4 shrink-0 rounded-full border border-od-border bg-od-surface" />
                <div className="min-w-0 flex-1">
                  <p className="clip-1 text-safe text-sm font-black text-od-text">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-od-text-3">
                    {task.due_at ? dueLabel(task.due_at, now) : "Sem data"}
                  </p>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-black ${priority.className}`}>
                  {priority.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/painel/tarefas"
        className="nav-item mt-4 inline-flex items-center gap-2 text-sm font-black text-brand-700 hover:text-brand-900"
      >
        Ver todas as tarefas
        <IconArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

const CALENDAR_WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

function CalendarWidget({
  now,
  items,
  viewAllHref,
}: {
  now: Date;
  items: CalendarItem[];
  viewAllHref: string;
}) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const cells = buildMonthCells(year, month);

  const byDay = new Map<number, CalendarItem[]>();
  for (const item of items) {
    if (item.date.getFullYear() === year && item.date.getMonth() === month) {
      const day = item.date.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), item]);
    }
  }

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now);
  const upcoming = items
    .filter((item) => item.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);

  return (
    <section className="enter rounded-md border border-od-border bg-od-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Agenda</p>
          <h2 className="mt-0.5 text-base font-black capitalize tracking-[-0.02em] text-od-text sm:text-lg">
            {monthLabel}
          </h2>
        </div>
        <Link
          href={viewAllHref}
          className="nav-item inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-900"
        >
          Ver agenda
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase tracking-[0.04em] text-od-text-3">
        {CALENDAR_WEEKDAY_LABELS.map((label, index) => (
          <div key={index}>{label}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          const dayItems = day ? byDay.get(day) ?? [] : [];
          const isToday = day === now.getDate();
          return (
            <div
              key={index}
              className={
                "aspect-square rounded-md text-xs font-bold " +
                (day === null
                  ? ""
                  : isToday
                    ? "bg-brand-700 text-white"
                    : dayItems.length > 0
                      ? "bg-brand-50 text-brand-700"
                      : "text-od-text-2")
              }
            >
              {day && <span className="grid h-full place-items-center">{day}</span>}
            </div>
          );
        })}
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-od-border bg-[#f8faff] px-3 py-6 text-center text-xs font-medium text-od-text-3">
          Nada agendado por enquanto.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {upcoming.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="row-link flex items-center justify-between gap-2 rounded-md border border-od-border px-3 py-2 hover:border-brand-300 hover:bg-brand-50"
              >
                <span className="clip-1 text-safe min-w-0 text-xs font-bold text-od-text">{item.title}</span>
                <span className={"shrink-0 text-xs font-black " + calendarToneClass(item.tone)}>
                  {formatDate(item.date.toISOString())}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function calendarToneClass(tone: CalendarItem["tone"]) {
  if (tone === "danger") return "text-danger-600";
  if (tone === "warning") return "text-warning-700";
  return "text-brand-700";
}

function OnboardingChecklist({
  preset,
  isOrgAdmin,
  done,
}: {
  preset: ProfessionPreset;
  isOrgAdmin: boolean;
  done: {
    contact: boolean;
    deal: boolean;
    task: boolean;
    businessContext: boolean;
    assistant: boolean;
    team: boolean;
  };
}) {
  const steps = [
    {
      key: "contact",
      title: preset.firstSteps[0],
      desc: "Comece com quem você está atendendo agora.",
      href: "/painel/contatos",
      icon: IconUsers,
      done: done.contact,
    },
    {
      key: "deal",
      title: preset.firstSteps[1],
      desc: "Anote valor, etapa e próximo passo.",
      href: "/painel/funil",
      icon: IconColumns,
      done: done.deal,
    },
    {
      key: "task",
      title: preset.firstSteps[2],
      desc: "Escolha quando chamar o cliente de novo.",
      href: "/painel/tarefas",
      icon: IconBell,
      done: done.task,
    },
    {
      key: "assistant",
      title: "Converse com o assistente",
      desc: "Pergunte algo sobre seu negócio ou peça pra criar um contato.",
      href: "/painel/assistente",
      icon: IconBot,
      done: done.assistant,
    },
    ...(isOrgAdmin
      ? [
          {
            key: "context",
            title: "Configure o contexto da empresa",
            desc: "Conte o que a empresa faz — a IA usa isso em tudo que responde.",
            href: "/painel/equipe",
            icon: IconSettings,
            done: done.businessContext,
          },
          {
            key: "team",
            title: "Convide um colega de equipe",
            desc: "Traga quem também vende ou atende junto com você.",
            href: "/painel/equipe",
            icon: IconUsers,
            done: done.team,
          },
        ]
      : []),
  ];

  if (steps.every((step) => step.done)) return null;

  return (
    <section className="enter relative rounded-md border border-brand-200 bg-brand-50 p-5">
      <form action={dismissChecklist} className="absolute right-3 top-3">
        <PendingButton
          className="nav-item grid size-11 place-items-center rounded-[var(--radius-control)] text-od-text-3 hover:bg-od-surface/60 hover:text-od-text"
          aria-label="Fechar painel de primeiros passos"
          iconOnly
          pendingLabel="Fechando"
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </PendingButton>
      </form>

      <p className="text-sm font-black text-brand-800">Primeiros passos</p>
      <h2 className="mt-2 max-w-lg text-2xl font-black tracking-[-0.03em] text-od-text">
        Deixe seu painel pronto pra valer.
      </h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={
                "row-link relative rounded-md border p-4 " +
                (step.done
                  ? "border-success-200 bg-od-surface/70"
                  : "border-brand-200 bg-od-surface hover:border-brand-400")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className={"h-6 w-6 " + (step.done ? "text-success-600" : "text-brand-700")} />
                {step.done && <IconCheckCircle className="h-5 w-5 text-success-600" />}
              </div>
              <p
                className={
                  "mt-4 text-sm font-black " +
                  (step.done ? "text-od-text-3 line-through" : "text-od-text")
                }
              >
                {step.title}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-od-text-3">
                {step.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const REAL_ESTATE_V2_HIGHLIGHTS = [
  { title: "Match de clientes", desc: "A carteira já sugere o imóvel certo pra cada perfil de busca.", href: "/painel/imoveis", icon: IconUsers },
  { title: "Visitas", desc: "Agende, confirme e registre o feedback de cada visita num só lugar.", href: "/painel/imoveis/visitas", icon: IconCalendar },
  { title: "Propostas", desc: "Monte, envie e acompanhe o status de cada proposta até fechar.", href: "/painel/imoveis", icon: IconBuilding },
  { title: "Comissão", desc: "Veja o previsto, o recebido e o que já está vencido.", href: "/painel/imoveis/dashboard", icon: IconWallet },
  { title: "Chat de filtro", desc: "Descreva o que o cliente procura e a IA já filtra a carteira.", href: "/painel/imoveis", icon: IconBot },
];

// Card único de "o que mudou" quando a v2 imobiliária liga pro workspace —
// não é o checklist genérico de primeiros passos (OnboardingChecklist,
// aparece pra todo profissional), é um anúncio pontual desta leva de
// funcionalidades específica. Dispensa permanente por usuário (mesmo padrão
// de dismissChecklist/checklist_dismissed_at), não por organização — cada
// corretor da equipe vê e dispensa a própria vez.
function RealEstateV2IntroCard() {
  return (
    <section className="enter relative rounded-md border border-brand-200 bg-brand-50 p-5">
      <form action={dismissRealEstateV2Intro} className="absolute right-3 top-3">
        <PendingButton
          className="nav-item grid size-11 place-items-center rounded-[var(--radius-control)] text-od-text-3 hover:bg-od-surface/60 hover:text-od-text"
          aria-label="Fechar novidades da carteira de imóveis"
          iconOnly
          pendingLabel="Fechando"
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </PendingButton>
      </form>

      <p className="text-sm font-black text-brand-800">Novidades na carteira de imóveis</p>
      <h2 className="mt-2 max-w-lg text-2xl font-black tracking-[-0.03em] text-od-text">
        Sua carteira ganhou match, visitas, propostas e comissão.
      </h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {REAL_ESTATE_V2_HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="row-link relative rounded-md border border-brand-200 bg-od-surface p-4 hover:border-brand-400"
            >
              <Icon className="h-6 w-6 text-brand-700" />
              <p className="mt-4 text-sm font-black text-od-text">{item.title}</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-od-text-3">{item.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function stageMeta(stage: DealStage, preset: ProfessionPreset) {
  const label = preset.stages[stage]?.label ?? DEAL_STAGES.find((item) => item.key === stage)?.label ?? "Etapa";
  const map: Record<DealStage, string> = {
    novo: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
    em_contato: "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200",
    negociacao: "bg-warning-50 text-warning-700",
    ganho: "bg-success-50 text-success-700 dark:bg-[#062d1c] dark:text-[#9ff0c5]",
    perdido: "bg-danger-50 text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]",
  };

  return {
    label,
    className: map[stage],
  };
}

function taskPriority(task: Task, overdue: Task[], index: number) {
  if (overdue.some((item) => item.id === task.id) || index === 0) {
    return {
      label: "Alta",
      className: "bg-danger-50 text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]",
    };
  }
  if (index === 1) {
    return {
      label: "Média",
      className: "bg-warning-50 text-warning-700",
    };
  }
  return {
    label: "Baixa",
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
  };
}

function dueLabel(iso: string, now: Date) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sem data";
  const today = now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === today) return `Hoje, ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Amanhã, ${time}`;
  return `${formatDate(iso)}, ${time}`;
}

function defaultDateTimeValue(now: Date) {
  const value = new Date(now);
  value.setDate(value.getDate() + 1);
  value.setHours(10, 30, 0, 0);
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function firstName(value: string) {
  const clean = value.trim();
  if (!clean) return "João";
  return clean.split(/\s+/)[0];
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JS";
}

function dashboardGreeting(
  preset: ProfessionPreset,
  state: { overdueCount: number; todayCount: number; isFirstRun: boolean }
) {
  if (state.isFirstRun) {
    return `Comece pela área de ${preset.signupLabel}: cadastre um contato, crie um ${preset.dealSingular} e deixe um lembrete.`;
  }

  if (state.overdueCount > 0) {
    return `${state.overdueCount} ${state.overdueCount === 1 ? "retorno atrasado" : "retornos atrasados"} pedindo atenção na área de ${preset.signupLabel}.`;
  }

  if (state.todayCount > 0) {
    return `${state.todayCount} ${state.todayCount === 1 ? "lembrete" : "lembretes"} para hoje. Um bom dia para avançar ${preset.dealPlural}.`;
  }

  return DASHBOARD_GREETINGS[preset.key];
}
