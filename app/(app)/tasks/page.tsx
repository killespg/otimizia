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
        className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-3"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium">Tarefa</label>
          <input
            name="title"
            required
            placeholder="Ex: Ligar para o cliente"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Quando</label>
          <input
            name="due_at"
            type="datetime-local"
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Contato</label>
          <select
            name="contact_id"
            className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {allContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Adicionar
        </button>
      </form>

      <div className="mt-8 space-y-6">
        {groups.map((g) => (
          <div
            key={g.title}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <h2 className="font-semibold">
              {g.title}{" "}
              <span className="text-sm font-normal text-gray-400">
                ({g.items.length})
              </span>
            </h2>
            {g.items.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">Nada aqui.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-100">
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
