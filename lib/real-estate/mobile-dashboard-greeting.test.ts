import { describe, expect, it } from "vitest";

import { getMobileDashboardGreeting } from "@/lib/real-estate/mobile-dashboard-greeting";

describe("saudação mobile do dashboard imobiliário", () => {
  const periodBoundaries = [
    ["2026-08-04T03:00:00.000Z", "overnight", "Boa noite"],
    ["2026-08-04T07:59:59.000Z", "overnight", "Boa noite"],
    ["2026-08-04T08:00:00.000Z", "early_morning", "Bom dia"],
    ["2026-08-04T11:59:59.000Z", "early_morning", "Bom dia"],
    ["2026-08-04T12:00:00.000Z", "late_morning", "Bom dia"],
    ["2026-08-04T14:59:59.000Z", "late_morning", "Bom dia"],
    ["2026-08-04T15:00:00.000Z", "early_afternoon", "Boa tarde"],
    ["2026-08-04T17:59:59.000Z", "early_afternoon", "Boa tarde"],
    ["2026-08-04T18:00:00.000Z", "late_afternoon", "Boa tarde"],
    ["2026-08-04T20:59:59.000Z", "late_afternoon", "Boa tarde"],
    ["2026-08-04T21:00:00.000Z", "early_evening", "Boa noite"],
    ["2026-08-04T23:59:59.000Z", "early_evening", "Boa noite"],
    ["2026-08-05T00:00:00.000Z", "late_evening", "Boa noite"],
    ["2026-08-05T02:59:59.000Z", "late_evening", "Boa noite"],
  ] as const;

  it.each(periodBoundaries)(
    "converte %s para o período %s no fuso de São Paulo",
    (instant, period, salutation) => {
      const greeting = getMobileDashboardGreeting({
        now: new Date(instant),
        attentionCount: 0,
      });

      expect(greeting.period).toBe(period);
      expect(greeting.salutation).toBe(salutation);
    },
  );

  it("mantém a mesma frase durante a faixa no mesmo dia", () => {
    const firstRender = getMobileDashboardGreeting({
      now: new Date("2026-08-04T12:00:00.000Z"),
      attentionCount: 0,
    });
    const refreshedRender = getMobileDashboardGreeting({
      now: new Date("2026-08-04T13:30:00.000Z"),
      attentionCount: 0,
    });

    expect(refreshedRender.period).toBe("late_morning");
    expect(refreshedRender.message).toBe(firstRender.message);
  });

  it("seleciona outra frase no dia seguinte para a mesma faixa", () => {
    const firstDay = getMobileDashboardGreeting({
      now: new Date("2026-08-04T12:00:00.000Z"),
      attentionCount: 0,
    });
    const nextDay = getMobileDashboardGreeting({
      now: new Date("2026-08-05T12:00:00.000Z"),
      attentionCount: 0,
    });

    expect(nextDay.period).toBe(firstDay.period);
    expect(nextDay.message).not.toBe(firstDay.message);
  });

  it("usa uma frase tranquila somente quando não há prioridades", () => {
    const greeting = getMobileDashboardGreeting({
      now: new Date("2026-08-05T00:30:00.000Z"),
      attentionCount: 0,
    });

    expect(greeting.message.length).toBeGreaterThan(20);
    expect(greeting.message).not.toMatch(/prioridade/);
    expect(greeting.message).not.toContain("{priorities}");
  });

  it("interpela uma prioridade no singular", () => {
    const greeting = getMobileDashboardGreeting({
      now: new Date("2026-08-05T00:30:00.000Z"),
      attentionCount: 1,
    });

    expect(greeting.message).toContain("1 prioridade");
    expect(greeting.message).not.toContain("1 prioridades");
    expect(greeting.message).not.toContain("{priorities}");
  });

  it("interpela múltiplas prioridades no plural", () => {
    const greeting = getMobileDashboardGreeting({
      now: new Date("2026-08-05T00:30:00.000Z"),
      attentionCount: 3,
    });

    expect(greeting.message).toContain("3 prioridades");
    expect(greeting.message).not.toContain("{priorities}");
  });
});
