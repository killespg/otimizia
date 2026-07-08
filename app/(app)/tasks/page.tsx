import { PendingButton } from "@/components/PendingButton";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Task } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { createTask } from "../actions";
import { ContactField } from "../ContactField";
import { IconBell, IconCheckCircle, IconClock, IconPlus } from "../icons";
import TaskItem from "./TaskItem";

type Tone = "danger" | "today" | "upcoming" | "done";

export default async function TasksPage() {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
  ]);
  const orgId = await getActiveOrgId(supabase, user!.id);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const [{ data: tasks }, { data: contacts }, members, role] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("due_at", { ascending: true }),
    supabase
      .from("contacts")
      .select("id, name")
      .eq("org_id", orgId)
      .eq("workspace_key", workspaceKey)
      .order("name"),
    getOrgMembers(supabase, orgId),
    getOrgRole(supabase, orgId, user!.id),
  ]);

  const allTasks = (tasks ?? []) as Task[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const isAdmin = role === "admin";
  const handoffRequests = allTasks.filter((task) => task.pending_assignee_id === user!.id);

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const pending = allTasks.filter((task) => !task.done);
  const overdue = pending.filter((task) => task.due_at && new Date(task.due_at) < now);
  const todayTasks = pending.filter(
    (task) =>
      task.due_at &&
      new Date(task.due_at) >= now &&
      new Date(task.due_at) <= endOfToday
  );
  const upcoming = pending.filter(
    (task) => !task.due_at || new Date(task.due_at) > endOfToday
  );
  const done = allTasks.filter((task) => task.done);

  const groups: {
    title: string;
    items: Task[];
    overdue: boolean;
    tone: Tone;
    empty: string;
  }[] = [
    { title: "Atrasadas", items: overdue, overdue: true, tone: "danger", empty: "Nada atrasado. Boa." },
    { title: "Para hoje", items: todayTasks, overdue: false, tone: "today", empty: "Nada para hoje." },
    { title: "Depois", items: upcoming, overdue: false, tone: "upcoming", empty: "Nenhum lembrete para depois." },
    { title: "Feitas", items: done, overdue: false, tone: "done", empty: "Nada marcado como feito ainda." },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Tarefas</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,3.2rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            Clientes para chamar
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm font-medium leading-relaxed text-ink-soft sm:block">
            Escolha dia e hora. O que atrasar sobe para o topo da fila.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Pendentes" value={String(pending.length)} icon={IconBell} />
        <MetricCard label="Hoje" value={String(todayTasks.length)} icon={IconClock} pink />
        <MetricCard label="Feitas" value={String(done.length)} icon={IconCheckCircle} />
      </section>

      <form action={createTask} className="panel p-4 sm:p-5">
        <input type="hidden" name="return_to" value="/tasks" />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="label" htmlFor="task-title">
              Lembrete
              <span className="ml-1 text-brand-700" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> obrigatório</span>
            </label>
            <input
              id="task-title"
              name="title"
              required
              maxLength={160}
              placeholder="Ex: Ligar para a Ana"
              className="field mt-1.5"
            />
          </div>
          <div>
            <label className="label" htmlFor="task-when">
              Quando
            </label>
            <input id="task-when" name="due_at" type="datetime-local" className="field mt-1.5" />
          </div>
          <ContactField contacts={allContacts} />
          <PendingButton className="btn h-[42px] w-full lg:w-auto" pendingLabel="Salvando">
            <IconPlus className="h-4 w-4" />
            Salvar
          </PendingButton>
        </div>
        {members.length > 1 && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="max-w-xs">
              <label className="label" htmlFor="task-assignee">
                Responsável
              </label>
              <select
                id="task-assignee"
                name="assignee_id"
                className="field mt-1.5"
                defaultValue={user!.id}
              >
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_id === user!.id ? "Eu" : (member.name ?? "Sem nome")}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <label className="flex min-h-11 items-center gap-2 pb-0.5 text-sm font-bold text-ink-soft">
                <input
                  type="checkbox"
                  name="open_assignment"
                  className="h-4 w-4 rounded border-line accent-brand-700"
                />
                Deixar em aberto (quem pegar primeiro fica com ela)
              </label>
            )}
          </div>
        )}
      </form>

      {handoffRequests.length > 0 && (
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">
              Pedidos de transferência para você
            </h2>
          </div>
          <ul className="divide-y divide-line px-5">
            {handoffRequests.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                overdue={false}
                members={members}
                currentUserId={user!.id}
                isAdmin={isAdmin}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map((group) => (
          <TaskGroup key={group.title} {...group} members={members} currentUserId={user!.id} isAdmin={isAdmin} />
        ))}
      </div>
    </div>
  );
}

function TaskGroup({
  title,
  items,
  overdue,
  tone,
  empty,
  members,
  currentUserId,
  isAdmin,
}: {
  title: string;
  items: Task[];
  overdue: boolean;
  tone: Tone;
  empty: string;
  members: { user_id: string; name: string | null }[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const toneClass: Record<Tone, string> = {
    danger: "bg-danger-50 text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]",
    today: "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200",
    upcoming: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
    done: "bg-success-50 text-success-700 dark:bg-[#062d1c] dark:text-[#9ff0c5]",
  };

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-base font-black tracking-[-0.02em] text-ink sm:text-lg">{title}</h2>
          <p className="mt-1 text-sm font-medium text-ink-muted">
            {items.length === 0
              ? empty
              : `${items.length} ${items.length === 1 ? "item" : "itens"} nesta fila.`}
          </p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-xs font-black ${toneClass[tone]}`}>
          {String(items.length).padStart(2, "0")}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6">
          <div className="rounded-lg border border-dashed border-line bg-[#f8fbff] p-5 text-center">
            <p className="text-sm font-black text-ink">Fila vazia</p>
            <p className="mt-1 text-sm font-medium text-ink-muted">{empty}</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line px-5">
          {items.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              overdue={overdue}
              members={members}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  pink = false,
}: {
  label: string;
  value: string;
  icon: (props: { className?: string }) => JSX.Element;
  pink?: boolean;
}) {
  return (
    <article className="panel p-3 sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight text-ink-soft sm:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink sm:mt-3 sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          className={
            "hidden h-11 w-11 place-items-center rounded-full sm:grid " +
            (pink ? "bg-[#fff7e6] text-[#8a6500]" : "bg-brand-50 text-brand-700")
          }
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}
