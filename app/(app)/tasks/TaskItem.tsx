"use client";

import { useTransition } from "react";
import type { Task } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/format";
import { toggleTask, deleteTask } from "../actions";

export default function TaskItem({
  task,
  overdue,
}: {
  task: Task;
  overdue: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <label className="flex flex-1 items-center gap-3">
        <input
          type="checkbox"
          defaultChecked={task.done}
          onChange={(e) =>
            startTransition(() => toggleTask(task.id, e.target.checked))
          }
          className="h-4 w-4"
        />
        <span
          className={
            task.done ? "text-sm text-gray-400 line-through" : "text-sm"
          }
        >
          {task.title}
        </span>
      </label>
      <div className="flex items-center gap-3">
        {task.due_at && (
          <span
            className={
              overdue && !task.done
                ? "text-xs font-medium text-red-600"
                : "text-xs text-gray-400"
            }
          >
            {formatDateTime(task.due_at)}
          </span>
        )}
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button className="text-xs text-gray-300 hover:text-red-500">✕</button>
        </form>
      </div>
    </li>
  );
}
