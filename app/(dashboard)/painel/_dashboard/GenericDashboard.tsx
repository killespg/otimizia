import Link from "next/link";
import { AgentPanel } from "@/components/tim/AgentPanel";
import { DashboardCustomizePanel } from "@/components/dashboard/DashboardCustomizePanel";
import { DashboardWidgetGrid } from "@/components/dashboard/DashboardWidgetGrid";
import { RecentProcessChanges } from "@/components/legal/recent-process-changes";
import {
  ALL_DASHBOARD_METRICS,
  type DashboardWidgetKey,
  getDashboardPreferences,
  metricLabel,
} from "@/lib/workspace/dashboard-preferences";
import { dealValueOrZero, getCommissionCents } from "@/lib/crm/deals";
import { canManageLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { DatajudSearchForm } from "../juridico/consulta/DatajudSearchForm";
import { getProfessionPreset, type MetricKey } from "@/lib/people/professions";
import { isRealEstateV2Enabled } from "@/lib/real-estate/real-estate";
import { createClient } from "@/lib/supabase/server";
import {
  type Deal,
  type LegalDeadline,
  type LegalWatchedProcess,
  type Task,
} from "@/lib/supabase/types";
import { formatBRL } from "@/lib/utils/format";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { buildSellerCommercialInsights } from "@/lib/seller/seller-insights";
import { updateDashboardPreferences } from "./actions";
import {
  countChange,
  dashboardGreeting,
  defaultDateTimeValue,
  firstName,
  initials,
  percentChange,
  pointsChange,
  widgetShellClass,
  type CalendarItem,
  type ContactOption,
} from "./dashboard-format";
import { SellerDashboard } from "./SellerDashboard";
import { CalendarWidget } from "./widgets/CalendarWidget";
import { DealsTable } from "./widgets/DealsTable";
import { FounderMetricsPanel, loadFounderMetrics } from "./widgets/FounderMetricsPanel";
import { MetricCard } from "./widgets/MetricCard";
import { OnboardingChecklist } from "./widgets/OnboardingChecklist";
import { OpenClaimsPanel } from "./widgets/OpenClaimsPanel";
import { RealEstateV2IntroCard } from "./widgets/RealEstateV2IntroCard";
import { RevenueChart } from "./widgets/RevenueChart";
import { TaskQueue } from "./widgets/TaskQueue";
import {
  IconArrowRight,
  IconBell,
  IconCalendar,
  IconCheckCircle,
  IconColumns,
  IconMessage,
  IconSearch,
  IconUsers,
  IconWallet,
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

const MOBILE_SHORTCUTS = [
  { label: "Clientes", href: "/painel/contatos", icon: IconUsers },
  { label: "Lembretes", href: "/painel/tarefas", icon: IconBell },
  { label: "Calendário", href: "/painel/calendario", icon: IconCalendar },
];

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
            <h1 className="mt-2 text-[28px] font-black tracking-[-0.035em] text-od-text sm:text-[2.15rem]">
              Olá, {displayName}!
            </h1>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-od-text-2 sm:text-base">
              {greeting}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <Link
              href="/painel/tarefas"
              className="nav-item relative grid h-11 w-11 place-items-center rounded-md border border-od-border bg-od-surface text-od-text-2 hover:text-brand-700"
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
          className="flex h-11 w-full min-w-0 items-center gap-2 rounded-md border border-od-border bg-od-surface px-3 text-sm sm:hidden"
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
            className="flex h-11 w-full min-w-0 items-center gap-2 rounded-md border border-od-border bg-od-surface px-3 text-sm sm:w-[430px]"
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
              className="rounded-md bg-od-muted-surface px-2 py-1 text-xs font-bold text-od-text-3 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-3">
            <Link
              href="/painel/tarefas"
              className="nav-item relative grid h-11 w-11 place-items-center rounded-md border border-od-border bg-od-surface text-od-text-2 hover:text-brand-700"
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

      <nav aria-label="Atalhos" className="enter -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:hidden">
        {MOBILE_SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="nav-item flex shrink-0 flex-col items-center gap-1.5 rounded-md border border-od-border bg-od-surface px-4 py-3 text-center"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-700">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-xs font-bold text-od-text-2">{shortcut.label}</span>
            </Link>
          );
        })}
      </nav>

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

