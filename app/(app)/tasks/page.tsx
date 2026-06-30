import { createClient } from "@/lib/supabase/server";
import type { Contact, Task } from "@/lib/supabase/types";
import { createTask } from "../actions";
import { IconPlus } from "../icons";
import TaskItem from "./TaskItem";

type Tone = "danger" | "today" | "upcoming" | "done";

export default async function TasksPage() {
  const supabase = createClient();

  const [{ data: tasks }, { data: contacts }] = await Promise.all([
    supabase.from("tasks").select("*").order("due_at", { ascending: true }),
    supabase.from("contacts").select("id, name").order("name"),
  ]);

  const allTasks = (tasks ?? []) as Task[];
  const allContacts = (contacts ?? []) as Pick<Contact, "id" | "name">[];

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const pending = allTasks.filter((t) => !t.done);
  const overdue = pending.filter((t) => t.due_at && new Date(t.due_at) < now);
  const todayTasks = pending.filter(
    (t) =>
      t.due_at && new Date(t.due_at) >= now && new Date(t.due_at) <= endOfToday
  );
  const upcoming = pending.filter(
    (t) => !t.due_at || new Date(t.due_at) > endOfToday
  );
  const done = allTasks.filter((t) => t.done);

  const groups: {
    title: string;
    items: Task[];
    overdue: boolean;
    tone: Tone;
    empty: string;
  }[] = [
    { title: "Atrasadas", items: overdue, overdue: true, tone: "danger", empty: "Nada atrasado. Ótimo." },
    { title: "Para hoje", items: todayTasks, overdue: false, tone: "today", empty: "Nada para hoje." },
    { title: "Depois", items: upcoming, overdue: false, tone: "upcoming", empty: "Nenhum lembrete para depois." },
    { title: "Feitas", items: done, overdue: false, tone: "done", empty: "Nada marcado como feito ainda." },
  ];

  const topRule: Record<Tone, string> = {
    danger: "border-t-2 border-t-danger-500",
    today: "border-t-2 border-t-brand-600",
    upcoming: "",
    done: "",
  };
  const labelColor: Record<Tone, string> = {
    danger: "text-danger-700",
    today: "text-brand-700",
    upcoming: "text-ink",
    done: "text-ink-muted",
  };

  return (
    <div>
      <header className="enter">
        <p className="eyebrow">Lembretes</p>
        <h1 className="font-display mt-3 text-[clamp(1.75rem,5vw,2.75rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-ink">
          Clientes para chamar
        </h1>
        <p className="mt-2 max-w-md text-[15px] text-ink-soft">
          Escolha o dia e a hora. O que atrasar aparece primeiro.
        </p>
      </header>

      {/* Novo lembrete */}
      <form action={createTask} className="card mt-7 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label className="label" htmlFor="task-title">
              Lembrete
            </label>
            <input
              id="task-title"
              name="title"
              required
              maxLength={160}
              placeholder="Ex: Ligar para a Ana"
              className="field mt-1.5"
            />
          </div>
          <div>
            <label className="label" htmlFor="task-when">
              Quando
            </label>
            <input
              id="task-when"
              name="due_at"
              type="datetime-local"
              className="field mt-1.5"
            />
          </div>
          <div>
            <label className="label" htmlFor="task-contact">
              Contato
            </label>
            <select id="task-contact" name="contact_id" className="field mt-1.5">
              <option value="">—</option>
              {allContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn h-[42px] w-full sm:w-auto">
            <IconPlus className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </form>

      <div className="mt-8 space-y-5">
        {groups.map((g) => (
          <section
            key={g.title}
            className={"border border-line bg-surface " + topRule[g.tone]}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
              <h2
                className={
                  "font-mono text-[12px] font-semibold uppercase tracking-[0.12em] " +
                  labelColor[g.tone]
                }
              >
                {g.title}
              </h2>
              <span className="font-mono text-[12px] tabular-nums text-ink-muted">
                {String(g.items.length).padStart(2, "0")}
              </span>
            </div>

            {g.items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-ink-muted sm:px-5">{g.empty}</p>
            ) : (
              <ul className="px-4 sm:px-5">
                {g.items.map((t) => (
                  <TaskItem key={t.id} task={t} overdue={g.overdue} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
