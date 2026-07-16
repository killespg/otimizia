import { describe, expect, it } from "vitest";
import { buildTodayQueue } from "@/lib/today";

const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("buildTodayQueue", () => {
  it("ordena por prioridade de sinal, não só por data", () => {
    const queue = buildTodayQueue({
      now: NOW,
      overdueTasks: [{ id: "t1", title: "Ligar pro cliente", due_at: "2026-01-13T00:00:00.000Z" }],
      dealsWithoutNextAction: [{ id: "d1", title: "Negócio sem ação" }],
      stalledDeals: [
        { id: "d2", title: "Negócio parado", contactId: "c1", contactName: "Ana", assigneeId: "u1", lastActivityAt: "2026-01-01T00:00:00.000Z" },
      ],
      upcomingVisits: [{ id: "v1", scheduled_at: "2026-01-15T18:00:00.000Z" }],
      expiringOffers: [{ id: "o1", expires_at: "2026-01-16T00:00:00.000Z" }],
    });

    expect(queue.map((item) => item.kind)).toEqual([
      "task_overdue",
      "visit_upcoming",
      "offer_expiring",
      "deal_inactive",
      "deal_no_next_action",
    ]);
  });

  it("calcula 'venceu há N dias' pra tarefa vencida", () => {
    const queue = buildTodayQueue({
      now: NOW,
      overdueTasks: [{ id: "t1", title: "Tarefa", due_at: "2026-01-13T12:00:00.000Z" }],
    });
    expect(queue[0].reason).toEqual("Venceu há 2 dias");
  });

  it("não quebra quando não há nenhum sinal", () => {
    expect(buildTodayQueue({ now: NOW, overdueTasks: [] })).toEqual([]);
  });

  it("inclui o nome do contato no motivo de negócio parado quando disponível", () => {
    const queue = buildTodayQueue({
      now: NOW,
      overdueTasks: [],
      stalledDeals: [{ id: "d1", title: "Negócio", contactId: null, contactName: null, assigneeId: "u1", lastActivityAt: "2026-01-01T00:00:00.000Z" }],
    });
    expect(queue[0].reason).toEqual("Sem atividade há mais de 5 dias");
  });
});
