import Link from "next/link";
import type { ReactNode } from "react";
import { AgentPanel } from "@/components/AgentPanel";
import { BrandName } from "@/components/BrandName";
import { DashboardCustomizePanel } from "@/components/DashboardCustomizePanel";
import { DashboardWidgetGrid } from "@/components/DashboardWidgetGrid";
import { PendingButton } from "@/components/PendingButton";
import {
  ALL_DASHBOARD_METRICS,
  type DashboardWidgetKey,
  getDashboardPreferences,
  metricLabel,
} from "@/lib/dashboard-preferences";
import { computeDevMetrics, type DevMetrics } from "@/lib/devMetrics";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getProfessionPreset, type MetricKey, type ProfessionPreset } from "@/lib/professions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_STAGES,
  type Contact,
  type Deal,
  type DealStage,
  type Task,
} from "@/lib/supabase/types";
import { formatBRL, formatDate } from "@/lib/format";
import { getWorkspaceKey } from "@/lib/workspaces";
import { claimDeal, claimTask, createTask, dismissChecklist } from "../actions";
import { updateDashboardPreferences } from "./actions";
import { ReminderModal as ReminderModalClient } from "./ReminderModal";
import { RevenueLineChart } from "./RevenueLineChart";
import {
  IconArrowRight,
  IconBell,
  IconBot,
  IconCheckCircle,
  IconColumns,
  IconMessage,
  IconSearch,
  IconSettings,
  IconUsers,
  IconWallet,
  IconX,
} from "../icons";

const METRIC_ICONS: Record<MetricKey, (props: { className?: string }) => JSX.Element> = {
  open_value: IconWallet,
  open_deals: IconColumns,
  won_value_month: IconWallet,
  won_count_month: IconCheckCircle,
  contacts: IconUsers,
  overdue_tasks: IconBell,
  conversations_today: IconMessage,
  conversion_rate: IconCheckCircle,
  avg_ticket: IconWallet,
};

type ContactOption = Pick<Contact, "id" | "name" | "company">;

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
  const supabase = createClient();
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
      .select("profession_type, is_admin, checklist_dismissed_at, dashboard_preferences")
      .maybeSingle(),
  ]);
  const orgId = await getActiveOrgId(supabase, user!.id);
  const isAdmin = profile?.is_admin ?? false;
  const founderMetrics = isAdmin ? await loadFounderMetrics() : null;
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    isAdmin
  );
  const orgRole = await getOrgRole(supabase, orgId, user!.id);
  const isOrgAdmin = orgRole === "admin";
  const [
    { data: deals },
    { data: tasks },
    { data: contactOptions },
    { count: contactsCount },
    { count: conversationsToday },
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
      .select("id,name,company")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey),
    supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey),
    supabase
      .from("organizations")
      .select("business_context")
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
    preset
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
  const openValue = openDeals.reduce((sum, deal) => sum + (deal.value_cents ?? 0), 0);
  const wonThisMonth = allDeals.filter(
    (deal) =>
      deal.stage === "ganho" &&
      deal.closed_at &&
      new Date(deal.closed_at) >= monthStart
  );
  const wonValue = wonThisMonth.reduce((sum, deal) => sum + (deal.value_cents ?? 0), 0);
  const lostThisMonth = allDeals.filter(
    (deal) =>
      deal.stage === "perdido" &&
      deal.closed_at &&
      new Date(deal.closed_at) >= monthStart
  );
  const closedThisMonth = wonThisMonth.length + lostThisMonth.length;
  const conversionRate = closedThisMonth > 0
    ? Math.round((wonThisMonth.length / closedThisMonth) * 100)
    : null;
  const avgTicketCents = wonThisMonth.length > 0
    ? Math.round(wonValue / wonThisMonth.length)
    : null;

  const daysElapsed = now.getDate();
  const dailyWonCents = new Array(daysElapsed).fill(0);
  for (const deal of wonThisMonth) {
    const dayIndex = new Date(deal.closed_at!).getDate() - 1;
    if (dayIndex >= 0 && dayIndex < daysElapsed) {
      dailyWonCents[dayIndex] += deal.value_cents ?? 0;
    }
  }
  let runningCents = 0;
  const wonSeries = dailyWonCents.map((cents, index) => {
    runningCents += cents;
    return { day: index + 1, cumulativeCents: runningCents };
  });

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
  };

  const metrics = ALL_DASHBOARD_METRICS.map(({ key }, index) => ({
    metricKey: key,
    label: metricLabel(key, preset, dashboardPreferences),
    value: metricValues[key],
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
  const widgetNodes: Partial<Record<DashboardWidgetKey, JSX.Element>> = {
    metrics: (
      <div className="space-y-4 sm:space-y-5">
        {founderMetrics && <FounderMetricsPanel metrics={founderMetrics} />}
        <section className="enter grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6 sm:gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.metricKey} {...metric} />
          ))}
        </section>
      </div>
    ),
    open_claims: <OpenClaimsPanel tasks={unclaimedTasks} deals={unclaimedDeals} preset={preset} />,
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
    assistant: <AgentPanel />,
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
    <div className={`dashboard-board dashboard-board-${dashboardPreferences.style} dashboard-accent-${dashboardPreferences.accent} space-y-4 sm:space-y-5`}>
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[28px] font-black tracking-[-0.025em] text-ink sm:text-4xl">
            Olá, {displayName}!
          </h1>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink-soft sm:text-base">
            {greeting}
          </p>
        </div>

        <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-center">
          <form
            action="/contacts"
            className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] sm:w-[430px]"
          >
            <IconSearch className="h-5 w-5 shrink-0 text-ink-muted" />
            <label className="sr-only" htmlFor="dashboard-contact-search">
              Buscar contatos
            </label>
            <input
              id="dashboard-contact-search"
              name="q"
              type="search"
              placeholder="Buscar contatos, empresas..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-muted"
            />
            <button
              type="submit"
              className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-bold text-ink-muted hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-3">
            <Link
              href="/tasks"
              className="nav-item relative grid h-11 w-11 place-items-center rounded-lg border border-line bg-white text-ink-soft shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] hover:text-brand-700"
              aria-label="Ver lembretes"
            >
              <IconBell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[11px] font-black text-white">
                {Math.min(overdue.length, 9)}
              </span>
            </Link>
            <div className="relative grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#3b16c6)] text-sm font-black text-white shadow-[0_16px_36px_-18px_rgba(92,34,232,0.8)]">
              {initials(displayName)}
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-success-500" />
            </div>
          </div>
        </div>
      </header>

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
          .filter((item): item is { id: DashboardWidgetKey; className: string; node: JSX.Element } =>
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
  icon: (props: { className?: string }) => JSX.Element;
  visible: boolean;
  order: number;
}) {
  const toneClass =
    tone === "pink"
      ? {
          icon: "dashboard-metric-icon-secondary",
          badge: "dashboard-metric-badge-secondary",
        }
      : {
          icon: "dashboard-metric-icon",
          badge: "dashboard-metric-badge",
        };

  return (
    <article
      data-dashboard-metric={metricKey}
      className="enter dashboard-card relative min-h-[96px] overflow-hidden rounded-lg border border-line bg-white p-3 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)] sm:min-h-[150px] sm:p-5"
      style={{ display: visible ? undefined : "none", order }}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p
            data-dashboard-metric-label={metricKey}
            className="truncate text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted sm:text-xs"
          >
            {label}
          </p>
          <p className="text-safe mt-2 font-display text-2xl font-bold leading-none tracking-[-0.03em] tabular-nums text-ink sm:mt-3 sm:text-[2rem]">
            {value}
          </p>
        </div>
        <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-full sm:grid sm:h-9 sm:w-9 ${toneClass.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {(delta || compare) && (
        <div className="relative z-10 mt-3 hidden flex-wrap items-center gap-1.5 text-xs font-bold sm:mt-4 sm:flex sm:gap-2">
          {delta && <span className={`rounded-md px-2 py-1 ${toneClass.badge}`}>{delta}</span>}
          {compare && <span className="text-ink-muted">{compare}</span>}
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
    <section className="enter rounded-lg border border-brand-200 bg-brand-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-brand-800">Métricas do <BrandName /></p>
        <Link
          href="/dev"
          className="nav-item inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:text-brand-900"
        >
          Ver tudo
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-brand-200 bg-white p-3">
            <p className="text-xs font-semibold text-ink-soft">{tile.label}</p>
            <p className="mt-1 text-lg font-black leading-none tracking-[-0.02em] text-ink">
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
    <section className="enter rounded-lg border border-brand-200 bg-brand-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-brand-800">Disponíveis pra pegar</p>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            Deixados em aberto pelo admin — quem pegar primeiro fica com o item.
          </p>
        </div>
        <span className="rounded-md bg-white px-2.5 py-1 text-xs font-black text-brand-700">
          {String(tasks.length + deals.length).padStart(2, "0")}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {tasks.map((task) => (
          <li
            key={`task-${task.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-white px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="clip-1 text-safe text-sm font-black text-ink">{task.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                Tarefa{task.due_at ? ` · ${formatDate(task.due_at)}` : ""}
              </p>
            </div>
            <form action={claimTask}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="return_to" value="/dashboard" />
              <PendingButton
                className="shrink-0 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-black text-white hover:bg-brand-800"
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
            className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-white px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="clip-1 text-safe text-sm font-black text-ink">{deal.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-muted">
                {capitalize(preset.dealSingular)} · {formatBRL(deal.value_cents ?? 0)}
              </p>
            </div>
            <form action={claimDeal}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <input type="hidden" name="return_to" value="/dashboard" />
              <PendingButton
                className="shrink-0 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-black text-white hover:bg-brand-800"
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
      className="enter relative overflow-hidden rounded-lg border border-line bg-white p-4 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)] sm:min-h-[382px] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700">Receita</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            {preset.wonLabel} no mês (R$)
          </h2>
          <p className="mt-1 text-xs font-medium text-ink-muted sm:text-sm">
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

function ReminderModal({
  contacts,
  defaultDueAt,
}: {
  contacts: ContactOption[];
  defaultDueAt: string;
}) {
  return (
    <form
      action={createTask}
      className="absolute bottom-6 right-6 z-10 hidden w-[360px] rounded-lg border border-line bg-white p-5 shadow-[0_22px_60px_-28px_rgba(15,23,42,0.65)] lg:block"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
            <IconBell className="h-5 w-5" />
          </span>
          <h3 className="text-base font-black text-ink">Novo lembrete</h3>
        </div>
        <button
          type="button"
          className="nav-item grid h-8 w-8 place-items-center rounded-md text-xl leading-none text-ink-muted hover:bg-surface-2 hover:text-ink"
          aria-label="Fechar"
        >
          x
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Título do lembrete *</span>
          <input
            name="title"
            required
            placeholder="Ex.: Ligar para cliente"
            className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Data e hora *</span>
          <input
            name="due_at"
            type="datetime-local"
            defaultValue={defaultDueAt}
            className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Relacionado a</span>
          <select
            name="contact_id"
            className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            defaultValue=""
          >
            <option value="">Selecione um contato ou empresa</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.company ? `${contact.name} - ${contact.company}` : contact.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-ink-soft">Observação opcional</span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Detalhes adicionais..."
            className="mt-1 w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition placeholder:text-ink-muted focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          className="nav-item rounded-md border border-line bg-white px-4 py-2 text-sm font-bold text-ink-soft hover:bg-surface-2 hover:text-ink"
        >
          Cancelar
        </button>
        <PendingButton
          className="nav-item rounded-md bg-brand-700 px-5 py-2 text-sm font-black text-white shadow-[0_14px_30px_-16px_rgba(109,40,217,0.9)] hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600"
          pendingLabel="Salvando"
        >
          Salvar
        </PendingButton>
      </div>
    </form>
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
    <section className="enter rounded-lg border border-line bg-white p-4 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)] sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700">Pipeline</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Negócios recentes
          </h2>
        </div>
        <Link
          href="/pipeline"
          className="nav-item inline-flex items-center gap-1 text-sm font-black text-brand-700 hover:text-brand-900"
        >
          Ver todos
          <IconArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-line bg-[#f8fbff] px-3 py-8 text-center text-sm font-medium text-ink-muted">
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
                  className="rounded-lg border border-line bg-white p-3 shadow-[0_8px_28px_-24px_rgba(15,23,42,0.55)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="clip-2 text-safe min-w-0 text-sm font-black leading-snug text-ink">
                      {deal.title}
                    </p>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black ${stage.className}`}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-ink-muted">
                      {contact?.company ?? contact?.name ?? "Sem contato"}
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-brand-700">
                      {formatBRL(deal.value_cents ?? 0)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-ink-muted">
                    {formatDate(deal.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>

          {/* Tablet/desktop: tabela completa. */}
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line sm:block">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead className="bg-[#f8faff]">
                <tr className="text-[11px] font-bold text-ink-muted">
                  <th className="px-3 py-3">Negócio</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Etapa</th>
                  <th className="px-3 py-3">Valor</th>
                  <th className="px-3 py-3">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white">
                {recent.map((deal) => {
                  const stage = stageMeta(deal.stage, preset);
                  const contact = deal.contact_id ? contactMap.get(deal.contact_id) : null;
                  return (
                    <tr key={deal.id} className="text-xs font-semibold text-ink-soft">
                      <td className="px-3 py-3 text-ink">{deal.title}</td>
                      <td className="px-3 py-3">
                        {contact?.company ?? contact?.name ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-md px-2 py-1 text-[11px] font-black ${stage.className}`}>
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
    <section className="enter rounded-lg border border-line bg-white p-4 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700">Agenda</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Fila de tarefas
          </h2>
        </div>
        <span className="rounded-md bg-surface-2 px-2.5 py-1 text-xs font-black text-ink-muted">
          {tasks.length} pendentes
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-line bg-[#f8faff] p-5 text-center">
          <IconCheckCircle className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-sm font-black text-ink">Tudo em dia por aqui.</p>
          <p className="mt-1 text-sm font-medium text-ink-muted">
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
                className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-3 shadow-[0_8px_28px_-24px_rgba(15,23,42,0.55)]"
              >
                <span className="h-4 w-4 shrink-0 rounded-full border border-line bg-white" />
                <div className="min-w-0 flex-1">
                  <p className="clip-1 text-safe text-sm font-black text-ink">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink-muted">
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
        href="/tasks"
        className="nav-item mt-4 inline-flex items-center gap-2 text-sm font-black text-brand-700 hover:text-brand-900"
      >
        Ver todas as tarefas
        <IconArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
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
      href: "/contacts",
      icon: IconUsers,
      done: done.contact,
    },
    {
      key: "deal",
      title: preset.firstSteps[1],
      desc: "Anote valor, etapa e próximo passo.",
      href: "/pipeline",
      icon: IconColumns,
      done: done.deal,
    },
    {
      key: "task",
      title: preset.firstSteps[2],
      desc: "Escolha quando chamar o cliente de novo.",
      href: "/tasks",
      icon: IconBell,
      done: done.task,
    },
    {
      key: "assistant",
      title: "Converse com o assistente",
      desc: "Pergunte algo sobre seu negócio ou peça pra criar um contato.",
      href: "/assistant",
      icon: IconBot,
      done: done.assistant,
    },
    ...(isOrgAdmin
      ? [
          {
            key: "context",
            title: "Configure o contexto da empresa",
            desc: "Conte o que a empresa faz — a IA usa isso em tudo que responde.",
            href: "/team",
            icon: IconSettings,
            done: done.businessContext,
          },
          {
            key: "team",
            title: "Convide um colega de equipe",
            desc: "Traga quem também vende ou atende junto com você.",
            href: "/team",
            icon: IconUsers,
            done: done.team,
          },
        ]
      : []),
  ];

  if (steps.every((step) => step.done)) return null;

  return (
    <section className="enter relative rounded-lg border border-brand-200 bg-brand-50 p-5">
      <form action={dismissChecklist} className="absolute right-3 top-3">
        <PendingButton
          className="nav-item grid h-8 w-8 place-items-center rounded-md text-ink-muted hover:bg-white/60 hover:text-ink"
          aria-label="Fechar painel de primeiros passos"
          iconOnly
          pendingLabel="Fechando"
        >
          <IconX className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </PendingButton>
      </form>

      <p className="text-sm font-black text-brand-800">Primeiros passos</p>
      <h2 className="mt-2 max-w-lg text-2xl font-black tracking-[-0.03em] text-ink">
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
                "row-link relative rounded-lg border p-4 " +
                (step.done
                  ? "border-success-200 bg-white/70"
                  : "border-brand-200 bg-white hover:border-brand-400")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <Icon className={"h-6 w-6 " + (step.done ? "text-success-600" : "text-brand-700")} />
                {step.done && <IconCheckCircle className="h-5 w-5 text-success-600" />}
              </div>
              <p
                className={
                  "mt-4 text-sm font-black " +
                  (step.done ? "text-ink-muted line-through" : "text-ink")
                }
              >
                {step.title}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-ink-muted">
                {step.desc}
              </p>
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
