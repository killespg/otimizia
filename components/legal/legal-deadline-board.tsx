import Link from "next/link";
import { MetricBand } from "@/components/ui/data-display";
import { DataPanel } from "@/components/ui/surface";
import type { LegalCase } from "@/lib/supabase/types";

type Queue = {
  label: string;
  cases: LegalCase[];
  tone?: "danger" | "muted";
};

export function LegalDeadlineBoard({
  overdue,
  upcoming,
  later,
  noDeadline,
  memberName,
}: {
  overdue: LegalCase[];
  upcoming: LegalCase[];
  later: LegalCase[];
  noDeadline: LegalCase[];
  memberName: Map<string, string>;
}) {
  const queues: Queue[] = [
    { label: "Atrasados", cases: overdue, tone: "danger" },
    { label: "Próximos 7 dias", cases: upcoming },
    { label: "Mais adiante", cases: later },
    { label: "Casos sem prazo", cases: noDeadline, tone: "muted" },
  ];
  const populated = queues.filter((queue) => queue.cases.length > 0);
  const emptyLabels = queues.filter((queue) => queue.cases.length === 0).map((queue) => queue.label);

  return (
    <div className="grid gap-6">
      <MetricBand
        aria-label="Resumo dos prazos"
        items={queues.map((queue) => ({
          label: queue.label === "Mais adiante" ? "Depois disso" : queue.label,
          value: (
            <span className={queue.tone === "danger" ? "text-[#fb7767]" : queue.tone === "muted" ? "text-od-text-2" : undefined}>
              {queue.cases.length}
            </span>
          ),
        }))}
      />

      <DataPanel
        title="Agenda cronológica"
        description="Prazos agrupados pela urgência para o escritório agir na ordem certa."
        count={overdue.length + upcoming.length + later.length + noDeadline.length}
      >
        {populated.length > 0 ? (
          <div className="py-2">
            {populated.map((queue) => (
              <DeadlineQueue key={queue.label} queue={queue} memberName={memberName} />
            ))}
          </div>
        ) : (
          <p className="px-5 py-8 text-sm text-od-text-2">Nenhum caso ativo possui prazo nesta agenda.</p>
        )}
        {emptyLabels.length > 0 && populated.length > 0 ? (
          <p className="bg-white/[0.018] px-5 py-3 text-xs leading-5 text-od-text-3">
            Sem itens em: {joinLabels(emptyLabels)}.
          </p>
        ) : null}
      </DataPanel>
    </div>
  );
}

function DeadlineQueue({
  queue,
  memberName,
}: {
  queue: Queue;
  memberName: Map<string, string>;
}) {
  return (
    <section aria-labelledby={`deadline-${queue.label.replaceAll(" ", "-").toLowerCase()}`}>
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
        <h3 id={`deadline-${queue.label.replaceAll(" ", "-").toLowerCase()}`} className="text-sm font-semibold text-white">
          {queue.label}
        </h3>
        <span className="text-xs font-semibold tabular-nums text-od-text-3">{queue.cases.length}</span>
      </div>
      <div className="od-rows">
        {queue.cases.map((item) => (
          <Link
            key={item.id}
            href={`/painel/juridico/processos/${item.id}`}
            className="grid min-h-16 gap-3 px-5 py-4 transition-colors hover:bg-white/[0.035] focus-visible:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_11rem_11rem] sm:items-center"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">{item.title}</p>
              <p className="mt-1 truncate text-xs text-od-text-3">{item.area ?? "Área não informada"}</p>
            </div>
            <span className="text-xs text-white/58">
              {item.responsible_id ? memberName.get(item.responsible_id) ?? "Sem nome" : "Sem responsável"}
            </span>
            <span className={`text-xs font-semibold ${queue.tone === "danger" ? "text-[#fb7767]" : queue.tone === "muted" ? "text-od-text-3" : "text-od-text-2"}`}>
              {item.next_deadline_at ? formatDeadline(item.next_deadline_at) : "Sem prazo definido"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function joinLabels(labels: string[]) {
  if (labels.length < 2) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}`;
}
