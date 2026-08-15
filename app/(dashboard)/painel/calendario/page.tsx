import Link from "next/link";
import { PendingButton } from "@/components/ui/PendingButton";
import { buildMonthCells, monthParam, parseMonthParam } from "@/lib/utils/calendar-grid";
import { canManageLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, LegalDeadline, Task } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { formatDateTime } from "@/lib/utils/format";
import { createTask } from "../actions";
import { completeLegalDeadline } from "../juridico/actions";
import { ContactField } from "../ContactField";
import { IconArrowRight, IconBell, IconCalendar, IconCheckCircle, IconClock, IconPlus } from "../icons";
import TaskItem from "../tarefas/TaskItem";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-surface-2 text-ink-muted",
  normal: "bg-brand-50 text-brand-700",
  high: "bg-warning-50 text-warning-700",
  critical: "bg-danger-50 text-danger-700",
};

type CalendarEntry =
  | { kind: "task"; date: Date; task: Task }
  | { kind: "deadline"; date: Date; deadline: LegalDeadline };

export default async function CalendarPage(props: { searchParams: Promise<{ month?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const isSeller = workspaceKey === "autonomous_seller";
  const isRealEstate = workspaceKey === "real_estate_broker";
  const [orgRole, members, { data: taskRows }, { data: contactRows }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    getOrgMembers(supabase, orgId),
    supabase
      .from("tasks")
      .select("*")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .eq("done", false)
      .order("due_at", { ascending: true }),
    supabase
      .from("contacts")
      .select("id, name")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("name"),
  ]);
  const isAdmin = orgRole === "admin";
  const currentMember = members.find((member) => member.user_id === user!.id);
  const canReviewAll = isAdmin || ["owner", "managing_partner"].includes(currentMember?.job_role ?? "");
  const canManageDeadlines = workspaceKey === "law_office" && canManageLegal(currentMember?.job_role, isAdmin);

  const legalDeadlines: LegalDeadline[] =
    workspaceKey === "law_office"
      ? (
          await supabase
            .from("legal_deadlines")
            .select("*")
            .eq("org_id", orgId)
            .eq("status", "pending")
            .order("due_at", { ascending: true })
        ).data ?? []
      : [];

  const allTasks = ((taskRows ?? []) as Task[]).filter(
    (task) => task.review_status !== "submitted"
  );
  const allContacts = (contactRows ?? []) as Pick<Contact, "id" | "name">[];

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const tasksWithDate = allTasks.filter((task) => task.due_at);
  const overdueTasks = tasksWithDate.filter((task) => new Date(task.due_at as string) < now);
  const overdueDeadlines = legalDeadlines.filter((deadline) => new Date(deadline.due_at) < now);
  const todayTasks = tasksWithDate.filter(
    (task) => new Date(task.due_at as string) >= now && new Date(task.due_at as string) <= endOfToday
  );
  const todayDeadlines = legalDeadlines.filter(
    (deadline) => new Date(deadline.due_at) >= now && new Date(deadline.due_at) <= endOfToday
  );

  const { year, month } = parseMonthParam(searchParams.month, now);
  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 1);
  const cells = buildMonthCells(year, month);
  const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(rangeStart);
  const prevParam = monthParam(new Date(year, month - 1, 1));
  const nextParam = monthParam(new Date(year, month + 1, 1));
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const monthEntries: CalendarEntry[] = [
    ...tasksWithDate
      .filter((task) => {
        const due = new Date(task.due_at as string);
        return due >= rangeStart && due < rangeEnd;
      })
      .map((task): CalendarEntry => ({ kind: "task", date: new Date(task.due_at as string), task })),
    ...legalDeadlines
      .filter((deadline) => {
        const due = new Date(deadline.due_at);
        return due >= rangeStart && due < rangeEnd;
      })
      .map((deadline): CalendarEntry => ({ kind: "deadline", date: new Date(deadline.due_at), deadline })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const byDay = new Map<number, CalendarEntry[]>();
  for (const entry of monthEntries) {
    const day = entry.date.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }
  const dayGroups = Array.from(byDay.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-od-text-2">{isSeller ? "Vendas / Agenda" : isRealEstate ? "Imobiliário / Agenda" : "Jurídico / Agenda"}</p>
          <h1 className="mt-2 text-od-title text-white">
            Calendário
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-white/52 sm:block">
            {workspaceKey === "law_office"
              ? "Tarefas e prazos processuais num só lugar."
              : "Todos os seus lembretes num só lugar."}
          </p>
        </div>
      </header>

      <section className="ui-metric-band grid-cols-1 sm:grid-cols-3">
        <MetricCard
          label="Atrasados"
          value={String(overdueTasks.length + overdueDeadlines.length)}
          icon={IconBell}
          danger
        />
        <MetricCard label="Hoje" value={String(todayTasks.length + todayDeadlines.length)} icon={IconClock} />
        <MetricCard label="Este mês" value={String(monthEntries.length)} icon={IconCalendar} />
      </section>

      <form id="new-reminder" action={createTask} className="ui-form-panel scroll-mt-24 p-5">
        <input type="hidden" name="return_to" value="/painel/calendario" />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="reminder-title">
              Novo lembrete
              <span className="ml-1 text-brand-700" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> obrigatório</span>
            </label>
            <input
              id="reminder-title"
              name="title"
              required
              maxLength={160}
              placeholder="Ex: Ligar para a Ana"
              className="field mt-1.5"
            />
          </div>
          <div>
            <label className="label" htmlFor="reminder-when">
              Quando
            </label>
            <input id="reminder-when" name="due_at" type="datetime-local" className="field mt-1.5" />
          </div>
          <ContactField contacts={allContacts} />
          <PendingButton className="btn h-11 w-full lg:w-auto" pendingLabel="Salvando">
            <IconPlus className="h-4 w-4" />
            Salvar
          </PendingButton>
        </div>
      </form>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <h2 className="text-[14px] font-semibold capitalize text-white">{monthTitle}</h2>
          <div className="flex gap-2">
            <Link
              href={`/painel/calendario?month=${prevParam}`}
              aria-label="Mês anterior"
              className="nav-item grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-line bg-od-surface text-od-text-2 hover:border-brand-300 hover:bg-brand-50 hover:text-od-text"
            >
              <IconArrowRight className="h-4 w-4 rotate-180" />
            </Link>
            <Link
              href={`/painel/calendario?month=${nextParam}`}
              aria-label="Próximo mês"
              className="nav-item grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-line bg-od-surface text-od-text-2 hover:border-brand-300 hover:bg-brand-50 hover:text-od-text"
            >
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs font-black uppercase tracking-[.08em] text-ink-muted">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            const entries = day ? byDay.get(day) ?? [] : [];
            const isToday = Boolean(day && isCurrentMonth && day === now.getDate());
            return (
              <div
                key={index}
                className={
                  "min-h-20 border-b border-r border-line p-1.5 sm:min-h-28 " +
                  (day === null ? "bg-surface-2/40" : isToday ? "bg-brand-50" : "")
                }
              >
                {day && (
                  <>
                    <p className={"text-xs font-bold " + (isToday ? "text-brand-700" : "text-ink-muted")}>{day}</p>
                    <div className="mt-1 space-y-1">
                      {entries.slice(0, 2).map((entry, entryIndex) => (
                        <Link
                          key={entryIndex}
                          href={entry.kind === "task" ? "/painel/tarefas" : `/painel/juridico/processos/${entry.deadline.case_id}`}
                          className={
                            "block truncate rounded px-1 py-0.5 text-xs font-bold hover:opacity-80 " +
                            (entry.kind === "task"
                              ? entry.date < now
                                ? "bg-danger-50 text-danger-700"
                                : "bg-brand-50 text-brand-700"
                              : PRIORITY_COLOR[entry.deadline.priority] ?? PRIORITY_COLOR.normal)
                          }
                        >
                          {entry.kind === "task" ? entry.task.title : entry.deadline.title}
                        </Link>
                      ))}
                      {entries.length > 2 && (
                        <p className="text-xs font-bold text-ink-muted">+{entries.length - 2} mais</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
            Compromissos do mês
          </h2>
          <span className="tag bg-surface-2 text-ink-muted">{monthEntries.length}</span>
        </div>
        {dayGroups.length === 0 ? (
          <div className="p-8 text-center">
            <IconCheckCircle className="mx-auto h-8 w-8 text-brand-700" />
            <p className="mt-3 text-sm font-black text-ink">Nada agendado neste mês.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {dayGroups.map(([day, entries]) => (
              <div key={day} className="px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.06em] text-brand-700">
                  {new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(
                    new Date(year, month, day)
                  )}
                </p>
                <ul className="mt-2 divide-y divide-line">
                  {entries.map((entry) =>
                    entry.kind === "task" ? (
                      <TaskItem
                        key={`task-${entry.task.id}`}
                        task={entry.task}
                        overdue={entry.date < now}
                        members={members}
                        currentUserId={user!.id}
                        isAdmin={isAdmin}
                        canReviewAll={canReviewAll}
                        returnTo="/painel/calendario"
                      />
                    ) : (
                      <li key={`deadline-${entry.deadline.id}`} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/painel/juridico/processos/${entry.deadline.case_id}`}
                            className="clip-1 text-safe block text-sm font-black text-ink hover:text-brand-700"
                          >
                            {entry.deadline.title}
                          </Link>
                          <p className="mt-1 text-xs font-bold text-ink-muted">
                            {formatDateTime(entry.deadline.due_at)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={
                              "rounded-md px-2 py-1 text-xs font-black " +
                              (PRIORITY_COLOR[entry.deadline.priority] ?? PRIORITY_COLOR.normal)
                            }
                          >
                            {entry.deadline.priority}
                          </span>
                          {canManageDeadlines && (
                            <form action={completeLegalDeadline}>
                              <input type="hidden" name="id" value={entry.deadline.id} />
                              <input type="hidden" name="case_id" value={entry.deadline.case_id} />
                              <PendingButton
                                aria-label="Concluir prazo"
                                className="nav-item grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-line hover:bg-brand-50"
                                iconOnly
                                pendingLabel="Concluindo"
                              >
                                <IconCheckCircle className="h-4 w-4 text-brand-700" />
                              </PendingButton>
                            </form>
                          )}
                        </div>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string;
  icon: (props: { className?: string }) => React.ReactElement;
  danger?: boolean;
}) {
  return (
    <article className="border-b border-white/[0.08] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center gap-3">
        <span className={danger ? "text-[#fb7767]" : "text-od-text-2"}><Icon className="h-4 w-4"/></span>
        <div className="min-w-0">
          <p className="text-xs text-od-text-3">{label}</p>
          <p className="mt-0.5 text-[20px] font-bold tracking-[-0.03em] text-white">{value}</p>
        </div>
      </div>
    </article>
  );
}
