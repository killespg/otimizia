import { describe, expect, it } from "vitest";
import { buildMonthlyDealStats, dealsToCsv } from "@/lib/deals-report";
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
