import Link from "next/link";
import { AgentPanel } from "@/components/AgentPanel";
import { PendingButton } from "@/components/PendingButton";
import { createClient } from "@/lib/supabase/server";
import {
  DEAL_STAGES,
  type Contact,
  type Deal,
  type DealStage,
  type Task,
} from "@/lib/supabase/types";
import { formatBRL, formatDate } from "@/lib/format";
import { createTask } from "../actions";
import { ReminderModal as ReminderModalClient } from "./ReminderModal";
import {
  IconArrowRight,
  IconBell,
  IconCheckCircle,
  IconColumns,
  IconMessage,
  IconPhone,
  IconSearch,
  IconUsers,
  IconWallet,
} from "../icons";

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
    { data: deals },
    { data: tasks },
    { data: contactOptions },
    { count: contactsCount },
    { count: conversationsToday },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("deals").select("*").order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("done", false)
      .order("due_at", { ascending: true }),
    supabase
      .from("contacts")
      .select("id,name,company")
      .order("name", { ascending: true }),
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),
  ]);

  const allDeals = (deals ?? []) as Deal[];
  const openTasks = (tasks ?? []) as Task[];
  const contacts = contactsCount ?? 0;
  const contactsForForms = (contactOptions ?? []) as ContactOption[];
  const contactMap = new Map(contactsForForms.map((contact) => [contact.id, contact]));

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

  const metrics = [
    {
      label: "Valor aberto",
      value: formatBRL(openValue),
      compare: "vs mês anterior",
      delta: "12,5%",
      tone: "purple" as const,
      icon: IconWallet,
    },
    {
      label: "Clientes para chamar",
      value: String(overdue.length + todayTasks.length || openTasks.length),
      compare: "vs semana anterior",
      delta: "8,1%",
      tone: "pink" as const,
      icon: IconPhone,
    },
    {
      label: "Negócios em andamento",
      value: String(openDeals.length),
      compare: "vs mês anterior",
      delta: "15,3%",
      tone: "purple" as const,
      icon: IconColumns,
    },
    {
      label: "Conversas hoje",
      value: String(conversationsToday ?? 0),
      compare: "vs ontem",
      delta: "6,7%",
      tone: "pink" as const,
      icon: IconMessage,
    },
  ];

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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] sm:w-[430px]">
            <IconSearch className="h-5 w-5 shrink-0 text-ink-muted" />
            <span className="sr-only">Buscar</span>
            <input
              type="search"
              placeholder="Buscar contatos, empresas..."
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-muted"
            />
            <kbd className="hidden rounded-md bg-surface-2 px-2 py-1 text-[11px] font-bold text-ink-muted sm:inline-flex">
              Ctrl + K
            </kbd>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="nav-item relative grid h-11 w-11 place-items-center rounded-lg border border-line bg-white text-ink-soft shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)] hover:text-brand-700"
              aria-label="Notificacoes"
            >
              <IconBell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[11px] font-black text-white">
                {Math.min(overdue.length, 9)}
              </span>
            </button>
            <div className="relative grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(135deg,#6d28d9,#3b16c6)] text-sm font-black text-white shadow-[0_16px_36px_-18px_rgba(92,34,232,0.8)]">
              {initials(displayName)}
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-success-500" />
            </div>
          </div>
        </div>
      </header>

      <section className="enter grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(23rem,0.72fr)]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <RevenueChart
            openValue={openValue}
            wonValue={wonValue}
            contacts={contactsForForms}
            defaultDueAt={defaultDateTimeValue(now)}
          />
          <DealsTable deals={openDeals} contactMap={contactMap} />
        </div>

        <aside className="min-w-0 space-y-4 sm:space-y-5">
          <TaskQueue tasks={taskQueue} overdue={overdue} now={now} />
          <AgentPanel />
        </aside>
      </section>

      {isFirstRun && <FirstRunPanel />}
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
  compare: string;
  delta: string;
  tone: "purple" | "pink";
  icon: (props: { className?: string }) => JSX.Element;
}) {
  const toneClass =
    tone === "pink"
      ? {
          icon: "bg-pink-100 text-pink-600",
          badge: "bg-pink-100 text-pink-700",
          stroke: "#ff6b9c",
          fill: "rgba(255,107,156,0.18)",
        }
      : {
          icon: "bg-brand-100 text-brand-700",
          badge: "bg-brand-100 text-brand-800",
          stroke: "#7b3ff2",
          fill: "rgba(123,63,242,0.18)",
        };

  return (
    <article className="enter relative min-h-[132px] overflow-hidden rounded-lg border border-line bg-white p-4 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.75)] sm:min-h-[150px] sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-soft sm:text-sm">{label}</p>
          <p className="text-safe mt-2 text-xl font-black leading-none tracking-[-0.03em] text-ink sm:mt-3 sm:text-2xl">
            {value}
          </p>
        </div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full sm:h-11 sm:w-11 ${toneClass.icon}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5 text-xs font-bold sm:mt-4 sm:gap-2">
        <span className={`rounded-md px-2 py-1 ${toneClass.badge}`}>+ {delta}</span>
        <span className="text-ink-muted">{compare}</span>
      </div>

      <Sparkline stroke={toneClass.stroke} fill={toneClass.fill} />
    </article>
  );
}

function Sparkline({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <svg
      viewBox="0 0 320 70"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full"
      aria-hidden="true"
    >
      <path
        d="M0 55 C35 57 48 50 72 50 C102 50 118 38 145 43 C170 48 184 41 204 46 C230 52 238 31 268 34 C292 36 300 22 320 25 L320 70 L0 70 Z"
        fill={fill}
      />
      <path
        d="M0 55 C35 57 48 50 72 50 C102 50 118 38 145 43 C170 48 184 41 204 46 C230 52 238 31 268 34 C292 36 300 22 320 25"
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function RevenueChart({
  openValue,
  wonValue,
  contacts,
  defaultDueAt,
}: {
  openValue: number;
  wonValue: number;
  contacts: ContactOption[];
  defaultDueAt: string;
}) {
  return (
    <section
      id="valor"
      className="enter relative overflow-hidden rounded-lg border border-line bg-white p-4 shadow-[0_18px_44px_-34px_rgba(21,19,46,0.72)] sm:min-h-[382px] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Vendas em aberto (R$)
          </h2>
          <p className="mt-1 text-xs font-medium text-ink-muted sm:text-sm">
            Total aberto: {formatBRL(openValue)} - recebido no mês:{" "}
            {formatBRL(wonValue)}
          </p>
        </div>
        <button
          type="button"
          className="nav-item rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-ink-soft shadow-[0_10px_28px_-24px_rgba(15,23,42,0.55)] hover:text-brand-700"
        >
          Este mês
        </button>
      </div>

      <div className="mt-4 h-[190px] overflow-hidden rounded-lg bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] sm:mt-5 sm:h-[280px]">
        <svg
          viewBox="0 0 820 300"
          className="h-full w-full"
          role="img"
          aria-label="Grafico visual das vendas em aberto"
        >
          <defs>
            <linearGradient id="dashboardArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7b3ff2" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#7b3ff2" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[52, 98, 144, 190, 236].map((y) => (
            <line
              key={y}
              x1="64"
              x2="790"
              y1={y}
              y2={y}
              stroke="#dbe2ef"
              strokeDasharray="5 7"
            />
          ))}
          <g className="hidden sm:block">
            {["300k", "250k", "200k", "150k", "100k", "50k"].map((label, index) => (
              <text
                key={label}
                x="20"
                y={54 + index * 45}
                fill="#60708f"
                fontSize="13"
                fontWeight="700"
              >
                {label}
              </text>
            ))}
          </g>
          <path
            d="M64 236 C86 244 92 219 114 198 C143 170 166 181 190 177 C222 172 230 202 260 197 C294 192 296 145 334 146 C374 146 374 186 412 179 C446 173 453 123 492 123 C527 123 534 166 564 151 C592 137 590 101 632 106 C664 110 672 140 701 127 C730 114 738 91 768 95 C786 96 789 69 806 63 L806 300 L64 300 Z"
            fill="url(#dashboardArea)"
          />
          <path
            d="M64 236 C86 244 92 219 114 198 C143 170 166 181 190 177 C222 172 230 202 260 197 C294 192 296 145 334 146 C374 146 374 186 412 179 C446 173 453 123 492 123 C527 123 534 166 564 151 C592 137 590 101 632 106 C664 110 672 140 701 127 C730 114 738 91 768 95 C786 96 789 69 806 63"
            fill="none"
            stroke="#6d28d9"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <g className="hidden sm:block">
            {["01 Mai", "06 Mai", "11 Mai", "16 Mai", "21 Mai", "26 Mai", "31 Mai"].map(
              (label, index) => (
                <text
                  key={label}
                  x={70 + index * 112}
                  y="286"
                  fill="#60708f"
                  fontSize="13"
                  fontWeight="700"
                >
                  {label}
                </text>
              )
            )}
          </g>
        </svg>
      </div>

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
}: {
  deals: Deal[];
  contactMap: Map<string, ContactOption>;
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

      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
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
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm font-medium text-ink-muted">
                  Nenhum negócio aberto ainda.
                </td>
              </tr>
            ) : (
              recent.map((deal) => {
                const stage = stageMeta(deal.stage);
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
              })
            )}
          </tbody>
        </table>
      </div>
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

function FirstRunPanel() {
  const steps = [
    {
      title: "Cadastre um contato",
      desc: "Comece com quem você está atendendo agora.",
      href: "/contacts",
      icon: IconUsers,
    },
    {
      title: "Crie uma venda",
      desc: "Anote valor, etapa e próximo passo.",
      href: "/pipeline",
      icon: IconColumns,
    },
    {
      title: "Crie um lembrete",
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

function stageMeta(stage: DealStage) {
  const label = DEAL_STAGES.find((item) => item.key === stage)?.label ?? "Etapa";
  const map: Record<DealStage, string> = {
    novo: "bg-blue-50 text-blue-700",
    em_contato: "bg-brand-50 text-brand-700",
    negociacao: "bg-pink-50 text-pink-700",
    ganho: "bg-success-50 text-success-700",
    perdido: "bg-danger-50 text-danger-700",
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
      className: "bg-pink-100 text-pink-700",
    };
  }
  if (index === 1) {
    return {
      label: "Média",
      className: "bg-orange-100 text-orange-700",
    };
  }
  return {
    label: "Baixa",
    className: "bg-blue-50 text-blue-700",
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
