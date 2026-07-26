import { describe, expect, it } from "vitest";
import { computeDevMetrics } from "@/lib/devMetrics";

function profile(overrides: Partial<Parameters<typeof computeDevMetrics>[0][number]> = {}) {
  return {
    name: "Teste",
    plan: "pro",
    plan_status: "active",
    trial_ends_at: null,
    stripe_subscription_id: "sub_1",
    created_at: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeDevMetrics — hábito (0.1)", () => {
  it("calcula % de negócios abertos com próxima ação vinculada", () => {
    const deals = [
      { id: "d1", owner_id: "u1", stage: "novo", value_cents: 1000 },
      { id: "d2", owner_id: "u1", stage: "negociacao", value_cents: 2000 },
      { id: "d3", owner_id: "u1", stage: "ganho", value_cents: 3000 },
    ];
    const tasks = [
      { deal_id: "d1", done: false },
      { deal_id: "d2", done: true },
      { deal_id: "d3", done: false },
    ];

    const metrics = computeDevMetrics([profile()], [], deals, tasks);

    expect(metrics.openDealsCount).toBe(2);
    expect(metrics.openDealsWithNextAction).toBe(1);
    expect(metrics.openDealsWithNextActionRate).toBe(50);
  });

  it("não quebra e não conta tarefa concluída como próxima ação", () => {
    const deals = [{ id: "d1", owner_id: "u1", stage: "novo", value_cents: 1000 }];
    const tasks = [{ deal_id: "d1", done: true }];

    const metrics = computeDevMetrics([profile()], [], deals, tasks);

    expect(metrics.openDealsWithNextAction).toBe(0);
    expect(metrics.openDealsWithNextActionRate).toBe(0);
  });

  it("retorna 0% quando não há negócios abertos, sem dividir por zero", () => {
    const metrics = computeDevMetrics([profile()], [], [], []);
    expect(metrics.openDealsCount).toBe(0);
    expect(metrics.openDealsWithNextActionRate).toBe(0);
  });
});
