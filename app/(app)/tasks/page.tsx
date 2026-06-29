import { createClient } from "@/lib/supabase/server";
import type { Contact, Task } from "@/lib/supabase/types";
import { createTask } from "../actions";
import TaskItem from "./TaskItem";

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
      t.due_at &&
      new Date(t.due_at) >= now &&
      new Date(t.due_at) <= endOfToday
  );
  const upcoming = pending.filter(
    (t) => !t.due_at || new Date(t.due_at) > endOfToday
  );
  const done = allTasks.filter((t) => t.done);

  const groups = [
    { title: "Atrasadas", items: overdue, overdue: true },
    { title: "Para hoje", items: todayTasks, overdue: false },
    { title: "Próximas", items: upcoming, overdue: false },
    { title: "Concluídas", items: done, overdue: false },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Tarefas e lembretes</h1>

      <form
        action={createTask}
        className="glass mt-6 flex flex-wrap items-end gap-2 p-3"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700">
            Tarefa
          </label>
          <input
            name="title"
            required
            placeholder="Ex: Ligar para o cliente"
            className="glass-input mt-1"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Quando
          </label>
          <input name="due_at" type="datetime-local" className="glass-input mt-1" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Contato
          </label>
          <select name="contact_id" className="glass-input mt-1">
            <option value="">—</option>
            {allContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="glass-btn">Adicionar</button>
      </form>

      <div className="mt-8 space-y-6">
        {groups.map((g) => (
          <div key={g.title} className="glass p-5">
            <h2 className="font-semibold text-slate-900">
              {g.title}{" "}
              <span className="text-sm font-normal text-slate-400">
                ({g.items.length})
              </span>
            </h2>
            {g.items.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Nada aqui.</p>
            ) : (
              <ul className="mt-2 divide-y divide-white/40">
                {g.items.map((t) => (
                  <TaskItem key={t.id} task={t} overdue={g.overdue} />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
