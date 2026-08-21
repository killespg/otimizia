import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TaskVisibilityForm } from "@/components/legal/task-visibility-form";
import { Page, PageHeader } from "@/components/ui/surface";
import { jobRoleLabel } from "@/lib/law/law-office";
import { jobRoleLabelRealEstate } from "@/lib/real-estate/real-estate";
import { normalizeProfession } from "@/lib/people/professions";
import {
  effectiveTaskVisibility,
  orgTaskVisibilityPolicy,
  shouldShowOthersTask,
} from "@/lib/law/task-visibility";
import { getActiveOrgId, getOrgMembers } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { JobRole, Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils/format";

function memberJobRoleLabel(role: JobRole, professionType: string) {
  return normalizeProfession(professionType) === "real_estate_broker"
    ? jobRoleLabelRealEstate(role)
    : jobRoleLabel(role);
}

export default async function TeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const { userId } = await params;
  const { ver } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const [members, { data: org }] = await Promise.all([
    getOrgMembers(supabase, orgId),
    supabase.from("organizations").select("task_visibility_locked, task_visibility_mode").eq("id", orgId).maybeSingle(),
  ]);
  const member = members.find((item) => item.user_id === userId);
  if (!member) notFound();

  const orgPolicy = orgTaskVisibilityPolicy(org ?? {});
  const viewerMode = effectiveTaskVisibility(
    members.find((item) => item.user_id === user.id)?.task_visibility,
    orgPolicy,
  );
  const ownerMode = effectiveTaskVisibility(member.task_visibility, orgPolicy);
  const isSelf = member.user_id === user.id;
  const canInspect =
    isSelf || shouldShowOthersTask({ viewer: viewerMode, owner: ownerMode, surface: "profile" });
  const showTasks = canInspect && (isSelf || ver === "tarefas");

  const { data: taskRows } = showTasks
    ? await supabase
        .from("tasks")
        .select("*")
        .eq("org_id", orgId)
        .eq("done", false)
        .or(`assignee_id.eq.${member.user_id},owner_id.eq.${member.user_id}`)
        .order("due_at", { ascending: true, nullsFirst: false })
    : { data: [] as Task[] };
  const tasks = ((taskRows ?? []) as Task[]).filter(
    (task) => task.assignee_id === member.user_id || (!task.assignee_id && task.owner_id === member.user_id),
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Escritório / Equipe"
        title={member.name || "Sem nome"}
        description={`${memberJobRoleLabel(member.job_role, member.profession_type)}${member.role === "admin" ? " · Admin da organização" : ""}`}
        actions={
          <Link
            href="/equipe"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-od-border px-4 text-xs font-semibold text-od-text-2 hover:bg-od-surface-hover hover:text-white"
          >
            Voltar à equipe
          </Link>
        }
      />

      {isSelf ? (
        <section className="ui-form-panel">
          <header className="ui-form-panel__header">
            <div className="ui-form-panel__copy">
              <h2 className="ui-form-panel__title">Tarefas e lembretes</h2>
              <p className="ui-form-panel__description">
                Escolha se seus lembretes são visíveis para a equipe, e como você vê os dos outros.
              </p>
            </div>
          </header>
          <div className="ui-form-panel__body">
            <TaskVisibilityForm currentMode={ownerMode} locked={orgPolicy.locked} />
          </div>
        </section>
      ) : null}

      <section className="ui-data-panel">
        <header className="ui-data-panel__header">
          <div className="ui-data-panel__copy">
            <h2 className="ui-data-panel__title">Fila desta pessoa</h2>
            <p className="ui-data-panel__description">
              {canInspect
                ? "Tarefas e lembretes que essa pessoa precisa realizar."
                : "A configuração de visibilidade impede ver a fila desta pessoa."}
            </p>
          </div>
        </header>
        <div className="ui-data-panel__body">
          {!canInspect ? (
            <p className="px-5 py-8 text-sm text-od-text-2">Fila privada.</p>
          ) : !isSelf && ver !== "tarefas" ? (
            <div className="px-5 py-6">
              <Link
                href={`/equipe/${member.user_id}?ver=tarefas`}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-od-border px-4 text-xs font-semibold text-od-text-2 hover:bg-od-surface-hover hover:text-white"
              >
                Ver tarefas e lembretes
              </Link>
            </div>
          ) : tasks.length === 0 ? (
            <p className="px-5 py-8 text-sm text-od-text-2">Nenhum lembrete aberto.</p>
          ) : (
            <ul>
              {tasks.map((task) => (
                <li key={task.id} className="border-b border-white/[0.06] px-5 py-4 last:border-b-0">
                  <p className="text-[13px] font-semibold text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-od-text-3">
                    {task.due_at ? formatDateTime(task.due_at) : "Sem data"}
                    {task.notes ? ` · ${task.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Page>
  );
}
