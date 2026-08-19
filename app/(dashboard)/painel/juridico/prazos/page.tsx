import Link from "next/link";
import { ActionDrawer } from "@/components/design-system/action-drawer";
import { AgendaEditDrawer } from "@/components/legal/agenda-edit-drawer";
import { DeadlineFormCalculator } from "@/components/legal/deadline-form-calculator";
import { LegalDeadlineBoard } from "@/components/legal/legal-deadline-board";
import { PendingButton } from "@/components/ui/PendingButton";
import { Page, PageHeader } from "@/components/ui/surface";
import { createLegalDeadline } from "../actions";
import { createTask, deleteTask, updateAgendaTask } from "../../actions";
import { IconPlus, IconTrash } from "../../icons";
import { ContactField } from "../../ContactField";
import { canManageLegal, canViewLegal } from "@/lib/law/law-office";
import {
  buildAgendaEntries,
  buildTaskAgendaEntries,
  civilDate,
  filterAgendaProcessSignals,
  selectedCivilDay,
  toDatetimeLocalValue,
} from "@/lib/law/legal-agenda";
import {
  canAssignLegalTasks,
  effectiveTaskVisibility,
  filterTasksForSurface,
  orgTaskVisibilityPolicy,
} from "@/lib/law/task-visibility";
import { monthParam, parseMonthParam } from "@/lib/utils/calendar-grid";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, LegalCase, LegalDeadline, LegalWatchedProcess, Task } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

type DeadlineRow = Pick<
  LegalDeadline,
  "id" | "title" | "due_at" | "deadline_type" | "case_id" | "assigned_to" | "status"
>;

export default async function DeadlinesPage(props: {
  searchParams?: Promise<{ month?: string; dia?: string; novo?: string; editar?: string }>;
}) {
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
    profile?.is_admin
  );
  if (workspaceKey !== "law_office") return <NotLawOffice />;

  const [orgRole, { data: membership }, members, { data: deadlineRows }, { data: caseRows }, { data: taskRows }, { data: org }, { data: watchedRows }, { data: contactRows }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase
      .from("organization_members")
      .select("job_role")
      .eq("org_id", orgId)
      .eq("user_id", user!.id)
      .maybeSingle(),
    getOrgMembers(supabase, orgId),
    supabase
      .from("legal_deadlines")
      .select("id, title, due_at, deadline_type, case_id, assigned_to, status")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("due_at"),
    supabase
      .from("legal_cases")
      .select("id, title, next_deadline_at, responsible_id, area, status")
      .eq("org_id", orgId)
      .in("status", ["intake", "active", "waiting", "suspended"]),
    supabase
      .from("tasks")
      .select("*")
      .eq("org_id", orgId)
      .eq("workspace_key", "law_office")
      .eq("done", false)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("organizations")
      .select("task_visibility_locked, task_visibility_mode")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("legal_watched_processes")
      .select("case_id, last_movement_at, seen_at")
      .eq("org_id", orgId),
    supabase
      .from("contacts")
      .select("id, name, company")
      .eq("org_id", orgId)
      .eq("workspace_key", "law_office")
      .order("name"),
  ]);

  const isAdmin = orgRole === "admin";
  if (!canViewLegal(membership?.job_role, isAdmin)) return <AccessDenied />;

  const now = new Date();
  const today = civilDate(now);
  const { year, month } = parseMonthParam(searchParams?.month, now);
  const selectedDay = selectedCivilDay(year, month, searchParams?.dia);
  const deadlines = (deadlineRows ?? []) as DeadlineRow[];
  const cases = (caseRows ?? []) as Pick<LegalCase, "id" | "title" | "next_deadline_at" | "responsible_id" | "area" | "status">[];
  const tasks = (taskRows ?? []) as Task[];
  const contacts = (contactRows ?? []) as Pick<Contact, "id" | "name" | "company">[];
  const orgPolicy = orgTaskVisibilityPolicy(org ?? {});
  const ownerModeByUser = new Map(
    members.map((member) => [member.user_id, effectiveTaskVisibility(member.task_visibility, orgPolicy)]),
  );
  const viewerMode = effectiveTaskVisibility(
    members.find((member) => member.user_id === user!.id)?.task_visibility,
    orgPolicy,
  );
  const visibleTasks = filterTasksForSurface(tasks, user!.id, viewerMode, ownerModeByUser, "agenda");
  const unreadCaseIds = new Set(
    ((watchedRows ?? []) as Pick<LegalWatchedProcess, "case_id" | "last_movement_at" | "seen_at">[])
      .filter(
        (item) =>
          item.case_id &&
          item.last_movement_at &&
          (!item.seen_at || new Date(item.last_movement_at) > new Date(item.seen_at)),
      )
      .map((item) => item.case_id as string),
  );
  const memberName = new Map(members.map((member) => [member.user_id, member.name ?? "Sem nome"]));
  const processEntries = filterAgendaProcessSignals(buildAgendaEntries(deadlines, cases, memberName), today, unreadCaseIds);
  const taskEntries = buildTaskAgendaEntries(visibleTasks, cases, memberName, user!.id, today);
  const entries = [...taskEntries, ...processEntries].sort(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || a.title.localeCompare(b.title, "pt-BR"),
  );
  const canManage = canManageLegal(membership?.job_role, isAdmin);
  const canAssign = canAssignLegalTasks(membership?.job_role, isAdmin);
  const caseOptions = cases.map((item) => ({ value: item.id, label: item.title }));
  const memberOptions = members.map((member) => ({
    value: member.user_id,
    label: member.user_id === user!.id ? "Eu" : member.name ?? "Sem nome",
  }));
  const monthValue = monthParam(new Date(year, month, 1));
  const agendaReturn = selectedDay
    ? `/painel/juridico/prazos?month=${monthValue}&dia=${Number(selectedDay.slice(-2))}`
    : `/painel/juridico/prazos?month=${monthValue}`;
  const editingTask = visibleTasks.find((task) => task.id === searchParams?.editar);
  const canEditTask = Boolean(
    editingTask &&
      (canAssign ||
        editingTask.owner_id === user!.id ||
        editingTask.assignee_id === user!.id ||
        editingTask.pending_assignee_id === user!.id),
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Jurídico / Agenda e prazos"
        title="Agenda e prazos"
        description="Sua fila de lembretes. Processos só entram aqui perto do vencimento ou com movimentação nova no DataJud."
        actions={
          <>
            <Link
              href="/painel/juridico/prazos/calculadora"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-od-border px-4 text-xs font-semibold text-od-text-2 hover:border-od-border-hover hover:bg-od-surface-hover hover:text-white"
            >
              Calculadora
            </Link>
            <Link
              href="/painel/juridico/processos"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-od-border px-4 text-xs font-semibold text-od-text-2 hover:border-od-border-hover hover:bg-od-surface-hover hover:text-white"
            >
              Carteira de casos
            </Link>
            {canManage ? (
              <ActionDrawer
                label="Novo prazo"
                title="Cadastrar prazo"
                description="Prazo processual vinculado a um caso da carteira."
                icon={<IconPlus className="h-4 w-4" />}
                initialOpen={searchParams?.novo === "prazo"}
                triggerClassName="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-od-border px-4 text-xs font-semibold text-od-text-2 hover:border-od-border-hover hover:bg-od-surface-hover hover:text-white"
              >
                <NewDeadlineForm userId={user!.id} caseOptions={caseOptions} memberOptions={memberOptions} />
              </ActionDrawer>
            ) : null}
            <ActionDrawer
              label="Novo lembrete"
              title="Criar lembrete ou tarefa"
              description="Organiza o trabalho do dia. Pode vincular a um processo, a um contato ou a uma empresa."
              icon={<IconPlus className="h-4 w-4" />}
              initialOpen={searchParams?.novo === "lembrete" || searchParams?.novo === "1"}
              triggerClassName="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-od-accent px-4 text-[13px] font-semibold text-white hover:bg-od-accent-hover"
            >
              <TaskForm
                userId={user!.id}
                canAssign={canAssign}
                caseOptions={caseOptions}
                memberOptions={memberOptions}
                contacts={contacts}
                returnTo={agendaReturn}
              />
            </ActionDrawer>
          </>
        }
      />
      {editingTask ? (
        <AgendaEditDrawer
          title="Editar lembrete"
          description={
            canEditTask
              ? "Altere o lembrete aqui. O processo vinculado, se houver, continua opcional."
              : "Você pode consultar este lembrete, mas só o responsável ou o dono do escritório altera."
          }
        >
          <TaskForm
            userId={user!.id}
            canAssign={canAssign}
            canEdit={canEditTask}
            caseOptions={caseOptions}
            memberOptions={memberOptions}
            contacts={contacts}
            returnTo={agendaReturn}
            task={editingTask}
          />
        </AgendaEditDrawer>
      ) : null}
      <LegalDeadlineBoard
        entries={entries}
        year={year}
        month={month}
        monthParam={monthValue}
        prevMonth={monthParam(new Date(year, month - 1, 1))}
        nextMonth={monthParam(new Date(year, month + 1, 1))}
        monthTitle={new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month, 1))}
        today={today}
        selectedDay={selectedDay}
        casesWithoutDeadline={0}
        canManage={canManage}
      />
    </Page>
  );
}

function TaskForm({
  userId,
  canAssign,
  canEdit = true,
  caseOptions,
  memberOptions,
  contacts,
  returnTo,
  task,
}: {
  userId: string;
  canAssign: boolean;
  canEdit?: boolean;
  caseOptions: { value: string; label: string }[];
  memberOptions: { value: string; label: string }[];
  contacts: Pick<Contact, "id" | "name" | "company">[];
  returnTo: string;
  task?: Task;
}) {
  const editing = Boolean(task);
  const readOnly = editing && !canEdit;

  return (
    <form action={editing ? updateAgendaTask : createTask} className="grid gap-4">
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      <input type="hidden" name="return_to" value={returnTo} />
      <label className="block">
        <span className="label">Lembrete<span className="ml-1 text-brand-700">*</span></span>
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={task?.title ?? ""}
          readOnly={readOnly}
          placeholder="Ex.: Revisar petição da Ana"
          className="field mt-1.5"
        />
      </label>
      <label className="block">
        <span className="label">Quando</span>
        <input
          name="due_at"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(task?.due_at)}
          readOnly={readOnly}
          className="field mt-1.5"
        />
      </label>
      <label className="block">
        <span className="label">Processo vinculado</span>
        <select name="case_id" defaultValue={task?.case_id ?? ""} disabled={readOnly} className="field mt-1.5">
          <option value="">Nenhum</option>
          {caseOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {task?.case_id ? (
        <Link
          href={`/painel/juridico/processos/${task.case_id}`}
          className="text-xs font-semibold text-od-text-2 hover:text-white"
        >
          Abrir processo vinculado
        </Link>
      ) : null}
      {readOnly ? (
        task?.notes ? <p className="text-sm leading-relaxed text-od-text-2">{task.notes}</p> : null
      ) : (
        <>
          <ContactField contacts={contacts} defaultContactId={task?.contact_id ?? ""} />
          <label className="block">
            <span className="label">Informações e observações</span>
            <textarea
              name="notes"
              maxLength={1200}
              rows={4}
              defaultValue={task?.notes ?? ""}
              className="field mt-1.5 min-h-28 resize-y"
              placeholder="O que precisa ser feito, documentos, combinados..."
            />
          </label>
        </>
      )}
      {canAssign && !readOnly ? (
        <label className="block">
          <span className="label">Responsável</span>
          <select name="assignee_id" defaultValue={task?.assignee_id ?? task?.owner_id ?? userId} className="field mt-1.5">
            {memberOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : !editing ? (
        <p className="text-xs leading-5 text-od-text-3">
          O lembrete fica com você. Para passar a um colega, envie um pedido de transferência depois de criar.
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-od-border pt-5">
        {editing && canEdit ? (
          <PendingButton formAction={deleteTask} className="btn-soft" pendingLabel="Excluindo">
            <IconTrash className="h-4 w-4" />
            Excluir
          </PendingButton>
        ) : (
          <span />
        )}
        {readOnly ? null : (
          <PendingButton className="btn" pendingLabel="Salvando">
            {editing ? null : <IconPlus className="h-4 w-4" />}
            {editing ? "Salvar alterações" : "Salvar lembrete"}
          </PendingButton>
        )}
      </div>
    </form>
  );
}

function NewDeadlineForm({
  userId,
  caseOptions,
  memberOptions,
}: {
  userId: string;
  caseOptions: { value: string; label: string }[];
  memberOptions: { value: string; label: string }[];
}) {
  if (caseOptions.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-od-text-2">
        Cadastre um caso na carteira antes de lançar um prazo.{" "}
        <Link href="/painel/juridico/processos?novo=1" className="font-semibold text-white">
          Abrir novo caso
        </Link>
      </p>
    );
  }

  return (
    <form action={createLegalDeadline} className="grid gap-4">
      <input type="hidden" name="return_to" value="agenda" />
      <label className="block">
        <span className="label">Caso<span className="ml-1 text-brand-700">*</span></span>
        <select name="case_id" required className="field mt-1.5">
          <option value="">Selecione</option>
          {caseOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Prazo<span className="ml-1 text-brand-700">*</span></span>
        <input name="title" required maxLength={180} placeholder="Ex.: Apresentar réplica" className="field mt-1.5" />
      </label>
      <DeadlineFormCalculator />
      <label className="block">
        <span className="label">Responsável</span>
        <select name="assigned_to" defaultValue={userId} className="field mt-1.5">
          {memberOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Tipo</span>
          <select name="deadline_type" defaultValue="procedural" className="field mt-1.5">
            <option value="procedural">Processual</option>
            <option value="hearing">Audiência</option>
            <option value="internal">Interno</option>
            <option value="client">Cliente</option>
            <option value="administrative">Administrativo</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Prioridade</span>
          <select name="priority" defaultValue="normal" className="field mt-1.5">
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </label>
      </div>
      <div className="flex justify-end border-t border-od-border pt-5">
        <PendingButton className="btn" pendingLabel="Cadastrando">
          <IconPlus className="h-4 w-4" />
          Cadastrar prazo
        </PendingButton>
      </div>
    </form>
  );
}

function AccessDenied() {
  return (
    <section className="panel max-w-xl p-6">
      <p className="text-sm font-black text-brand-700">Acesso restrito</p>
      <h1 className="mt-2 text-2xl font-black text-ink">Seu cargo não acessa prazos jurídicos.</h1>
    </section>
  );
}

function NotLawOffice() {
  return (
    <section className="panel max-w-xl p-6">
      <h1 className="text-2xl font-black text-ink">Prazos jurídicos disponíveis no workspace de advocacia.</h1>
      <Link href="/painel" className="btn mt-4">
        Voltar ao painel
      </Link>
    </section>
  );
}
