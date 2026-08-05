"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import type { Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/utils/format";
import {
  acceptTaskHandoff,
  adminReassignTask,
  claimTask,
  declineTaskHandoff,
  deleteTask,
  requestTaskHandoff,
  reviewTaskCompletion,
  submitTaskForReview,
  toggleTask,
} from "../actions";
import { IconTrash } from "../icons";

type Member = { user_id: string; name: string | null };

const RECURRENCE_LABEL: Record<Task["recurrence"], string> = {
  none: "",
  daily: "↻ diário",
  weekly: "↻ semanal",
  monthly: "↻ mensal",
};

export default function TaskItem({
  task,
  overdue,
  members,
  currentUserId,
  isAdmin,
  canReviewAll = false,
  returnTo = "/painel/tarefas",
}: {
  task: Task;
  overdue: boolean;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  canReviewAll?: boolean;
  returnTo?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [showHandoff, setShowHandoff] = useState(false);
  const isOverdue = overdue && !task.done;

  const nameById = new Map(members.map((m) => [m.user_id, m.name]));
  const assigneeName = task.assignee_id
    ? (nameById.get(task.assignee_id) ?? "Alguém da equipe")
    : null;
  const pendingTargetName = task.pending_assignee_id
    ? (nameById.get(task.pending_assignee_id) ?? "alguém")
    : null;

  const canManage =
    isAdmin || task.assignee_id === currentUserId || task.owner_id === currentUserId;
  const iAmPendingTarget = task.pending_assignee_id === currentUserId;
  const otherMembers = members.filter((m) => m.user_id !== task.assignee_id);
  const requiresReview = Boolean(task.reviewer_id);
  const isAssignee = task.assignee_id === currentUserId;
  const awaitingReview = task.review_status === "submitted";
  const canReview = awaitingReview && (canReviewAll || task.reviewer_id === currentUserId);

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="group flex items-center gap-3">
        <label className={"flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 "+(requiresReview?"cursor-default":"cursor-pointer")}>
          <input
            type="checkbox"
            defaultChecked={task.done}
            disabled={isPending || requiresReview}
            onChange={(event) =>
              startTransition(() => {
                void toggleTask(task.id, event.target.checked).finally(() => router.refresh());
              })
            }
            className="h-[18px] w-[18px] shrink-0 rounded-full accent-brand-700"
          />
          <span
            className={
              "clip-2 min-w-0 text-safe text-sm " +
              (task.done ? "text-ink-muted line-through" : "font-black text-ink")
            }
          >
            {task.title}
          </span>
        </label>

        <div className="flex shrink-0 items-center gap-2">
          {task.recurrence !== "none" && (
            <span
              className="hidden rounded-md bg-surface-2 px-2 py-1 text-xs font-bold text-ink-muted sm:inline"
              title="Lembrete recorrente"
            >
              {RECURRENCE_LABEL[task.recurrence]}
            </span>
          )}
          {task.due_at &&
            (isOverdue ? (
              <span className="rounded-md bg-danger-50 px-2.5 py-1 text-xs font-black tabular-nums text-danger-700">
                {formatDateTime(task.due_at)}
              </span>
            ) : (
              <span className="hidden text-xs font-bold tabular-nums text-ink-muted sm:inline">
                {formatDateTime(task.due_at)}
              </span>
            ))}
          <form action={deleteTask}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <PendingButton
              className="icon-button grid h-11 w-11 place-items-center rounded-md text-ink-muted/50 opacity-100 hover:bg-danger-50 hover:text-danger-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Excluir tarefa"
              aria-label={`Excluir ${task.title}`}
              iconOnly
              pendingLabel="Excluindo"
            >
              <IconTrash className="h-4 w-4" />
            </PendingButton>
          </form>
        </div>
      </div>

      {task.review_status === "changes_requested" && (
        <div className="ml-1 rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs font-bold text-warning-800">
          <p>Devolvida para ajustes</p>{task.review_note&&<p className="mt-1 font-medium">{task.review_note}</p>}
        </div>
      )}

      {requiresReview && isAssignee && !awaitingReview && !task.done && (
        <form action={submitTaskForReview} className="ml-1">
          <input type="hidden" name="task_id" value={task.id}/><input type="hidden" name="return_to" value={returnTo}/>
          <PendingButton className="rounded-md bg-brand-700 px-3 py-2 text-xs font-black text-white hover:bg-brand-800" pendingLabel="Enviando">
            Entregar para aprovação
          </PendingButton>
        </form>
      )}

      {awaitingReview && !canReview && (
        <span className="ml-1 w-fit tag bg-brand-50 text-brand-700">Aguardando aprovação</span>
      )}

      {canReview && (
        <form action={reviewTaskCompletion} className="ml-1 grid gap-2 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <input type="hidden" name="task_id" value={task.id}/><input type="hidden" name="return_to" value={returnTo}/>
          <div><label className="label" htmlFor={`review-${task.id}`}>Orientação se devolver</label><input id={`review-${task.id}`} name="review_note" className="field mt-1.5 h-10" placeholder="Ex.: corrigir os documentos anexados"/></div>
          <PendingButton name="decision" value="changes" className="min-h-10 rounded-md border border-line bg-transparent px-3 text-xs font-black text-ink-soft hover:bg-warning-50" pendingLabel="Devolvendo">Devolver</PendingButton>
          <PendingButton name="decision" value="approve" className="min-h-10 rounded-md bg-brand-700 px-3 text-xs font-black text-white hover:bg-brand-800" pendingLabel="Aprovando">Aprovar</PendingButton>
        </form>
      )}

      {members.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pl-1 text-xs font-bold text-ink-muted">
          {assigneeName && (
            <span className="tag bg-surface-2 text-ink-muted">Com {assigneeName}</span>
          )}

          {!task.assignee_id && (
            <span className="flex items-center gap-1.5">
              <span className="tag bg-warning-50 text-warning-700">Em aberto</span>
              <form action={claimTask}>
                <input type="hidden" name="task_id" value={task.id} />
                <input type="hidden" name="return_to" value={returnTo} />
                <PendingButton
                  className="rounded-md bg-brand-700 px-2 py-1 text-xs font-black text-white hover:bg-brand-800"
                  pendingLabel="Pegando"
                >
                  Pegar
                </PendingButton>
              </form>
            </span>
          )}

          {task.pending_assignee_id && (
            iAmPendingTarget ? (
              <span className="flex items-center gap-1.5">
                <span className="tag bg-warning-50 text-warning-700">Pediram para você pegar</span>
                <form action={acceptTaskHandoff}>
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <PendingButton className="rounded-md bg-brand-700 px-2 py-1 text-xs font-black text-white hover:bg-brand-800" pendingLabel="Aceitando">
                    Aceitar
                  </PendingButton>
                </form>
                <form action={declineTaskHandoff}>
                  <input type="hidden" name="task_id" value={task.id} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <PendingButton className="rounded-md border border-line bg-transparent px-2 py-1 text-xs font-black text-ink-soft hover:bg-surface-2" pendingLabel="Recusando">
                    Recusar
                  </PendingButton>
                </form>
              </span>
            ) : (
              <span className="tag bg-warning-50 text-warning-700">
                Transferência pendente{pendingTargetName ? ` para ${pendingTargetName}` : ""}
              </span>
            )
          )}

          {canManage && !task.pending_assignee_id && otherMembers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHandoff((v) => !v)}
              className="nav-item text-xs font-black text-brand-700 hover:text-brand-900"
            >
              {isAdmin ? "Reatribuir" : "Passar para..."}
            </button>
          )}
        </div>
      )}

      {showHandoff && (
        <form
          action={isAdmin ? adminReassignTask : requestTaskHandoff}
          className="ml-1 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="task_id" value={task.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <select
            name={isAdmin ? "assignee_id" : "target_user_id"}
            required
            className="field h-9 py-0 text-xs"
            defaultValue=""
          >
            <option value="" disabled>
              Escolha o colega
            </option>
            {otherMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name ?? "Sem nome"}
              </option>
            ))}
          </select>
          <PendingButton
            className="rounded-md bg-brand-700 px-2.5 py-1.5 text-xs font-black text-white hover:bg-brand-800"
            pendingLabel="Enviando"
          >
            {isAdmin ? "Confirmar" : "Solicitar"}
          </PendingButton>
        </form>
      )}
    </li>
  );
}

