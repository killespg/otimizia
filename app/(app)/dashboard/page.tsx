import Link from "next/link";
import { AgentPanel } from "@/components/AgentPanel";
import { PendingButton } from "@/components/PendingButton";
import { getProfessionPreset, type MetricKey, type ProfessionPreset } from "@/lib/professions";
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
import { createTask } from "../actions";
import { ReminderModal as ReminderModalClient } from "./ReminderModal";
import { RevenueLineChart } from "./RevenueLineChart";
import {
  IconArrowRight,
  IconBell,
  IconCheckCircle,
  IconColumns,
  IconMessage,
  IconSearch,
  IconUsers,
  IconWallet,
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
    supabase.from("profiles").select("profession_type").maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type
  );
  const [
    { data: deals },
    { data: tasks },
    { data: contactOptions },
    { count: contactsCount },
    { count: conversationsToday },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("*")
      .eq("workspace_key", workspaceKey)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_key", workspaceKey)
      .eq("done", false)
      .order("due_at", { ascending: true }),
    supabase
      .from("contacts")
      .select("id,name,company")
      .eq("workspace_key", workspaceKey)
      .order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_key", workspaceKey),
    supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("workspace_key", workspaceKey)
      .gte("created_at", startOfToday.toISOString()),
  ]);

  const allDeals = (deals ?? []) as Deal[];
  const openTasks = (tasks ?? []) as Task[];
  const contacts = contactsCount ?? 0;
  const contactsForForms = (contactOptions ?? []) as ContactOption[];
  const contactMap = new Map(contactsForForms.map((contact) => [contact.id, contact]));
  const preset = getProfessionPreset(workspaceKey);

  const displayName =
    typeof user?.user_metadata?.name === "string" && user.user_metadata.name
      ? firstName(user.user_metadata.name)
      : firstName(user?.email?.split("@")[0] ?? "João");

  const openDeals = allDeals.filter(
    (deal) => deal.stage !== "ganho" && deal.stage !== "perdido"
  );
  const openValue = openDeals.reduce((sum, deal) => sum + deal.value_cents, 0);
  const wonThisMonth = allDeals.filter(
    (deal) =>
      deal.stage === "ganho" &&
      deal.closed_at &&
      new Date(deal.closed_at) >= monthStart
  );
  const wonValue = wonThisMonth.reduce((sum, deal) => sum + deal.value_cents, 0);
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
      dailyWonCents[dayIndex] += deal.value_cents;
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

  const metrics = preset.metrics.map((metric, index) => ({
    label: metric.label,
    value: metricValues[metric.key],
    tone: index % 2 === 0 ? ("purple" as const) : ("pink" as const),
    icon: METRIC_ICONS[metric.key],
  }));

  const isFirstRun =
    contacts === 0 && allDeals.length === 0 && openTasks.length === 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[22px] font-black tracking-[-0.02em] text-ink sm:text-2xl">
            Olá, {displayName}!
          </h1>
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

      <section className="enter grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(23rem,0.72fr)]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <RevenueChart
            openValue={openValue}
            wonValue={wonValue}
            series={wonSeries}
            contacts={contactsForForms}
            defaultDueAt={defaultDateTimeValue(now)}
            preset={preset}
          />
          <DealsTable deals={openDeals} contactMap={contactMap} preset={preset} />
        </div>

        <aside className="min-w-0 space-y-4 sm:space-y-5">
          <TaskQueue tasks={taskQueue} overdue={overdue} now={now} />
          <AgentPanel />
        </aside>
      </section>

      {isFirstRun && <FirstRunPanel preset={preset} />}
    </div>
  );
}

function MetricCard({
  label,
  value,
  compare,
  delta,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  compare?: string;
  delta?: string;
  tone: "purple" | "pink";
  icon: (props: { className?: string }) => JSX.Element;
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
    <article className="enter relative min-h-[96px] overflow-hidden rounded-lg border border-line bg-white p-3 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.75)] sm:min-h-[150px] sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-soft sm:text-sm">{label}</p>
          <p className="text-safe mt-2 text-xl font-black leading-none tracking-[-0.03em] text-ink sm:mt-3 sm:text-2xl">
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
          {compare && <span className="text-ink-muted">{compare}</span>}
        </div>
      )}
    </article>
  );
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
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
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
        <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
          Negócios recentes
        </h2>
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
                      {formatBRL(deal.value_cents)}
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
                      <td className="px-3 py-3">{formatBRL(deal.value_cents)}</td>
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
        <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
          Fila de tarefas
        </h2>
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

function FirstRunPanel({ preset }: { preset: ProfessionPreset }) {
  const steps = [
    {
      title: preset.firstSteps[0],
      desc: "Comece com quem você está atendendo agora.",
      href: "/contacts",
      icon: IconUsers,
    },
    {
      title: preset.firstSteps[1],
      desc: "Anote valor, etapa e próximo passo.",
      href: "/pipeline",
      icon: IconColumns,
    },
    {
      title: preset.firstSteps[2],
      desc: "Escolha quando chamar o cliente de novo.",
      href: "/tasks",
      icon: IconBell,
    },
  ];

  return (
    <section className="enter rounded-lg border border-brand-200 bg-brand-50 p-5">
      <p className="text-sm font-black text-brand-800">Primeiros passos</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
        Três passos para o painel ganhar vida.
      </h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              className="row-link rounded-lg border border-brand-200 bg-white p-4 hover:border-brand-400"
            >
              <Icon className="h-6 w-6 text-brand-700" />
              <p className="mt-4 text-sm font-black text-ink">{step.title}</p>
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
    negociacao: "bg-[#fff7e6] text-[#8a6500] dark:bg-[#3b2b0a] dark:text-[#f8d278]",
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
      className: "bg-[#fff7e6] text-[#8a6500] dark:bg-[#3b2b0a] dark:text-[#f8d278]",
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
