import { describe, expect, it } from "vitest";
import { buildMonthlyDealStats, buildOriginBreakdown, buildOwnerBreakdown, buildStageBreakdown, dealsToCsv } from "@/lib/deals-report";
import type { Deal } from "@/lib/supabase/types";

function deal(overrides: Partial<Deal>): Deal {
  return {
    id: "1",
    owner_id: "u1",
    org_id: "o1",
    workspace_key: "autonomous_seller",
    contact_id: null,
    assignee_id: null,
    pending_assignee_id: null,
    title: "Negócio",
    value_cents: 10000,
    stage: "novo",
    pipeline_id: null,
    position: 0,
    details: {},
    created_at: "2026-01-10T12:00:00.000Z",
    closed_at: null,
    ...overrides,
  };
}

describe("buildMonthlyDealStats", () => {
  it("buckets created and closed deals by their own month", () => {
    const deals = [
      deal({ created_at: "2026-01-05T00:00:00.000Z" }),
      deal({
        created_at: "2026-01-05T00:00:00.000Z",
        stage: "ganho",
        value_cents: 5000,
        closed_at: "2026-02-01T00:00:00.000Z",
      }),
      deal({ created_at: "2026-02-10T00:00:00.000Z", stage: "perdido", closed_at: "2026-02-15T00:00:00.000Z" }),
    ];
    const stats = buildMonthlyDealStats(deals, new Date(2026, 0, 1), new Date(2026, 1, 1));

    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({ monthKey: "2026-01", created: 2, won: 0, lost: 0 });
    expect(stats[1]).toMatchObject({ monthKey: "2026-02", created: 1, won: 1, lost: 1, wonValueCents: 5000, conversionRate: 50 });
  });

  it("returns null conversion rate when nothing closed in the month", () => {
    const stats = buildMonthlyDealStats([], new Date(2026, 0, 1), new Date(2026, 0, 1));
    expect(stats[0].conversionRate).toBeNull();
  });
});

describe("dealsToCsv", () => {
  it("escapes commas and quotes in titles", () => {
    const csv = dealsToCsv([deal({ title: 'Cliente "VIP", prioridade' })]);
    expect(csv).toContain('"Cliente ""VIP"", prioridade"');
  });
});

describe("buildStageBreakdown", () => {
  const now = new Date("2026-01-15T00:00:00.000Z");

  it("agrupa só negócios abertos por etapa e calcula dias médios em aberto", () => {
    const rows = buildStageBreakdown(
      [
        deal({ stage: "em_contato", created_at: "2026-01-10T00:00:00.000Z", value_cents: 1000 }),
        deal({ stage: "em_contato", created_at: "2026-01-05T00:00:00.000Z", value_cents: 2000 }),
        deal({ stage: "ganho", created_at: "2026-01-01T00:00:00.000Z" }),
      ],
      now
    );
    const emContato = rows.find((r) => r.stage === "em_contato")!;
    expect(emContato.deals).toHaveLength(2);
    expect(emContato.openValueCents).toEqual(3000);
    expect(emContato.avgDaysOpen).toEqual(8);
    expect(rows.some((r) => r.stage === "ganho")).toBe(false);
  });

  it("retorna avgDaysOpen nulo quando não há negócio na etapa", () => {
    const rows = buildStageBreakdown([], now);
    expect(rows.every((r) => r.avgDaysOpen === null && r.deals.length === 0)).toBe(true);
  });
});

describe("buildOriginBreakdown", () => {
  it("calcula conversão por origem só com negócios fechados", () => {
    const contactSourceById = new Map([["c1", "Instagram"], ["c2", "Indicação"]]);
    const rows = buildOriginBreakdown(
      [
        deal({ contact_id: "c1", stage: "ganho", closed_at: "2026-01-10", value_cents: 5000 }),
        deal({ contact_id: "c1", stage: "perdido", closed_at: "2026-01-11" }),
        deal({ contact_id: "c2", stage: "ganho", closed_at: "2026-01-12", value_cents: 3000 }),
        deal({ contact_id: "c1", stage: "novo" }),
      ],
      contactSourceById
    );
    const instagram = rows.find((r) => r.key === "Instagram")!;
    expect(instagram.deals).toHaveLength(2);
    expect(instagram.won).toEqual(1);
    expect(instagram.conversionRate).toEqual(50);
    expect(instagram.wonValueCents).toEqual(5000);

    const indicacao = rows.find((r) => r.key === "Indicação")!;
    expect(indicacao.conversionRate).toEqual(100);
  });

  it("usa 'Sem origem registrada' quando o contato não tem source", () => {
    const rows = buildOriginBreakdown([deal({ contact_id: null, stage: "ganho", closed_at: "2026-01-01" })], new Map());
    expect(rows[0].key).toEqual("Sem origem registrada");
  });
});

describe("buildOwnerBreakdown", () => {
  it("agrupa por assignee_id com fallback pro owner_id", () => {
    const rows = buildOwnerBreakdown([
      deal({ assignee_id: "corretor-1", owner_id: "dono", stage: "ganho", closed_at: "2026-01-01", value_cents: 4000 }),
      deal({ assignee_id: null, owner_id: "dono", stage: "perdido", closed_at: "2026-01-02" }),
    ]);
    const corretor1 = rows.find((r) => r.key === "corretor-1")!;
    expect(corretor1.deals).toHaveLength(1);
    const dono = rows.find((r) => r.key === "dono")!;
    expect(dono.deals).toHaveLength(1);
    expect(dono.conversionRate).toEqual(0);
  });
});
