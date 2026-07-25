import Link from "next/link";

type TaskRow = { id: string; title: string; due_at: string | null; done: boolean };

function formatDue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// Painel "hoje" ao lado da conversa — dados reais do CRM (os mesmos que o
// Tim consulta), sempre visíveis, sem precisar perguntar. Só aparece em
// telas largas (xl+): no celular e no balão flutuante a conversa continua
// enxuta, sem essa densidade extra.
export function TimTodayPanel({
  summary,
  overdueTasks,
  todayTasks,
}: {
  summary: { total_contatos: number; ganho_no_mes_centavos: number; lembretes_atrasados: number } | null;
  overdueTasks: TaskRow[];
  todayTasks: TaskRow[];
}) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-white/[0.08] px-5 py-5 xl:flex">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">Hoje</p>

      {summary ? (
        <div className="grid grid-cols-2 gap-3">
          <StatBlock label="Clientes" value={String(summary.total_contatos)} />
          <StatBlock label="Ganho no mês" value={formatMoney(summary.ganho_no_mes_centavos)} />
        </div>
      ) : null}

      <TaskGroup
        title="Atrasados"
        emptyLabel="Nada atrasado. Bom sinal."
        tasks={overdueTasks}
        accent="text-[#fb7767]"
      />

      <TaskGroup title="Prazo hoje" emptyLabel="Nenhum lembrete pra hoje." tasks={todayTasks} accent="text-violet-300" />

      <Link
        href="/painel/tarefas"
        className="min-h-11 rounded border border-white/[0.09] px-3 py-2.5 text-center text-[12px] font-semibold text-white/65 hover:bg-white/[0.04] hover:text-white"
      >
        Ver todos os lembretes
      </Link>
    </aside>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/[0.08] pt-2">
      <p className="text-[18px] font-bold leading-tight text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/45">{label}</p>
    </div>
  );
}

function TaskGroup({
  title,
  emptyLabel,
  tasks,
  accent,
}: {
  title: string;
  emptyLabel: string;
  tasks: TaskRow[];
  accent: string;
}) {
  return (
    <div>
      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] ${accent}`}>{title}</p>
      {tasks.length === 0 ? (
        <p className="text-[12px] text-white/40">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((task) => (
            <li key={task.id} className="border-t border-white/[0.06] pt-2 first:border-t-0 first:pt-0">
              <p className="truncate text-[13px] font-medium text-white/85">{task.title}</p>
              <p className="mt-0.5 text-[11px] text-white/40">{formatDue(task.due_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
