import type { JobRole } from "@/lib/supabase/types";

export type TaskVisibilityMode = "profile" | "mixed" | "private";

export const TASK_VISIBILITY_OPTIONS: Array<{
  value: TaskVisibilityMode;
  label: string;
  description: string;
}> = [
  {
    value: "profile",
    label: "Consultar no perfil",
    description:
      "Ver as tarefas e lembretes alheios apenas se consultado no perfil da pessoa. A sua fila também só aparece quando alguém abre o seu perfil.",
  },
  {
    value: "mixed",
    label: "Misturar na agenda",
    description:
      "Ver as tarefas e lembretes alheios na dashboard e na aba de Agenda e prazos, misturados com os seus, com uma etiqueta mostrando o nome de quem é responsável.",
  },
  {
    value: "private",
    label: "Privado",
    description:
      "Não ver alheios nem mostrar as tarefas e lembretes para nenhuma pessoa, mesmo mediante acesso no perfil.",
  },
];

export type OrgTaskVisibilityPolicy = {
  locked: boolean;
  mode: TaskVisibilityMode;
};

export function isTaskVisibilityMode(value: unknown): value is TaskVisibilityMode {
  return value === "profile" || value === "mixed" || value === "private";
}

export function effectiveTaskVisibility(
  memberMode: TaskVisibilityMode | null | undefined,
  org: OrgTaskVisibilityPolicy,
): TaskVisibilityMode {
  if (org.locked) return org.mode;
  return memberMode ?? "profile";
}

export function shouldShowOthersTask({
  viewer,
  owner,
  surface,
}: {
  viewer: TaskVisibilityMode;
  owner: TaskVisibilityMode;
  surface: "agenda" | "dashboard" | "profile";
}): boolean {
  if (viewer === "private" || owner === "private") return false;
  if (surface === "profile") return true;
  return viewer === "mixed";
}

export function canAssignLegalTasks(jobRole: JobRole | null | undefined, isOrgAdmin = false) {
  return isOrgAdmin || jobRole === "owner" || jobRole === "managing_partner";
}

export function taskOwnerId(task: { assignee_id: string | null; owner_id: string }): string {
  return task.assignee_id ?? task.owner_id;
}

export function isOwnWorkQueue(
  task: {
    owner_id: string;
    assignee_id: string | null;
    pending_assignee_id?: string | null;
    reviewer_id?: string | null;
  },
  viewerId: string,
) {
  return (
    task.owner_id === viewerId ||
    task.assignee_id === viewerId ||
    task.pending_assignee_id === viewerId ||
    task.reviewer_id === viewerId
  );
}

export function filterTasksForSurface<
  T extends {
    owner_id: string;
    assignee_id: string | null;
    pending_assignee_id?: string | null;
    reviewer_id?: string | null;
  },
>(
  tasks: T[],
  viewerId: string,
  viewerMode: TaskVisibilityMode,
  ownerModeByUser: Map<string, TaskVisibilityMode>,
  surface: "agenda" | "dashboard" | "profile",
): T[] {
  return tasks.filter((task) => {
    if (isOwnWorkQueue(task, viewerId)) return true;
    const ownerMode = ownerModeByUser.get(taskOwnerId(task)) ?? "profile";
    return shouldShowOthersTask({ viewer: viewerMode, owner: ownerMode, surface });
  });
}

export function orgTaskVisibilityPolicy(org: {
  task_visibility_locked?: boolean | null;
  task_visibility_mode?: string | null;
}): OrgTaskVisibilityPolicy {
  return {
    locked: Boolean(org.task_visibility_locked),
    mode: isTaskVisibilityMode(org.task_visibility_mode) ? org.task_visibility_mode : "profile",
  };
}
