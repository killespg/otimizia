import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { buildMonthCells, monthParam, parseMonthParam } from "@/lib/calendar-grid";
import { canManageLegal } from "@/lib/law-office";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, LegalDeadline, Task } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { formatDateTime } from "@/lib/format";
import { createTask } from "../actions";
import { completeLegalDeadline } from "../law/actions";
import { ContactField } from "../ContactField";
import { IconArrowRight, IconBell, IconCalendar, IconCheckCircle, IconClock, IconPlus } from "../icons";
import TaskItem from "../tasks/TaskItem";

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

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user!.id).maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );

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

  const { year, month } = parseMonthParam((await searchParams).month, now);
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
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Agenda</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,3.2rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Calendário
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm font-medium leading-relaxed text-ink-soft sm:block">
            {workspaceKey === "law_office"
              ? "Tarefas e prazos processuais num só lugar."
              : "Todos os seus lembretes num só lugar."}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          label="Atrasados"
          value={String(overdueTasks.length + overdueDeadlines.length)}
          icon={IconBell}
          danger
        />
        <MetricCard label="Hoje" value={String(todayTasks.length + todayDeadlines.length)} icon={IconClock} />
        <MetricCard label="Este mês" value={String(monthEntries.length)} icon={IconCalendar} />
      </section>

      <form id="new-reminder" action={createTask} className="panel scroll-mt-28 p-4 sm:p-5">
        <input type="hidden" name="return_to" value="/calendar" />
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
          <PendingButton className="btn h-[42px] w-full lg:w-auto" pendingLabel="Salvando">
            <IconPlus className="h-4 w-4" />
            Salvar
          </PendingButton>
        </div>
      </form>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-black capitalize tracking-[-0.02em] text-ink sm:text-lg">{monthTitle}</h2>
          <div className="flex gap-2">
            <Link
              href={`/calendar?month=${prevParam}`}
              aria-label="Mês anterior"
              className="nav-item grid h-9 w-9 place-items-center rounded-lg border border-line bg-white hover:border-brand-300 hover:bg-brand-50"
            >
              <IconArrowRight className="h-4 w-4 rotate-180" />
            </Link>
            <Link
              href={`/calendar?month=${nextParam}`}
              aria-label="Próximo mês"
              className="nav-item grid h-9 w-9 place-items-center rounded-lg border border-line bg-white hover:border-brand-300 hover:bg-brand-50"
            >
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-[11px] font-black uppercase tracking-[.08em] text-ink-muted">
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
                          href={entry.kind === "task" ? "/tasks" : `/law/${entry.deadline.case_id}`}
                          className={
                            "block truncate rounded px-1 py-0.5 text-[10px] font-bold hover:opacity-80 " +
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
                        <p className="text-[10px] font-bold text-ink-muted">+{entries.length - 2} mais</p>
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
                  {entries.map((entry, entryIndex) =>
                    entry.kind === "task" ? (
                      <TaskItem
                        key={`task-${entry.task.id}`}
                        task={entry.task}
                        overdue={entry.date < now}
                        members={members}
                        currentUserId={user!.id}
                        isAdmin={isAdmin}
                        canReviewAll={canReviewAll}
                        returnTo="/calendar"
                      />
                    ) : (
                      <li key={`deadline-${entry.deadline.id}`} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/law/${entry.deadline.case_id}`}
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
                              "rounded-md px-2 py-1 text-[11px] font-black " +
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
                                className="nav-item grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-brand-50"
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
  icon: (props: { className?: string }) => JSX.Element;
  danger?: boolean;
}) {
  return (
    <article className="panel p-3 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight text-ink-soft sm:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink sm:mt-3 sm:text-3xl">{value}</p>
        </div>
        <span
          className={
            "hidden h-11 w-11 place-items-center rounded-full sm:grid " +
            (danger ? "bg-danger-50 text-danger-700" : "bg-brand-50 text-brand-700")
          }
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}
