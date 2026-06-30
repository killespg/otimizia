"use client";

import { useTransition } from "react";
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
    <li className="group flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          defaultChecked={task.done}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => toggleTask(task.id, e.target.checked))
          }
          className="h-[18px] w-[18px] shrink-0 rounded-sm accent-brand-700"
        />
        <span
          className={
            "clip-2 min-w-0 text-safe text-[15px] " +
            (task.done ? "text-ink-muted line-through" : "font-medium text-ink")
          }
        >
          {task.title}
        </span>
      </label>

      <div className="flex shrink-0 items-center gap-2.5">
        {task.due_at &&
          (isOverdue ? (
            <span className="tag tag-danger tabular-nums">
              {formatDateTime(task.due_at)}
            </span>
          ) : (
            <span className="font-mono text-[12px] tabular-nums text-ink-muted">
              {formatDateTime(task.due_at)}
            </span>
          ))}
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            className="icon-button grid h-7 w-7 place-items-center rounded-sm text-ink-muted/50 opacity-0 hover:bg-danger-50 hover:text-danger-600 focus-visible:opacity-100 group-hover:opacity-100"
            title="Excluir tarefa"
            aria-label={`Excluir ${task.title}`}
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </form>
      </div>
    </li>
  );
}
