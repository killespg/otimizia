import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Deal, Task } from "@/lib/supabase/types";
import { formatBRL, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: deals }, { data: tasks }, { count: contactsCount }] =
    await Promise.all([
      supabase.from("deals").select("*"),
      supabase.from("tasks").select("*").eq("done", false),
      supabase.from("contacts").select("*", { count: "exact", head: true }),
    ]);

  const allDeals = (deals ?? []) as Deal[];
  const openTasks = (tasks ?? []) as Task[];

  const openDeals = allDeals.filter(
    (d) => d.stage !== "ganho" && d.stage !== "perdido"
  );
  const inNegotiationValue = openDeals.reduce(
    (sum, d) => sum + d.value_cents,
    0
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonThisMonth = allDeals.filter(
    (d) => d.stage === "ganho" && d.closed_at && new Date(d.closed_at) >= monthStart
  );
  const wonValue = wonThisMonth.reduce((sum, d) => sum + d.value_cents, 0);

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dueTasks = openTasks
    .filter((t) => t.due_at && new Date(t.due_at) <= today)
    .sort((a, b) => (a.due_at! < b.due_at! ? -1 : 1));

  const cards = [
    { label: "Contatos", value: String(contactsCount ?? 0) },
    { label: "Negócios em aberto", value: String(openDeals.length) },
    { label: "Em negociação", value: formatBRL(inNegotiationValue) },
    { label: "Ganho no mês", value: formatBRL(wonValue) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Painel</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Follow-ups para hoje</h2>
          <Link href="/tasks" className="text-sm text-brand-600">
            Ver todas
          </Link>
        </div>
        {dueTasks.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Nada pendente para hoje. 🎉
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {dueTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>{t.title}</span>
                <span className="text-gray-400">{formatDate(t.due_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
