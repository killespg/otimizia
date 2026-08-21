import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  FileCheck2,
  FileClock,
  FileSearch,
  RefreshCw,
} from "lucide-react";
import { canManageFinance, canViewFinance, canViewLegal } from "@/lib/law/law-office";
import { legalCaseHref } from "@/lib/law/legal-case-path";
import { getLegalCrmMetrics } from "@/lib/law/legal-crm-data";
import type { LegalCrmPeriodKey } from "@/lib/law/legal-crm-metrics";
import { formatBRL } from "@/lib/utils/format";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type {
  LegalCase,
  LegalDeadline,
  LegalWatchedProcess,
  Receivable,
  Task,
} from "@/lib/supabase/types";
import {
  effectiveTaskVisibility,
  filterTasksForSurface,
  orgTaskVisibilityPolicy,
} from "@/lib/law/task-visibility";
import { LegalDashboardAssistant } from "@/components/design-system/legal-dashboard-assistant";
import { LegalDashboardFilters } from "@/components/design-system/legal-dashboard-filters";
import { LegalCrmPerformance } from "@/components/legal/legal-crm-performance";

type ContactRow = { id: string; name: string };
type PaymentRow = { amount_cents: number; paid_at: string };
type CaseEventRow = { id: string; occurred_at: string };

const CASE_STATUS: Record<LegalCase["status"], string> = {
  intake: "Triagem",
  active: "Em andamento",
  waiting: "Aguardando",
  suspended: "Suspenso",
  closed: "Encerrado",
  archived: "Arquivado",
};

function endOfToday(now: Date) {
  const value = new Date(now);
  value.setHours(23, 59, 59, 999);
  return value;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "bem-vindo";
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortDate(value: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function outstanding(item: Receivable) {
  return Math.max(0, item.original_cents - item.paid_cents);
}

function normalizeLegalCrmPeriodKey(value: string | undefined): LegalCrmPeriodKey {
  return value === "previous_month" || value === "last_3_months" || value === "last_6_months"
    ? value
    : "current_month";
}

export default async function LegalDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    period?: string;
    portfolio?: string;
    area?: string;
    crm_period?: string;
  }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const now = new Date();
  const todayEnd = endOfToday(now);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    orgRole,
    { data: membership },
    { data: profile },
    members,
    { data: caseRows },
    { data: deadlineRows },
    { data: watchedRows },
    { data: receivableRows },
    { data: contactRows },
    { data: paymentRows },
    { data: eventRows },
  ] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase.from("profiles").select("name").eq("id", user!.id).maybeSingle(),
    getOrgMembers(supabase, orgId),
    supabase
      .from("legal_cases")
      .select("*")
      .eq("org_id", orgId)
      .order("next_deadline_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("legal_deadlines")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("due_at", { ascending: true }),
    supabase
      .from("legal_watched_processes")
      .select("*")
      .eq("org_id", orgId)
      .order("last_movement_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("receivables")
      .select("*")
      .eq("org_id", orgId)
      .order("due_date", { ascending: true }),
    supabase
      .from("contacts")
      .select("id,name")
      .eq("org_id", orgId)
      .eq("workspace_key", "law_office"),
    supabase
      .from("receivable_payments")
      .select("amount_cents,paid_at")
      .eq("org_id", orgId)
      .gte("paid_at", monthStart.toISOString()),
    supabase
      .from("legal_case_events")
      .select("id,occurred_at")
      .eq("org_id", orgId)
      .gte(
        "occurred_at",
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).toISOString(),
      ),
  ]);

  const isAdmin = orgRole === "admin";
  if (!canViewLegal(membership?.job_role, isAdmin)) {
    return (
      <section className="rounded-[var(--radius-panel)] border border-od-border bg-od-surface p-6">
        <h1 className="text-xl font-semibold">Acesso jurídico restrito</h1>
        <p className="mt-2 text-sm text-white/55">
          Peça a um administrador do escritório para revisar seu cargo.
        </p>
      </section>
    );
  }

  const financeVisible = canViewFinance(membership?.job_role, isAdmin);
  const financeManageable = canManageFinance(membership?.job_role, isAdmin);
  const commercialMetrics = await getLegalCrmMetrics({
    supabase,
    orgId,
    periodKey: normalizeLegalCrmPeriodKey(filters?.crm_period),
    now,
    canViewFinance: financeVisible,
  });

  const cases = (caseRows ?? []) as LegalCase[];
  const deadlines = (deadlineRows ?? []) as LegalDeadline[];
  const watched = (watchedRows ?? []) as LegalWatchedProcess[];
  const receivables = (receivableRows ?? []) as Receivable[];
  const contacts = (contactRows ?? []) as ContactRow[];
  const payments = (paymentRows ?? []) as PaymentRow[];
  const events = (eventRows ?? []) as CaseEventRow[];
  const contactNames = new Map(
    contacts.map((contact) => [contact.id, contact.name]),
  );
  const memberNames = new Map(
    members.map((member) => [member.user_id, member.name || "Sem nome"]),
  );
  const [{ data: orgVisibility }, { data: dashboardTaskRows }] = await Promise.all([
    supabase
      .from("organizations")
      .select("task_visibility_locked, task_visibility_mode")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id, title, due_at, assignee_id, owner_id, pending_assignee_id, reviewer_id, done")
      .eq("org_id", orgId)
      .eq("workspace_key", "law_office")
      .eq("done", false)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(40),
  ]);
  const visibilityPolicy = orgTaskVisibilityPolicy(orgVisibility ?? {});
  const ownerModeByUser = new Map(
    members.map((member) => [member.user_id, effectiveTaskVisibility(member.task_visibility, visibilityPolicy)]),
  );
  const viewerMode = effectiveTaskVisibility(
    members.find((member) => member.user_id === user!.id)?.task_visibility,
    visibilityPolicy,
  );
  const mixedTeamTasks = filterTasksForSurface(
    (dashboardTaskRows ?? []) as Pick<Task, "id" | "title" | "due_at" | "assignee_id" | "owner_id" | "pending_assignee_id" | "reviewer_id" | "done">[],
    user!.id,
    viewerMode,
    ownerModeByUser,
    "dashboard",
  ).filter((task) => task.assignee_id !== user!.id && task.owner_id !== user!.id);
  const caseById = new Map(cases.map((item) => [item.id, item]));

  const allActiveCases = cases.filter((item) =>
    ["intake", "active", "waiting", "suspended"].includes(item.status),
  );
  const period = filters?.period === "30" ? "30" : "7";
  const portfolio = filters?.portfolio === "team" ? "team" : "mine";
  const areas = Array.from(new Set(allActiveCases.map((item) => item.area).filter(Boolean))) as string[];
  const area = filters?.area && areas.includes(filters.area) ? filters.area : "all";
  const activeCases = allActiveCases.filter((item) =>
    (portfolio === "team" || item.responsible_id === user!.id) &&
    (area === "all" || item.area === area),
  );
  const activeCaseIds = new Set(activeCases.map((item) => item.id));
  const periodEnd = new Date(now.getTime() + Number(period) * 86_400_000);
  const visibleDeadlines = deadlines.filter(
    (item) => activeCaseIds.has(item.case_id) && new Date(item.due_at) <= periodEnd,
  );
  const critical = visibleDeadlines.filter(
    (item) => new Date(item.due_at) <= todayEnd,
  );
  const weekDeadlines = visibleDeadlines.filter(
    (item) => new Date(item.due_at) <= weekEnd,
  );
  const stalled = activeCases.filter(
    (item) => new Date(item.updated_at) < thirtyDaysAgo,
  );
  const reviews = watched.filter(
    (item) =>
      (!item.case_id || activeCaseIds.has(item.case_id)) &&
      item.last_movement_at &&
      (!item.seen_at ||
        new Date(item.last_movement_at) > new Date(item.seen_at)),
  );
  const openReceivables = receivables.filter(
    (item) => item.status === "pending" || item.status === "partial",
  );
  const overdueReceivables = openReceivables.filter(
    (item) => new Date(`${item.due_date}T23:59:59`) < now,
  );
  const overdueCents = overdueReceivables.reduce(
    (sum, item) => sum + outstanding(item),
    0,
  );
  const openCents = openReceivables.reduce(
    (sum, item) => sum + outstanding(item),
    0,
  );
  const paidThisMonth = payments.reduce(
    (sum, item) => sum + item.amount_cents,
    0,
  );
  const displayName =
    profile?.name ||
    (typeof user?.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null) ||
    user?.email?.split("@")[0] ||
    "bem-vindo";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const priorityItems = visibleDeadlines.slice(0, 2);
  const tableCases = activeCases.slice(0, 6);

  // Tres estados diferentes, nao um "vazio" so. Escritorio sem nenhum caso
  // precisa aprender a area; escritorio com a carteira em dia precisa ouvir que
  // esta em dia. Colapsar os dois em "Nenhuma prioridade encontrada" era o que
  // fazia a tela nao dizer nada.
  const hasAnyCase = allActiveCases.length > 0;
  const hasSignals = critical.length > 0 || reviews.length > 0;
  // Quantos prazos pendentes existem FORA do escopo atual (periodo, carteira,
  // area). Se houver, o vazio nao e "nada pra fazer" — e "nada aqui", e vale
  // oferecer a ampliacao em vez de deixar o usuario achar que zerou.
  const deadlinesOutOfScope = deadlines.length - visibleDeadlines.length;

  return (
    <div
      id="carteira"
      data-legal-dashboard="true"
      className="dashboard-board relative isolate mx-auto w-full max-w-[1640px] space-y-4 text-od-text sm:space-y-6"
    >
      {/* No celular esta é a barra de contexto de um app, não a capa de uma
          página: data, nome em 20px e as duas ações logo abaixo. O título de
          28px e o respiro maior só entram a partir de sm. */}
      <header className="flex flex-col gap-3 pb-1 sm:gap-5 sm:pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-medium capitalize text-od-text-3">
            <CalendarDays size={14} />
            <time dateTime={now.toISOString()}>
              {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
            </time>
          </p>
          <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-[-0.02em] text-white sm:mt-3 sm:text-od-title">
            Bom dia, <span className="text-od-text">{firstName(displayName)}.</span>
          </h1>
          {!hasAnyCase ? (
            <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-white/56 sm:mt-2 sm:text-sm sm:leading-relaxed">
              Cadastre o primeiro caso para organizar prazos, movimentações e honorários em um só lugar.
            </p>
          ) : hasSignals ? (
            <p className="mt-1.5 flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-white/56 sm:mt-2 sm:text-sm sm:leading-relaxed">
              <span>Seu escritório começa o dia com</span>
              {critical.length > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-danger-600">
                  <AlertTriangle size={14} />
                  {critical.length}{" "}
                  {critical.length === 1 ? "prazo crítico" : "prazos críticos"}
                </span>
              ) : null}
              {critical.length > 0 && reviews.length > 0 ? (
                <span className="text-od-text-3">e</span>
              ) : null}
              {reviews.length > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-od-accent-soft">
                  <FileCheck2 size={14} />
                  {reviews.length}{" "}
                  {reviews.length === 1 ? "movimentação" : "movimentações"} para
                  revisar.
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1.5 flex max-w-3xl flex-wrap items-center gap-x-1.5 text-[13px] leading-5 text-white/56 sm:mt-2 sm:text-sm sm:leading-relaxed">
              <span>
                Sua operação jurídica está em ordem. Há{" "}
                <strong className="font-semibold text-od-text">
                  {allActiveCases.length}{" "}
                  {allActiveCases.length === 1
                    ? "caso ativo na carteira"
                    : "casos ativos na carteira"}
                </strong>.
              </span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link
            href="/juridico/prazos"
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-od-border px-4 text-[13px] font-semibold text-od-text-2 hover:bg-od-surface-hover hover:text-od-text"
          >
            <CalendarDays size={15} />
            Agenda e prazos
          </Link>
          <Link
            href="/juridico/processos?novo=1"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-od-accent-hover"
          >
            <FileCheck2 size={16} />
            Novo caso
          </Link>
        </div>
      </header>

      <LegalDashboardAssistant />

      {viewerMode === "mixed" && mixedTeamTasks.length > 0 ? (
        <section className="ui-data-panel">
          <header className="ui-data-panel__header">
            <div className="ui-data-panel__copy">
              <h2 className="ui-data-panel__title">Lembretes da equipe</h2>
              <p className="ui-data-panel__description">Misturados com a sua operação, com o nome de quem é responsável.</p>
            </div>
            <Link href="/juridico/prazos" className="text-xs font-semibold text-od-text-2 hover:text-white">
              Abrir agenda
            </Link>
          </header>
          <ul>
            {mixedTeamTasks.slice(0, 6).map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3 last:border-b-0">
                <p className="min-w-0 truncate text-[13px] font-semibold text-white">{task.title}</p>
                <span className="shrink-0 rounded-[var(--radius-round)] bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-od-text-2">
                  {memberNames.get(task.assignee_id ?? task.owner_id) ?? "Equipe"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <LegalCrmPerformance
        metrics={commercialMetrics}
        canManageFinance={financeManageable}
        searchParams={filters}
      />

      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-od-text-3">Área de trabalho</p>
          <h2 className="mt-1 text-sm font-semibold text-white">Visão geral jurídica</h2>
        </div>
        {hasAnyCase ? (
          <LegalDashboardFilters period={period} portfolio={portfolio} area={area} areas={areas} />
        ) : null}
      </section>

      <section
        id="movimentacoes"
        data-legal-metric-band="true"
        data-dashboard-card
        aria-label="Panorama operacional"
        className="grid grid-cols-2 overflow-hidden panel xl:grid-cols-4"
      >
          <OperationalMetric
            icon={AlertTriangle}
            label="Prazos críticos"
            value={String(critical.length)}
            detail={`${weekDeadlines.length} nos próximos 7 dias`}
            href="/juridico/prazos"
            tone={critical.length > 0 ? "danger" : "neutral"}
          />
          <OperationalMetric
            icon={FileClock}
            label="Casos sem movimento"
            value={String(stalled.length)}
            detail="há mais de 30 dias"
            href="/juridico/processos"
            tone={stalled.length > 0 ? "warning" : "neutral"}
          />
          <OperationalMetric
            icon={RefreshCw}
            label="Movimentações para revisar"
            value={String(reviews.length)}
            detail={`${events.length} registradas hoje`}
            href="/juridico/movimentacoes"
            tone={reviews.length > 0 ? "brand" : "neutral"}
          />
          {financeVisible ? (
            <OperationalMetric
              icon={CircleDollarSign}
              label="Valores vencidos"
              value={formatBRL(overdueCents)}
              detail={`${overdueReceivables.length} cobranças abertas`}
              href="/financeiro#recebiveis"
              tone={overdueCents > 0 ? "danger" : "neutral"}
            />
          ) : (
            <OperationalMetric
              icon={FileCheck2}
              label="Carteira ativa"
              value={String(activeCases.length)}
              detail="casos sob acompanhamento"
              href="/juridico/processos"
              tone="brand"
            />
          )}
      </section>

      <section data-legal-indicators="true" data-dashboard-card className="overflow-hidden panel">
        <header className="flex items-end justify-between gap-4 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Indicadores jurídicos</h2>
            <p className="mt-1 text-xs text-od-text-3">
              Prazos, carteira e posição financeira do escritório.
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-od-text-3">Atualizado agora</span>
        </header>
        <div className="grid gap-2 pb-2 lg:grid-cols-3">
          <IndicatorGroup
            title="Prazos e movimento"
            items={[
              {
                label: "Prazos críticos",
                value: String(critical.length),
                note: `${weekDeadlines.length} nos próximos 7 dias`,
                href: "/juridico/prazos",
              },
              {
                label: "Movimentações para revisar",
                value: String(reviews.length),
                note: `${events.length} registradas hoje`,
                href: "/juridico/movimentacoes",
              },
              {
                label: "Fora do filtro atual",
                value: String(Math.max(0, deadlinesOutOfScope)),
                note: "prazos pendentes em outro recorte",
                href: "/juridico/prazos",
              },
            ]}
          />
          <IndicatorGroup
            title="Carteira"
            items={[
              {
                label: "Casos ativos",
                value: String(activeCases.length),
                note: portfolio === "mine" ? "na sua carteira" : "na carteira do escritório",
                href: "/juridico/processos",
              },
              {
                label: "Sem movimento",
                value: String(stalled.length),
                note: "há mais de 30 dias",
                href: "/juridico/processos",
              },
              {
                label: "Áreas acompanhadas",
                value: String(areas.length),
                note: area === "all" ? "todas as áreas" : area,
                href: "/juridico/processos",
              },
            ]}
          />
          {financeVisible ? (
            <IndicatorGroup
              title="Financeiro"
              items={[
                {
                  label: "Recebido neste mês",
                  value: formatBRL(paidThisMonth),
                  note: "pagamentos confirmados",
                  href: "/financeiro#recebiveis",
                },
                {
                  label: "Em aberto",
                  value: formatBRL(openCents),
                  note: `${openReceivables.length} ${openReceivables.length === 1 ? "parcela" : "parcelas"}`,
                  href: "/financeiro#recebiveis",
                },
                {
                  label: "Vencido",
                  value: formatBRL(overdueCents),
                  note: `${overdueReceivables.length} ${overdueReceivables.length === 1 ? "cobrança" : "cobranças"}`,
                  href: "/financeiro#recebiveis",
                },
              ]}
            />
          ) : (
            <IndicatorGroup
              title="Acompanhamento"
              items={[
                {
                  label: "Casos da equipe",
                  value: String(allActiveCases.length),
                  note: "em acompanhamento",
                  href: "/juridico/processos",
                },
                {
                  label: "Prazos visíveis",
                  value: String(visibleDeadlines.length),
                  note: `nos próximos ${period} dias`,
                  href: "/juridico/prazos",
                },
                {
                  label: "Movimentações hoje",
                  value: String(events.length),
                  note: "na carteira atual",
                  href: "/juridico/movimentacoes",
                },
              ]}
            />
          )}
        </div>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(21rem,.55fr)]">
          <section
            data-legal-primary-workbench="true"
            className="panel min-w-0 p-5"
          >
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">
                {hasAnyCase ? "Prioridades de hoje" : "Como o jurídico funciona"}
              </h2>
              <p className="mt-1 text-xs text-white/60">
                {!hasAnyCase
                  ? "Três passos e o painel começa a trabalhar por você"
                  : priorityItems.length === 1
                    ? "Um item exige ação do escritório"
                    : priorityItems.length > 0
                      ? `${priorityItems.length} itens exigem ação do escritório`
                      : "Carteira em dia no período selecionado"}
              </p>
            </div>
            {hasAnyCase ? (
              <Link
                href="/juridico/prazos"
                className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-od-text-2 hover:text-od-text"
              >
                Ver meu dia
              </Link>
            ) : null}
          </div>
          {priorityItems.length ? (
            <div className="divide-y divide-od-border border-t border-od-border">
              {priorityItems.map((deadline) => {
                const item = caseById.get(deadline.case_id);
                const urgent = new Date(deadline.due_at) <= todayEnd;
                const PriorityIcon = urgent ? AlertTriangle : FileSearch;
                const owner = deadline.assigned_to
                  ? memberNames.get(deadline.assigned_to) || "Sem nome"
                  : "Equipe";
                return (
                  <Link
                    key={deadline.id}
                    href={legalCaseHref(item?.slug, deadline.case_id)}
                    className="group flex min-h-[76px] items-center gap-3 py-3 hover:bg-white/[0.025]"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] ${urgent ? "bg-danger-50 text-danger-600" : "bg-od-muted-surface text-od-text-2"}`}
                    >
                      <PriorityIcon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[13px] font-semibold leading-snug">
                        {item?.title || "Caso jurídico"}
                      </strong>
                      <small className={`mt-1 block truncate text-xs font-medium ${urgent ? "text-danger-600" : "text-od-text-2"}`}>
                        {urgent ? "Crítico" : "Revisão"} · {dateTime(deadline.due_at)} · {owner}
                      </small>
                      <small className="mt-0.5 block truncate text-xs text-od-text-3">
                        {deadline.title}
                      </small>
                    </span>
                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-od-text-3 transition-colors group-hover:text-od-text"
                    />
                  </Link>
                );
              })}
            </div>
          ) : hasAnyCase ? (
            /* Carteira em dia: boa notícia dita como boa notícia. Se existem
               prazos fora do escopo atual, dizemos quantos — senão o usuário
               conclui que zerou quando só está olhando por uma fresta. */
            <div className="flex flex-col gap-3 border-t border-od-border px-3 py-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2.5 text-sm text-white/70">
                 <span className="mt-px grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-success-50 text-success-600">
                  <Check size={15} />
                </span>
                <span>
                  Nada vence {period === "7" ? "nos próximos 7 dias" : "nos próximos 30 dias"}
                  {portfolio === "mine" ? " na sua carteira" : " na carteira do escritório"}
                  {area === "all" ? "" : ` em ${area}`}.
                  {deadlinesOutOfScope > 0 ? (
                    <span className="mt-1 block text-od-text-3">
                      {deadlinesOutOfScope}{" "}
                      {deadlinesOutOfScope === 1
                        ? "prazo pendente fica fora deste filtro"
                        : "prazos pendentes ficam fora deste filtro"}
                      .
                    </span>
                  ) : null}
                </span>
              </p>
              <Link
                href="/juridico/prazos"
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-od-border px-4 text-[13px] font-semibold text-od-text-2 hover:border-od-border-hover hover:bg-od-surface-hover hover:text-od-text"
              >
                Ver todos os prazos
                <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : (
            /* Dia um: ensina a área em vez de dizer "nada aqui". Numerado
               porque é uma sequência de verdade — cada passo destrava o
               seguinte. */
              <div className="grid divide-y divide-od-border border-y border-od-border xl:grid-cols-3 xl:divide-x xl:divide-y-0">
              {[
                {
                  step: "1",
                  title: "Cadastre um caso",
                  body: "Cliente, área, responsável e o próximo prazo. É o que alimenta todo o resto do painel.",
                  href: "/juridico/processos",
                  action: "Novo caso",
                  Icon: FileCheck2,
                },
                {
                  step: "2",
                  title: "Puxe o processo do DataJud",
                  body: "Pelo número do processo, o OtimizIA importa as partes e o histórico em vez de você digitar.",
                  href: "/juridico/processos#datajud",
                  action: "Consultar",
                  Icon: FileSearch,
                },
                {
                  step: "3",
                  title: "Deixe o Tim vigiar os prazos",
                  body: "Movimentação nova e prazo chegando aparecem aqui, e o assistente avisa antes de virar urgência.",
                  href: "/juridico/prazos",
                  action: "Ver prazos",
                  Icon: FileClock,
                },
              ].map(({ step, title, body, href, action, Icon }) => (
                <div
                  key={step}
                   className="flex flex-col gap-3 p-4"
                >
                  <div className="flex items-center gap-2">
                     <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-od-accent-tint text-[13px] font-bold text-od-accent-soft">
                      {step}
                    </span>
                    <Icon size={14} className="shrink-0 text-od-text-3" />
                  </div>
                  <div>
                    <strong className="text-[13px] font-semibold text-white">{title}</strong>
                    <p className="mt-1 text-xs leading-5 text-white/55">{body}</p>
                  </div>
                  <Link
                    href={href}
                    className={`mt-auto inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-4 text-[13px] font-semibold transition-colors ${
                      step === "1"
                        ? "bg-od-accent text-white hover:bg-od-accent-hover"
                        : "border border-od-border text-od-text-2 hover:border-od-border-hover hover:bg-od-surface-hover hover:text-od-text"
                    }`}
                  >
                    {action}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
          </section>
          {financeVisible ? (
            <FinanceSummary
              paid={paidThisMonth}
              overdue={overdueCents}
              open={openCents}
              count={openReceivables.length}
            />
          ) : (
             <section className="od-band self-start p-5">
              <h2 className="text-base font-semibold">Carteira do escritório</h2>
              <p className="mt-2 text-sm text-od-text-2">
                {activeCases.length} casos ativos sob acompanhamento no filtro atual.
              </p>
              <Link
                href="/juridico/processos"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-od-border px-4 text-[13px] font-semibold text-od-text-2 hover:border-od-border-hover hover:bg-od-surface-hover hover:text-od-text"
              >
                Abrir carteira
                <ArrowUpRight size={14} />
              </Link>
            </section>
          )}
        </section>

        <CasesTable
          cases={tableCases}
          total={activeCases.length}
          contacts={contactNames}
          members={memberNames}
        />

        <PortfolioChart cases={cases} />
    </div>
  );
}

function IndicatorGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; note: string; href: string }>;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <h3 className="text-xs font-semibold text-white/68">{title}</h3>
      <div className="mt-3 space-y-1">
        {items.map((item) => (
          <Link
            href={item.href}
            key={item.label}
            aria-label={`Abrir ${item.label.toLowerCase()}`}
            className="group grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 rounded-[var(--radius-control)] px-2 py-3 transition-colors hover:bg-white/[0.02] focus-visible:z-10"
          >
            <span className="text-xs text-od-text-3 transition-colors group-hover:text-white/64">
              {item.label}
            </span>
            <span
              className="max-w-44 truncate text-right text-sm font-semibold text-white/82 group-hover:text-od-text"
              title={item.value}
            >
              {item.value}
            </span>
            <span className="col-span-2 text-xs leading-relaxed text-od-text-3">
              {item.note}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function OperationalMetric({
  icon: Icon,
  label,
  value,
  detail,
  href,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "brand" | "neutral";
}) {
  const color =
    tone === "danger"
      ? "text-danger-600"
      : tone === "warning"
        ? "text-warning-700"
        : tone === "brand"
          ? "text-od-accent-soft"
          : "text-od-text-3";
  return (
    <Link
      href={href}
      aria-label={`Abrir ${label.toLowerCase()}`}
      className="group flex min-h-24 items-start gap-3 border-b border-r border-white/[0.08] px-4 py-4 transition-colors hover:bg-white/[0.025] focus-visible:z-10 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 xl:min-h-28 xl:border-b-0 xl:border-r xl:even:border-r xl:last:border-r-0 xl:px-5"
    >
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-white/[0.06] ${color}`}>
        <Icon size={16} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-od-text-3">{label}</p>
        <p className="mt-2 truncate text-2xl font-bold tracking-[-0.03em] text-white">
          {value}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-od-text-3 transition-colors group-hover:text-white/52">
          {detail}
        </p>
      </div>
    </Link>
  );
}

function PortfolioChart({ cases }: { cases: LegalCase[] }) {
  const now = new Date();
  const months = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const opened = cases.filter((item) => {
      const created = new Date(item.created_at);
      return created >= date && created < next;
    }).length;
    const closed = cases.filter(
      (item) =>
        item.status === "closed" &&
        (() => {
          const updated = new Date(item.updated_at);
          return updated >= date && updated < next;
        })(),
    ).length;
    return {
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(date)
        .replace(".", ""),
      opened,
      closed,
    };
  });
  const max = Math.max(
    1,
    ...months.flatMap((item) => [item.opened, item.closed]),
  );
  const openedPoints = months
    .map(
      (item, index) => `${index * (100 / 6)},${100 - (item.opened / max) * 84}`,
    )
    .join(" ");
  const closedPoints = months
    .map(
      (item, index) => `${index * (100 / 6)},${100 - (item.closed / max) * 84}`,
    )
    .join(" ");
  const delta = months[6].opened - months[6].closed;
  return (
    <section className="panel h-full p-5">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Fluxo da carteira</h2>
          <p className="mt-1 text-xs text-white/60">
            Novos casos e encerramentos nos últimos 7 meses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-od-text-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-od-accent" />
            Abertos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-od-text-3" />
            Encerrados
          </span>
          <strong className="font-semibold text-od-text">
            {delta >= 0 ? "+" : ""}{delta} no mês
          </strong>
        </div>
      </div>
      <div className="h-56 w-full sm:h-64">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          aria-label="Evolução de casos abertos e encerrados"
        >
          <g stroke="rgba(255,255,255,.07)" strokeWidth=".35">
            {[20, 40, 60, 80, 100].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} />
            ))}
          </g>
          <polyline
            aria-label="Casos abertos"
            points={openedPoints}
            fill="none"
            stroke="var(--od-data-accent)"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            aria-label="Casos encerrados"
            points={closedPoints}
            fill="none"
            stroke="var(--od-text-3)"
            strokeWidth="1.15"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-xs text-white/65">
        {months.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </section>
  );
}

function FinanceSummary({
  paid,
  overdue,
  open,
  count,
}: {
  paid: number;
  overdue: number;
  open: number;
  count: number;
}) {
  return (
    <section className="panel self-start p-5">
      <div className="flex items-start justify-between gap-4 border-b border-od-border pb-4">
        <div>
          <h2 className="text-sm font-semibold">Recebíveis</h2>
          <p className="mt-1 text-xs text-od-text-2">
            Posição financeira do escritório
          </p>
        </div>
        <Link
          href="/financeiro#recebiveis"
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-xs font-semibold text-od-text-2 hover:text-od-text"
        >
          Ver recebíveis
        </Link>
      </div>
      <dl className="divide-y divide-od-border pt-2">
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-xs text-od-text-3">Recebido neste mês</dt>
          <dd className="text-sm font-semibold text-od-text">{formatBRL(paid)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-xs text-od-text-3">Em aberto</dt>
          <dd className="text-sm font-semibold text-od-text">{formatBRL(open)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <dt className="text-xs text-od-text-3">Vencido</dt>
          <dd className={`text-sm font-semibold ${overdue > 0 ? "text-danger-600" : "text-od-text"}`}>
            {formatBRL(overdue)}
          </dd>
        </div>
      </dl>
      <p className="border-t border-od-border pt-4 text-xs text-od-text-3">
        {count} {count === 1 ? "parcela aberta" : "parcelas abertas"} no total
      </p>
    </section>
  );
}

function CasesTable({
  cases,
  total,
  contacts,
  members,
}: {
  cases: LegalCase[];
  total: number;
  contacts: Map<string, string>;
  members: Map<string, string>;
}) {
  const urgentLimit = new Date();
  urgentLimit.setDate(urgentLimit.getDate() + 7);
  return (
    <section className="panel overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between border-b border-od-border pb-4">
        <div>
          <h2 className="text-base font-semibold">Casos em acompanhamento</h2>
          <p className="mt-1 text-xs text-white/65">
            Ordenados pelo próximo compromisso
          </p>
        </div>
        <Link
          href="/juridico/processos"
          className="flex min-h-11 items-center gap-1 text-xs font-semibold text-od-text-2 hover:text-od-text"
        >
          Ver {total} casos
          <ArrowUpRight size={13} />
        </Link>
      </div>
      <div className="hidden grid-cols-[1.4fr_.75fr_1fr_.9fr_1fr_28px] items-center gap-3 pb-2 text-xs font-semibold uppercase tracking-wide text-white/65 xl:grid">
        <span>Cliente / caso</span>
        <span>Área</span>
        <span>Responsável</span>
        <span>Situação</span>
        <span className="text-right">Próximo prazo</span>
        <span />
      </div>
      {cases.length ? (
        cases.map((item) => {
          const owner = item.responsible_id
            ? members.get(item.responsible_id) || "Sem nome"
            : "Equipe";
          const client = item.contact_id
            ? contacts.get(item.contact_id) || item.title
            : item.title;
          const urgent = Boolean(
            item.next_deadline_at &&
            new Date(item.next_deadline_at) <= urgentLimit,
          );
          return (
            <Link
              key={item.id}
              href={legalCaseHref(item.slug, item.id)}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-white/[0.06] py-3 hover:bg-white/[0.02] xl:grid-cols-[1.4fr_.75fr_1fr_.9fr_1fr_28px]"
            >
              <span className="min-w-0">
                <strong className="block truncate text-[13px] font-semibold">
                  {client}
                </strong>
                <small className="mt-1 block truncate font-mono text-xs text-od-text-3">
                  {item.case_number || item.title}
                </small>
                <small className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-od-text-3 xl:hidden">
                  <span>{item.area || "Não informada"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{owner}</span>
                  <span aria-hidden="true">·</span>
                  <span>{CASE_STATUS[item.status]}</span>
                </small>
              </span>
              <span className="hidden text-xs text-od-text-2 xl:block">
                {item.area || "Não informada"}
              </span>
              <span className="hidden items-center gap-1.5 text-xs text-od-text-2 xl:flex">
                <span className="grid size-5 place-items-center rounded-full bg-white/[0.08] text-xs">
                  {owner.charAt(0)}
                </span>
                {owner}
              </span>
              <span className="hidden w-fit rounded-[var(--radius-round)] bg-od-muted-surface px-2 py-0.5 text-xs font-semibold text-od-text-2 xl:inline-flex">
                {CASE_STATUS[item.status]}
              </span>
              <span
                className={`text-right text-xs ${urgent ? "font-semibold text-danger-600" : "text-od-text-2"}`}
              >
                <span className="block text-[10px] font-medium uppercase tracking-wide text-od-text-3 xl:hidden">Próximo prazo</span>
                {shortDate(item.next_deadline_at)}
              </span>
              <ArrowUpRight
                size={13}
                className="hidden text-od-text-3 xl:block"
              />
            </Link>
          );
        })
      ) : (
        <p className="py-8 text-center text-sm text-od-text-3">
          Nenhum caso ativo. Abra o primeiro caso para iniciar a carteira.
        </p>
      )}
    </section>
  );
}
