import type { Interaction, Task } from "@/lib/supabase/types";

// 1.2 (Fase 1): "activity" só existe como leitura por enquanto — mescla
// fontes que já existem (interactions, tasks e, no vertical imobiliário,
// visitas/propostas) num feed cronológico único. Não é uma tabela nova
// (nenhum write path muda), é o jeito de responder "o que aconteceu e qual
// o próximo passo?" sem abrir 3-4 seções separadas. Documentos e mudanças
// de etapa ficam como lacuna conhecida — não há tabela de histórico de
// stage_changed nem de documentos hoje (ver
// docs/roadmap-imobiliario/1.2-timeline-unificada.md).
export type TimelineEntryKind = "interaction" | "task" | "visit" | "offer";

export type TimelineEntry = {
  kind: TimelineEntryKind;
  id: string;
  at: string;
  title: string;
  detail: string | null;
  done: boolean;
};

export type TimelineVisitInput = {
  id: string;
  status: string;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type TimelineOfferInput = {
  id: string;
  status: string;
  amount_cents: number;
  sent_at: string | null;
  created_at: string;
};

function visitTitle(status: string): string {
  switch (status) {
    case "completed":
      return "Visita realizada";
    case "cancelled":
      return "Visita cancelada";
    case "no_show":
      return "Visita — cliente não compareceu";
    case "scheduled":
      return "Visita agendada";
    default:
      return "Visita solicitada";
  }
}

function offerTitle(status: string): string {
  switch (status) {
    case "accepted":
      return "Proposta aceita";
    case "declined":
      return "Proposta recusada";
    case "countered":
      return "Contraproposta recebida";
    case "sent":
      return "Proposta enviada";
    case "expired":
      return "Proposta expirada";
    default:
      return "Proposta em rascunho";
  }
}

export function buildContactTimeline(input: {
  interactions: Pick<Interaction, "id" | "body" | "created_at">[];
  tasks: Pick<Task, "id" | "title" | "due_at" | "done" | "created_at">[];
  visits?: TimelineVisitInput[];
  offers?: TimelineOfferInput[];
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const log of input.interactions) {
    entries.push({ kind: "interaction", id: log.id, at: log.created_at, title: log.body, detail: null, done: true });
  }

  for (const task of input.tasks) {
    entries.push({
      kind: "task",
      id: task.id,
      at: task.due_at ?? task.created_at,
      title: task.title,
      detail: task.due_at ? null : "Sem prazo definido",
      done: task.done,
    });
  }

  for (const visit of input.visits ?? []) {
    entries.push({
      kind: "visit",
      id: visit.id,
      at: visit.completed_at ?? visit.scheduled_at ?? visit.created_at,
      title: visitTitle(visit.status),
      detail: null,
      done: visit.status === "completed" || visit.status === "cancelled" || visit.status === "no_show",
    });
  }

  for (const offer of input.offers ?? []) {
    entries.push({
      kind: "offer",
      id: offer.id,
      at: offer.sent_at ?? offer.created_at,
      title: offerTitle(offer.status),
      detail: null,
      done: ["accepted", "declined", "expired"].includes(offer.status),
    });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export function filterTimeline(entries: TimelineEntry[], kind: TimelineEntryKind | "all"): TimelineEntry[] {
  if (kind === "all") return entries;
  return entries.filter((entry) => entry.kind === kind);
}
