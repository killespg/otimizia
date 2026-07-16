import type { StalledDeal } from "@/lib/stalled-deals";

// 1.3a (Fase 1): Central "Hoje" básica. Só sinais que já existem no schema
// hoje (timestamps, não precisa de "limite operacional" — isso é 1.3b,
// que depende do schema de etapas da 1.1). Roda em paralelo com 1.1 de
// propósito: nenhum destes sinais lê deal_stage além do já existente
// filtro aberto/fechado (ganho/perdido), que sempre existiu.
export type TodayItemKind =
  | "task_overdue"
  | "visit_upcoming"
  | "offer_expiring"
  | "deal_inactive"
  | "deal_no_next_action";

export type TodayItem = {
  kind: TodayItemKind;
  id: string;
  title: string;
  reason: string;
  at: string;
  href: string;
};

const KIND_PRIORITY: Record<TodayItemKind, number> = {
  task_overdue: 0,
  visit_upcoming: 1,
  offer_expiring: 2,
  deal_inactive: 3,
  deal_no_next_action: 4,
};

export function buildTodayQueue(input: {
  now?: Date;
  overdueTasks: { id: string; title: string; due_at: string }[];
  upcomingVisits?: { id: string; scheduled_at: string }[];
  expiringOffers?: { id: string; expires_at: string }[];
  stalledDeals?: StalledDeal[];
  dealsWithoutNextAction?: { id: string; title: string }[];
}): TodayItem[] {
  const now = input.now ?? new Date();
  const items: TodayItem[] = [];

  for (const task of input.overdueTasks) {
    const days = Math.max(1, Math.round((now.getTime() - new Date(task.due_at).getTime()) / 86_400_000));
    items.push({
      kind: "task_overdue",
      id: task.id,
      title: task.title,
      reason: days === 1 ? "Venceu ontem" : `Venceu há ${days} dias`,
      at: task.due_at,
      href: "/tasks",
    });
  }

  for (const visit of input.upcomingVisits ?? []) {
    items.push({
      kind: "visit_upcoming",
      id: visit.id,
      title: "Visita agendada",
      reason: "Nas próximas 24 horas",
      at: visit.scheduled_at,
      href: "/imoveis/visitas",
    });
  }

  for (const offer of input.expiringOffers ?? []) {
    items.push({
      kind: "offer_expiring",
      id: offer.id,
      title: "Proposta expirando",
      reason: "Vence nas próximas 48 horas",
      at: offer.expires_at,
      href: "/imoveis",
    });
  }

  for (const deal of input.stalledDeals ?? []) {
    items.push({
      kind: "deal_inactive",
      id: deal.id,
      title: deal.title,
      reason: deal.contactName ? `Sem contato com ${deal.contactName} há mais de 5 dias` : "Sem atividade há mais de 5 dias",
      at: deal.lastActivityAt,
      href: "/pipeline",
    });
  }

  for (const deal of input.dealsWithoutNextAction ?? []) {
    items.push({
      kind: "deal_no_next_action",
      id: deal.id,
      title: deal.title,
      reason: "Sem próxima ação definida",
      at: now.toISOString(),
      href: "/pipeline",
    });
  }

  return items.sort((a, b) => {
    const priorityDiff = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (priorityDiff !== 0) return priorityDiff;
    return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
  });
}
