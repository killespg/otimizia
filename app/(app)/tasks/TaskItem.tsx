"use client";

import { useState, useTransition } from "react";
import { PendingButton } from "@/components/PendingButton";
import type { Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/format";
import {
  acceptTaskHandoff,
  adminReassignTask,
  declineTaskHandoff,
  deleteTask,
  requestTaskHandoff,
  toggleTask,
} from "../actions";
import { IconTrash } from "../icons";

type Member = { user_id: string; name: string | null };

export default function TaskItem({
  task,
  overdue,
  members,
  currentUserId,
  isAdmin,
}: {
  task: Task;
  overdue: boolean;
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
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

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="group flex items-center gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-1 py-1">
          <input
            type="checkbox"
            defaultChecked={task.done}
            disabled={isPending}
            onChange={(event) =>
              startTransition(() => toggleTask(task.id, event.target.checked))
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
          {task.due_at &&
            (isOverdue ? (
              <span className="rounded-md bg-danger-50 px-2.5 py-1 text-xs font-black tabular-nums text-danger-700 dark:bg-[#3a0b08] dark:text-[#ffb4ac]">
                {formatDateTime(task.due_at)}
              </span>
            ) : (
              <span className="hidden text-xs font-bold tabular-nums text-ink-muted sm:inline">
                {formatDateTime(task.due_at)}
              </span>
            ))}
          <form action={deleteTask}>
            <input type="hidden" name="id" value={task.id} />
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

      {members.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pl-1 text-[11px] font-bold text-ink-muted">
          {assigneeName && (
            <span className="tag bg-surface-2 text-ink-muted">Com {assigneeName}</span>
          )}

          {task.pending_assignee_id && (
            iAmPendingTarget ? (
              <span className="flex items-center gap-1.5">
                <span className="tag bg-[#fff7e6] text-[#8a6500]">Pediram para você pegar</span>
                <form action={acceptTaskHandoff}>
                  <input type="hidden" name="task_id" value={task.id} />
                  <PendingButton className="rounded-md bg-brand-700 px-2 py-1 text-[11px] font-black text-white hover:bg-brand-800" pendingLabel="Aceitando">
                    Aceitar
                  </PendingButton>
                </form>
                <form action={declineTaskHandoff}>
                  <input type="hidden" name="task_id" value={task.id} />
                  <PendingButton className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-black text-ink-soft hover:bg-surface-2" pendingLabel="Recusando">
                    Recusar
                  </PendingButton>
                </form>
              </span>
            ) : (
              <span className="tag bg-[#fff7e6] text-[#8a6500]">
                Transferência pendente{pendingTargetName ? ` para ${pendingTargetName}` : ""}
              </span>
            )
          )}

          {canManage && !task.pending_assignee_id && otherMembers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHandoff((v) => !v)}
              className="nav-item text-[11px] font-black text-brand-700 hover:text-brand-900"
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
