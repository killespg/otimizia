import { PendingButton } from "@/components/ui/PendingButton";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { getProfessionPreset } from "@/lib/people/professions";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Task } from "@/lib/supabase/types";
import { getWorkspaceLabels } from "@/lib/workspace/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { createTask } from "../actions";
import { ContactField } from "../ContactField";
import { IconBell, IconCheckCircle, IconClock, IconPlus } from "../icons";
import TaskItem from "./TaskItem";

type Tone = "danger" | "today" | "upcoming" | "done";

export default async function TasksPage() {
  const supabase = await createClient();
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
  const preset = getProfessionPreset(workspaceKey);
  const [{ data: tasks }, { data: contacts }, { data: org }, members, role] = await Promise.all([
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
    supabase
      .from("organizations")
      .select("workspace_preferences")
      .eq("id", orgId)
      .maybeSingle(),
    getOrgMembers(supabase, orgId),
    getOrgRole(supabase, orgId, user!.id),
  ]);

  const allTasks = (tasks ?? []) as Task[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const workspaceLabels = getWorkspaceLabels(
    preset,
    org?.workspace_preferences,
    workspaceKey
  );
  const isSeller = workspaceKey === "autonomous_seller";
  const isAdmin = role === "admin";
  const currentMember = members.find((member) => member.user_id === user!.id);
  const canReviewAll = isAdmin || ["owner", "managing_partner"].includes(currentMember?.job_role ?? "");
  const handoffRequests = allTasks.filter((task) => task.pending_assignee_id === user!.id);
  const reviewQueue = allTasks.filter((task) => task.review_status === "submitted" && (canReviewAll || task.reviewer_id === user!.id));
  const submittedByMe = allTasks.filter((task) => task.review_status === "submitted" && task.assignee_id === user!.id && !reviewQueue.some((item)=>item.id===task.id));

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const pending = allTasks.filter((task) => !task.done && task.review_status !== "submitted");
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
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-od-text-2">{workspaceKey === "autonomous_seller" ? "Vendas" : "Escritório"} / {workspaceLabels.followups}</p>
          <h1 className="mt-2 text-od-title text-white">
            {workspaceLabels.followups}
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-white/52 sm:block">
            Escolha dia e hora. O que atrasar sobe para o topo da fila.
          </p>
        </div>
      </header>

      <section className="ui-metric-band grid-cols-1 sm:grid-cols-3">
        <MetricCard label="Pendentes" value={String(pending.length)} icon={IconBell} />
        <MetricCard label="Hoje" value={String(todayTasks.length)} icon={IconClock} pink />
        <MetricCard label="Feitas" value={String(done.length)} icon={IconCheckCircle} />
      </section>

      <form id="new-task" action={createTask} className="ui-form-panel scroll-mt-24 p-5">
        <input type="hidden" name="return_to" value="/painel/tarefas" />
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
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="max-w-xs">
            <label className="label" htmlFor="task-recurrence">
              Repetir
            </label>
            <select id="task-recurrence" name="recurrence" className="field mt-1.5" defaultValue="none">
              <option value="none">Não repetir</option>
              <option value="daily">Todo dia</option>
              <option value="weekly">Toda semana</option>
              <option value="monthly">Todo mês</option>
            </select>
          </div>
          {members.length > 1 && (
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
          )}
          {members.length > 1 && isAdmin && (
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

      {reviewQueue.length > 0 && (
        <section className="panel overflow-hidden border-od-accent/20">
          <div className="flex items-center justify-between border-b border-line bg-brand-50 px-5 py-4">
            <div><h2 className="text-lg font-black text-ink">Entregas para aprovar</h2><p className="mt-1 text-sm font-medium text-ink-muted">Revise o trabalho, aprove ou devolva com uma orientação.</p></div>
            <span className="tag bg-od-muted-surface text-od-text-2">{reviewQueue.length}</span>
          </div>
          <ul className="divide-y divide-line px-5">{reviewQueue.map((task)=><TaskItem key={task.id} task={task} overdue={false} members={members} currentUserId={user!.id} isAdmin={isAdmin} canReviewAll={canReviewAll}/>)}</ul>
        </section>
      )}

      {submittedByMe.length > 0 && (
        <section className="panel overflow-hidden"><div className="border-b border-line px-5 py-4"><h2 className="text-lg font-black text-ink">Aguardando aprovação</h2><p className="mt-1 text-sm font-medium text-ink-muted">Tarefas que você já entregou ao responsável.</p></div><ul className="divide-y divide-line px-5">{submittedByMe.map((task)=><TaskItem key={task.id} task={task} overdue={false} members={members} currentUserId={user!.id} isAdmin={isAdmin} canReviewAll={canReviewAll}/>)}</ul></section>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map((group) => (
          <TaskGroup key={group.title} {...group} members={members} currentUserId={user!.id} isAdmin={isAdmin} canReviewAll={canReviewAll} isSeller={isSeller} />
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
  canReviewAll,
  isSeller,
}: {
  title: string;
  items: Task[];
  overdue: boolean;
  tone: Tone;
  empty: string;
  members: { user_id: string; name: string | null }[];
  currentUserId: string;
  isAdmin: boolean;
  canReviewAll: boolean;
  isSeller: boolean;
}) {
  const toneClass: Record<Tone, string> = {
    danger: "bg-danger-50 text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]",
    today: "bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200",
    upcoming: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-200",
    done: "bg-success-50 text-success-700 dark:bg-[#062d1c] dark:text-[#9ff0c5]",
  };

  return (
    <section className={isSeller ? "overflow-hidden border-b border-white/[0.08] xl:border-r xl:even:border-r-0 xl:[&:nth-last-child(-n+2)]:border-b-0" : "panel overflow-hidden"}>
      <div className={isSeller ? "flex items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4" : "flex items-center justify-between gap-3 border-b border-line px-5 py-4"}>
        <div>
          <h2 className={isSeller ? "text-sm font-semibold text-white" : "text-base font-black tracking-[-0.02em] text-ink sm:text-lg"}>{title}</h2>
          <p className={isSeller ? "mt-1 text-xs text-od-text-3" : "mt-1 text-sm font-medium text-ink-muted"}>
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
        <div className={isSeller ? "flex min-h-20 items-center px-5 py-4" : "px-5 py-6"}>
          <div className={isSeller ? "text-left" : "rounded-lg border border-dashed border-line bg-[#f8fbff] p-5 text-center"}>
            <div>
            <p className={isSeller ? "text-sm font-semibold text-white/68" : "text-sm font-black text-ink"}>Fila vazia</p>
            <p className={isSeller ? "mt-1 text-xs text-od-text-3" : "mt-1 text-sm font-medium text-ink-muted"}>{empty}</p>
            </div>
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
              canReviewAll={canReviewAll}
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
  icon: (props: { className?: string }) => React.ReactElement;
  pink?: boolean;
}) {
  return (
    <article className="border-b border-white/[0.08] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center gap-3">
        <span className={pink ? "text-amber-300" : "text-od-text-2"}><Icon className="h-4 w-4"/></span>
        <div className="min-w-0">
          <p className="text-xs text-od-text-3">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-white">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}
