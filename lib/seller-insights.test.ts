import { describe, expect, it } from "vitest";
import type { Deal } from "@/lib/supabase/types";
import { buildSellerCommercialInsights } from "./seller-insights";

function deal(overrides: Partial<Deal>): Deal {
  return {
    id: crypto.randomUUID(),
    owner_id: "owner",
    org_id: "org",
    workspace_key: "autonomous_seller",
    contact_id: null,
    assignee_id: null,
    pending_assignee_id: null,
    title: "Venda",
    value_cents: 0,
    stage: "novo",
    position: 0,
    details: {},
    created_at: "2026-07-01T12:00:00.000Z",
    closed_at: null,
    ...overrides,
  };
}

describe("buildSellerCommercialInsights", () => {
  it("calculates cycle, CAC, observed LTV and the strongest source from real CRM data", () => {
    const wonA = deal({
      contact_id: "a",
      stage: "ganho",
      value_cents: 100_000,
      closed_at: "2026-07-06T12:00:00.000Z",
    });
    const wonB = deal({
      contact_id: "b",
      stage: "ganho",
      value_cents: 300_000,
      closed_at: "2026-07-11T12:00:00.000Z",
    });
    const lost = deal({ stage: "perdido", details: { loss_reason: "Preço" } });

    expect(buildSellerCommercialInsights({
      allDeals: [wonA, wonB, lost],
      wonThisMonth: [wonA, wonB],
      lostThisMonth: [lost],
      contacts: [
        { id: "a", source: "Indicação" },
        { id: "b", source: "Indicação" },
      ],
      salesMarketingCostCents: 40_000,
    })).toEqual({
      acquiredCustomersThisMonth: 2,
      cacCents: 20_000,
      lifetimeValueCents: 200_000,
      salesCycleDays: 7.5,
      salesCycleBasis: "month",
      topLeadSource: "Indicação",
      topLossReason: "Preço",
    });
  });

  it("returns empty indicators instead of fabricating data", () => {
    expect(buildSellerCommercialInsights({
      allDeals: [],
      wonThisMonth: [],
      lostThisMonth: [],
      contacts: [],
      salesMarketingCostCents: 0,
    })).toEqual({
      acquiredCustomersThisMonth: 0,
      cacCents: null,
      lifetimeValueCents: null,
      salesCycleDays: null,
      salesCycleBasis: null,
      topLeadSource: null,
      topLossReason: null,
    });
  });
});
