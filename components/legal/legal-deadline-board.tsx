import { LegalDeadlineQueue, type DeadlineRow } from "@/components/legal/legal-deadline-queue";
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
  canManage = false,
}: {
  overdue: LegalCase[];
  upcoming: LegalCase[];
  later: LegalCase[];
  noDeadline: LegalCase[];
  memberName: Map<string, string>;
  canManage?: boolean;
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
              <LegalDeadlineQueue
                key={queue.label}
                label={queue.label}
                tone={queue.tone}
                canManage={canManage}
                rows={queue.cases.map((item) => toRow(item, memberName))}
              />
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

function toRow(item: LegalCase, memberName: Map<string, string>): DeadlineRow {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.area ?? "Área não informada",
    responsibleLabel: item.responsible_id
      ? memberName.get(item.responsible_id) ?? "Sem nome"
      : "Sem responsável",
    deadlineLabel: item.next_deadline_at ? formatDeadline(item.next_deadline_at) : "Sem prazo definido",
  };
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
