import { PendingButton } from "@/components/ui/PendingButton";
import type { ProfessionPreset } from "@/lib/people/professions";
import type { Deal, Task } from "@/lib/supabase/types";
import { formatBRL, formatDate } from "@/lib/utils/format";
import { claimDeal, claimTask } from "../../actions";
import { capitalize } from "../dashboard-format";

export function OpenClaimsPanel({
  tasks,
  deals,
  preset,
}: {
  tasks: Task[];
  deals: Deal[];
  preset: ProfessionPreset;
}) {
  if (tasks.length === 0 && deals.length === 0) return null;

  return (
    <section className="enter rounded-md border border-brand-200 bg-brand-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-brand-800">Disponíveis pra pegar</p>
          <p className="mt-1 text-xs font-medium text-od-text-3">
            Deixados em aberto pelo admin — quem pegar primeiro fica com o item.
          </p>
        </div>
        <span className="rounded-md bg-od-surface px-2.5 py-1 text-xs font-black text-brand-700">
          {String(tasks.length + deals.length).padStart(2, "0")}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {tasks.map((task) => (
          <li
            key={`task-${task.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-brand-200 bg-od-surface px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="clip-1 text-safe text-sm font-black text-od-text">{task.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-od-text-3">
                Tarefa{task.due_at ? ` · ${formatDate(task.due_at)}` : ""}
              </p>
            </div>
            <form action={claimTask}>
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="return_to" value="/painel" />
              <PendingButton
                className="shrink-0 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-black text-white hover:bg-brand-800"
                pendingLabel="Pegando"
              >
                Pegar
              </PendingButton>
            </form>
          </li>
        ))}
        {deals.map((deal) => (
          <li
            key={`deal-${deal.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-brand-200 bg-od-surface px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="clip-1 text-safe text-sm font-black text-od-text">{deal.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-od-text-3">
                {capitalize(preset.dealSingular)} · {formatBRL(deal.value_cents ?? 0)}
              </p>
            </div>
            <form action={claimDeal}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <input type="hidden" name="return_to" value="/painel" />
              <PendingButton
                className="shrink-0 rounded-md bg-brand-700 px-3 py-1.5 text-xs font-black text-white hover:bg-brand-800"
                pendingLabel="Pegando"
              >
                Pegar
              </PendingButton>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
