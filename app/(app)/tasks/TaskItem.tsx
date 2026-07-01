"use client";

import { useTransition } from "react";
import { PendingButton } from "@/components/PendingButton";
import type { Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/format";
import { toggleTask, deleteTask } from "../actions";
import { IconTrash } from "../icons";

export default function TaskItem({
  task,
  overdue,
}: {
  task: Task;
  overdue: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const isOverdue = overdue && !task.done;

  return (
    <li className="group flex items-center gap-3 py-3">
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
            <span className="rounded-md bg-pink-100 px-2.5 py-1 text-xs font-black tabular-nums text-pink-700">
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
            className="icon-button grid h-9 w-9 place-items-center rounded-md text-ink-muted/50 opacity-100 hover:bg-danger-50 hover:text-danger-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            title="Excluir tarefa"
            aria-label={`Excluir ${task.title}`}
            iconOnly
            pendingLabel="Excluindo"
          >
            <IconTrash className="h-4 w-4" />
          </PendingButton>
        </form>
      </div>
    </li>
  );
}
