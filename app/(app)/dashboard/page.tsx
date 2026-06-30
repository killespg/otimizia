import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Deal, Task } from "@/lib/supabase/types";
import { formatBRL, formatDateTime } from "@/lib/format";
import { IconCheckCircle, IconArrowRight } from "../icons";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: deals }, { data: tasks }, { count: contactsCount }] =
    await Promise.all([
      supabase.from("deals").select("*"),
      supabase.from("tasks").select("*").eq("done", false),
      supabase.from("contacts").select("*", { count: "exact", head: true }),
    ]);

  const allDeals = (deals ?? []) as Deal[];
  const openTasks = (tasks ?? []) as Task[];
  const contacts = contactsCount ?? 0;

  const openDeals = allDeals.filter(
    (d) => d.stage !== "ganho" && d.stage !== "perdido"
  );
  const inNegotiationValue = openDeals.reduce((s, d) => s + d.value_cents, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonThisMonth = allDeals.filter(
    (d) =>
      d.stage === "ganho" && d.closed_at && new Date(d.closed_at) >= monthStart
  );
  const wonValue = wonThisMonth.reduce((s, d) => s + d.value_cents, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const overdue = openTasks
    .filter((t) => t.due_at && new Date(t.due_at) < now)
    .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1));
  const todayTasks = openTasks
    .filter(
      (t) =>
        t.due_at && new Date(t.due_at) >= now && new Date(t.due_at) <= endOfToday
    )
    .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1));

  const isFirstRun =
    contacts === 0 && allDeals.length === 0 && openTasks.length === 0;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = `${now.toLocaleDateString("pt-BR", {
    weekday: "long",
  })} · ${now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`;

  const metrics = [
    { label: "Contatos", value: String(contacts), href: "/contacts" },
    { label: "Vendas abertas", value: String(openDeals.length), href: "/pipeline" },
    { label: "Valor em aberto", value: formatBRL(inNegotiationValue), href: "/pipeline" },
    { label: "Recebido no mês", value: formatBRL(wonValue), href: "/pipeline" },
  ];

  const pendingCount = overdue.length + todayTasks.length;

  return (
    <div>
      {/* Cabeçalho */}
      <header className="enter">
        <p className="eyebrow">{dateLabel}</p>
        <h1 className="font-display mt-3 text-[clamp(2rem,6vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-ink">
          {greeting}.
        </h1>
        <p className="mt-2 max-w-md text-[15px] text-ink-soft">
          {isFirstRun
            ? "Vamos deixar tudo pronto para você lembrar de cada cliente."
            : "Comece pelos clientes que precisam de resposta hoje."}
        </p>
      </header>

      {isFirstRun ? (
        <FirstRun />
      ) : (
        <>
          {/* Retornos do dia: a peça principal do painel. */}
          <div className="mt-8">
            <SectionLabel>Retornos</SectionLabel>
            <section className="border border-t-2 border-line border-t-brand-700 bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
                  Pendentes
                </span>
                <span className="font-mono text-[12px] tabular-nums text-ink-muted">
                  {String(pendingCount).padStart(2, "0")}
                </span>
              </div>
              <Link
                href="/tasks"
                className="nav-item group hidden items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-brand-700 hover:text-brand-800 sm:flex"
              >
                Ver todas
                <IconArrowRight className="arrow-nudge h-3.5 w-3.5 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {pendingCount === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <IconCheckCircle className="h-8 w-8 text-brand-600" />
                <p className="mt-3 font-display text-lg font-medium text-ink">
                  Tudo em dia por aqui.
                </p>
                <p className="mt-1 max-w-xs text-sm text-ink-soft">
                  Nenhum cliente para chamar hoje. Que tal adiantar o próximo?
                </p>
              </div>
            ) : (
              <div className="px-4 py-5 sm:px-5">
                <div className="space-y-6">
                  {overdue.length > 0 && (
                    <FollowupGroup
                      tone="danger"
                      title="Atrasadas"
                      tasks={overdue}
                    />
                  )}
                  {todayTasks.length > 0 && (
                    <FollowupGroup tone="today" title="Para hoje" tasks={todayTasks} />
                  )}
                </div>
                <Link
                  href="/tasks"
                  className="mt-5 flex items-center justify-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-brand-700 sm:hidden"
                >
                  Ver todas
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
            </section>
          </div>

          {/* INDICADORES — grade construída por fios, não cards flutuantes. */}
          <div className="mt-10">
            <SectionLabel>Indicadores</SectionLabel>
            <div className="enter border-l border-t border-line">
              <div className="grid grid-cols-2 lg:grid-cols-4">
                {metrics.map((m) => (
                  <Link
                    key={m.label}
                    href={m.href}
                    className="row-link group border-b border-r border-line p-4 hover:bg-surface-2/60 sm:p-5"
                  >
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                      {m.label}
                    </p>
                    <p className="font-mono text-safe mt-3 text-xl font-semibold leading-tight tabular-nums text-ink sm:text-2xl">
                      {m.value}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ATALHOS */}
          <div className="mt-10">
            <SectionLabel>Atalhos</SectionLabel>
            <div className="enter grid gap-3 sm:grid-cols-3">
              <QuickAction href="/contacts" title="Novo contato" desc="Registre quem você atendeu" />
              <QuickAction href="/pipeline" title="Nova venda" desc="Acompanhe o próximo passo" />
              <QuickAction href="/tasks" title="Criar lembrete" desc="Lembre de chamar depois" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="eyebrow !text-ink">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function FollowupGroup({
  tone,
  title,
  tasks,
}: {
  tone: "danger" | "today";
  title: string;
  tasks: Task[];
}) {
  const isDanger = tone === "danger";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={isDanger ? "tag tag-danger" : "tag tag-brand"}>
          {title}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-ink-muted">
          {String(tasks.length).padStart(2, "0")}
        </span>
      </div>
      <ul
        className={
          "rounded-sm border border-line " +
          (isDanger ? "bg-danger-50/35" : "bg-brand-50/35")
        }
      >
        {tasks.slice(0, 4).map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0"
          >
            <span className="clip-2 min-w-0 flex-1 text-safe text-[15px] text-ink">
              {t.title}
            </span>
            <span
              className={
                "shrink-0 font-mono text-[12px] tabular-nums " +
                (isDanger ? "text-danger-700" : "text-ink-muted")
              }
            >
              {formatDateTime(t.due_at)}
            </span>
          </li>
        ))}
        {tasks.length > 4 && (
          <li className="px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            + {tasks.length - 4} {tasks.length - 4 === 1 ? "outra" : "outras"}
          </li>
        )}
      </ul>
    </div>
  );
}

function QuickAction({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="card lift group flex items-center justify-between gap-3 px-4 py-4"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        <span className="clip-2 block text-safe text-[13px] text-ink-muted">
          {desc}
        </span>
      </span>
      <span className="arrow-nudge font-mono text-base text-ink-muted group-hover:translate-x-0.5 group-hover:text-brand-700">
        →
      </span>
    </Link>
  );
}

function FirstRun() {
  const steps = [
    {
      n: "01",
      title: "Cadastre um contato",
      desc: "Comece com quem você está atendendo agora.",
      href: "/contacts",
      cta: "Adicionar contato",
    },
    {
      n: "02",
      title: "Crie uma venda",
      desc: "Anote o que está sendo vendido e o próximo passo.",
      href: "/pipeline",
      cta: "Ver vendas",
    },
    {
      n: "03",
      title: "Crie um lembrete",
      desc: "Escolha quando chamar o cliente de novo.",
      href: "/tasks",
      cta: "Criar lembrete",
    },
  ];
  return (
    <section className="mt-8 border border-t-2 border-line border-t-brand-700 bg-surface">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
          Primeiros passos
        </p>
        <p className="font-display mt-2 text-xl font-medium text-ink sm:text-2xl">
          Três passos para sair da planilha.
        </p>
      </div>
      <ol className="grid border-l border-line sm:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="flex flex-col border-b border-r border-line p-5 sm:border-b-0"
          >
            <span className="font-mono text-2xl font-medium tabular-nums text-brand-700">
              {s.n}
            </span>
            <h3 className="mt-3 text-[15px] font-semibold text-ink">{s.title}</h3>
            <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-soft">
              {s.desc}
            </p>
            <Link
              href={s.href}
              className="nav-item group mt-4 inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-brand-700 hover:text-brand-800"
            >
              {s.cta}
              <IconArrowRight className="arrow-nudge h-3.5 w-3.5 group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
