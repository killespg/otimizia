import Link from "next/link";
import type { Task } from "@/lib/supabase/types";
import { IconArrowRight, IconCheckCircle } from "../../icons";
import { dueLabel, taskPriority } from "../dashboard-format";

export function TaskQueue({
  tasks,
  overdue,
  now,
}: {
  tasks: Task[];
  overdue: Task[];
  now: Date;
}) {
  return (
    <section className="enter rounded-md border border-od-border bg-od-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Agenda</p>
          <h2 className="mt-0.5 text-base font-black tracking-[-0.02em] text-od-text sm:text-lg">
            Fila de tarefas
          </h2>
        </div>
        <span className="rounded-md bg-od-muted-surface px-2.5 py-1 text-xs font-black text-od-text-3">
          {tasks.length} pendentes
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-od-border bg-od-muted-surface p-5 text-center">
          <IconCheckCircle className="mx-auto h-8 w-8 text-brand-700" />
          <p className="mt-3 text-sm font-black text-od-text">Tudo em dia por aqui.</p>
          <p className="mt-1 text-sm font-medium text-od-text-3">
            Os próximos lembretes vão aparecer nesta fila.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((task, index) => {
            const priority = taskPriority(task, overdue, index);
            return (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-md border border-od-border bg-od-surface px-3 py-3"
              >
                <span className="h-4 w-4 shrink-0 rounded-full border border-od-border bg-od-surface" />
                <div className="min-w-0 flex-1">
                  <p className="clip-1 text-safe text-sm font-black text-od-text">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-od-text-3">
                    {task.due_at ? dueLabel(task.due_at, now) : "Sem data"}
                  </p>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-black ${priority.className}`}>
                  {priority.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/painel/tarefas"
        className="nav-item mt-4 inline-flex items-center gap-2 text-sm font-black text-brand-700 hover:text-brand-900"
      >
        Ver todas as tarefas
        <IconArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
