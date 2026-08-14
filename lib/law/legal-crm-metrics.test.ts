import { describe, expect, it } from "vitest";
import {
  buildLegalCrmMetrics,
  resolveLegalCrmPeriod,
  type LegalCrmMetricInput,
} from "./legal-crm-metrics";

const now = new Date("2026-08-14T12:00:00-03:00");
const period = resolveLegalCrmPeriod("current_month", now);

function input(overrides: Partial<LegalCrmMetricInput> = {}): LegalCrmMetricInput {
  return {
    period,
    deals: [],
    stageHistory: [],
    contacts: [],
    responses: [],
    costs: [],
    agreements: [],
    payments: [],
    lossRows: [],
    canViewFinance: true,
    coverageStartedAt: null,
    ...overrides,
  };
}

describe("resolveLegalCrmPeriod", () => {
  it("uses Sao Paulo civil-month boundaries at a UTC edge", () => {
    const utcEdge = new Date("2026-08-01T00:30:00.000Z");

    expect(resolveLegalCrmPeriod("current_month", utcEdge)).toMatchObject({
      key: "current_month",
      label: "Este mês",
      startIso: "2026-07-01T03:00:00.000Z",
      endIso: "2026-08-01T00:30:00.000Z",
      startMonth: "2026-07-01",
      endMonth: "2026-07-01",
      isPartial: true,
    });
    expect(resolveLegalCrmPeriod("previous_month", utcEdge)).toMatchObject({
      startIso: "2026-06-01T03:00:00.000Z",
      endIso: "2026-07-01T03:00:00.000Z",
      startMonth: "2026-06-01",
      endMonth: "2026-06-01",
      isPartial: false,
    });
  });

  it("makes multi-month periods include the current partial civil month", () => {
    expect(resolveLegalCrmPeriod("last_3_months", now)).toMatchObject({
      label: "Últimos 3 meses",
      startIso: "2026-06-01T03:00:00.000Z",
      endIso: "2026-08-14T15:00:00.000Z",
      startMonth: "2026-06-01",
      endMonth: "2026-08-01",
      isPartial: true,
    });
    expect(resolveLegalCrmPeriod("last_6_months", now)).toMatchObject({
      startMonth: "2026-03-01",
      endMonth: "2026-08-01",
    });
  });
});

describe("buildLegalCrmMetrics", () => {
  it("calculates the supplied cohort with skipped milestones, CAC, and LTV", () => {
    const metrics = buildLegalCrmMetrics(input({
      deals: [
        { id: "d1", contact_id: "c1", stage: "ganho", created_at: "2026-08-02T12:00:00Z", is_placeholder: false },
        { id: "d2", contact_id: "c2", stage: "perdido", created_at: "2026-08-03T12:00:00Z", is_placeholder: false },
      ],
      stageHistory: [
        { deal_id: "d1", to_stage: "novo", occurred_at: "2026-08-02T12:00:00Z", is_baseline: false },
        { deal_id: "d1", to_stage: "ganho", occurred_at: "2026-08-05T12:00:00Z", is_baseline: false },
      ],
      contacts: [{ id: "c1", source: "Indicação" }, { id: "c2", source: null }],
      responses: [
        { first_inbound_at: "2026-08-02T10:00:00Z", first_response_at: "2026-08-02T10:12:00Z", first_response_sent_by: "ai" },
        { first_inbound_at: "2026-08-03T10:00:00Z", first_response_at: null, first_response_sent_by: null },
      ],
      costs: [{ month: "2026-08-01", marketing_cents: 50_000, commercial_cents: 30_000 }],
      agreements: [{ contact_id: "c1", total_cents: 1_200_000, status: "active" }],
      payments: [{ contact_id: "c1", amount_cents: 600_000, receivable_status: "paid" }],
      lossRows: [{ loss_reason_code: "price", legacy_reason: null }],
      coverageStartedAt: "2026-08-01T00:00:00Z",
    }));

    expect(metrics.firstResponse).toMatchObject({
      status: "ready", medianMinutes: 12, responded: 1, pending: 1, ai: 1, human: 0,
    });
    expect(metrics.leads).toEqual({ total: 2, qualified: 1 });
    expect(metrics.funnel.map((item) => item.reached)).toEqual([2, 1, 1, 1]);
    expect(metrics.funnel.map((item) => item.conversionFromPrevious)).toEqual([null, 50, 100, 100]);
    expect(metrics.origins).toEqual([
      { source: "Indicação", leads: 1, qualified: 1, wins: 1, conversion: 100, receivedCents: 600_000 },
      { source: "Sem origem", leads: 1, qualified: 0, wins: 0, conversion: 0, receivedCents: 0 },
    ]);
    expect(metrics.losses).toEqual([{ code: "price", label: "Preço", count: 1 }]);
    expect(metrics.cac).toEqual({ status: "ready", valueCents: 80_000, totalCostCents: 80_000, wins: 1 });
    expect(metrics.ltv).toEqual({ receivedCents: 600_000, contractedCents: 1_200_000, unlinkedRecords: 0 });
    expect(metrics.coverage).toEqual({ partial: false, startedAt: "2026-08-01T00:00:00Z" });
  });

  it("does not infer qualified or won milestones from baseline-only history", () => {
    const metrics = buildLegalCrmMetrics(input({
      deals: [{ id: "d1", contact_id: "c1", stage: "ganho", created_at: "2026-08-02T12:00:00Z", is_placeholder: false }],
      stageHistory: [{ deal_id: "d1", to_stage: "ganho", occurred_at: "2026-08-02T12:00:00Z", is_baseline: true }],
      contacts: [{ id: "c1", source: "Evento" }],
      costs: [{ month: "2026-08-01", marketing_cents: 1, commercial_cents: 0 }],
    }));

    expect(metrics.leads).toEqual({ total: 1, qualified: 0 });
    expect(metrics.funnel.map((item) => item.reached)).toEqual([1, 0, 0, 0]);
    expect(metrics.cac).toEqual({ status: "no_wins" });
  });

  it("counts contacts once for lead insights while retaining opportunities in funnel conversion", () => {
    const metrics = buildLegalCrmMetrics(input({
      deals: [
        { id: "d1", contact_id: "c1", stage: "em_contato", created_at: "2026-08-02T12:00:00Z", is_placeholder: false },
        { id: "d2", contact_id: "c1", stage: "ganho", created_at: "2026-08-03T12:00:00Z", is_placeholder: false },
      ],
      stageHistory: [
        { deal_id: "d1", to_stage: "em_contato", occurred_at: "2026-08-02T13:00:00Z", is_baseline: false },
        { deal_id: "d2", to_stage: "ganho", occurred_at: "2026-08-03T13:00:00Z", is_baseline: false },
      ],
      contacts: [{ id: "c1", source: "Indicação" }],
      costs: [{ month: "2026-08-01", marketing_cents: 100, commercial_cents: 0 }],
    }));

    expect(metrics.leads).toEqual({ total: 1, qualified: 1 });
    expect(metrics.funnel.map((item) => item.reached)).toEqual([2, 2, 1, 1]);
    expect(metrics.origins).toEqual([
      { source: "Indicação", leads: 1, qualified: 1, wins: 1, conversion: 100, receivedCents: 0 },
    ]);
    expect(metrics.cac).toEqual({ status: "ready", valueCents: 100, totalCostCents: 100, wins: 1 });
  });

  it("uses the conventional odd and even medians for materialized non-system responses", () => {
    const odd = buildLegalCrmMetrics(input({
      responses: [
        { first_inbound_at: "2026-08-01T10:00:00Z", first_response_at: "2026-08-01T10:01:00Z", first_response_sent_by: "human" },
        { first_inbound_at: "2026-08-01T10:00:00Z", first_response_at: "2026-08-01T10:03:00Z", first_response_sent_by: "ai" },
        { first_inbound_at: "2026-08-01T10:00:00Z", first_response_at: "2026-08-01T10:09:00Z", first_response_sent_by: "human" },
      ],
    }));
    const even = buildLegalCrmMetrics(input({
      responses: [
        { first_inbound_at: "2026-08-01T10:00:00Z", first_response_at: "2026-08-01T10:04:00Z", first_response_sent_by: "human" },
        { first_inbound_at: "2026-08-01T10:00:00Z", first_response_at: "2026-08-01T10:10:00Z", first_response_sent_by: "ai" },
        // System messages are excluded upstream, so only a null materialized responder remains pending here.
        { first_inbound_at: "2026-08-01T10:00:00Z", first_response_at: null, first_response_sent_by: null },
      ],
    }));

    expect(odd.firstResponse).toMatchObject({ status: "ready", medianMinutes: 3, responded: 3, pending: 0, ai: 1, human: 2 });
    expect(even.firstResponse).toMatchObject({ status: "ready", medianMinutes: 7, responded: 2, pending: 1, ai: 1, human: 1 });
  });

  it("returns honest WhatsApp empty and unavailable states", () => {
    expect(buildLegalCrmMetrics(input({ whatsappStatus: "not_configured" })).firstResponse).toEqual({
      status: "unavailable", reason: "no_whatsapp",
    });
    expect(buildLegalCrmMetrics(input()).firstResponse).toEqual({ status: "empty", reason: "no_conversations" });
    expect(buildLegalCrmMetrics(input({ whatsappStatus: "partial_failure" })).firstResponse).toEqual({
      status: "unavailable", reason: "partial_failure",
    });
  });

  it("keeps finance hidden when denied and distinguishes missing cost from no wins", () => {
    expect(buildLegalCrmMetrics(input({ canViewFinance: false }))).toMatchObject({
      cac: { status: "hidden" },
      ltv: null,
      origins: [],
    });
    expect(buildLegalCrmMetrics(input({
      deals: [{ id: "d1", contact_id: "c1", stage: "ganho", created_at: "2026-08-02T12:00:00Z", is_placeholder: false }],
      stageHistory: [{ deal_id: "d1", to_stage: "ganho", occurred_at: "2026-08-02T12:00:00Z", is_baseline: false }],
    }))).toMatchObject({ cac: { status: "not_configured" } });
    expect(buildLegalCrmMetrics(input({
      costs: [{ month: "2026-08-01", marketing_cents: 50_000, commercial_cents: 0 }],
    }))).toMatchObject({ cac: { status: "no_wins" } });
  });

  it("excludes cancelled finance records and reports unlinked records without inventing LTV", () => {
    const metrics = buildLegalCrmMetrics(input({
      agreements: [
        { contact_id: "c1", total_cents: 100_000, status: "active" },
        { contact_id: "c2", total_cents: 400_000, status: "cancelled" },
        { contact_id: null, total_cents: 300_000, status: "completed" },
      ],
      payments: [
        { contact_id: "c1", amount_cents: 30_000, receivable_status: "paid" },
        { contact_id: "c2", amount_cents: 90_000, receivable_status: "cancelled" },
        { contact_id: null, amount_cents: 50_000, receivable_status: "paid" },
      ],
    }));

    expect(metrics.ltv).toEqual({ receivedCents: 30_000, contractedCents: 100_000, unlinkedRecords: 2 });
  });

  it("keeps an all-pending WhatsApp backlog distinct from a period with no conversations", () => {
    const metrics = buildLegalCrmMetrics(input({
      responses: [
        { first_inbound_at: "2026-08-02T10:00:00Z", first_response_at: null, first_response_sent_by: null },
        { first_inbound_at: "2026-08-03T10:00:00Z", first_response_at: null, first_response_sent_by: null },
      ],
    }));

    expect(metrics.firstResponse).toEqual({
      status: "ready", medianMinutes: null, responded: 0, pending: 2, ai: 0, human: 0,
    });
  });

  it("counts CAC from each deal's first real win in the selected month, not its creation cohort or a re-win", () => {
    const metrics = buildLegalCrmMetrics(input({
      costs: [{ month: "2026-08-01", marketing_cents: 300, commercial_cents: 0 }],
      stageHistory: [
        { deal_id: "older-first-win", to_stage: "ganho", occurred_at: "2026-08-02T12:00:00Z", is_baseline: false },
        { deal_id: "re-win", to_stage: "ganho", occurred_at: "2026-07-02T12:00:00Z", is_baseline: false },
        { deal_id: "re-win", to_stage: "ganho", occurred_at: "2026-08-03T12:00:00Z", is_baseline: false },
        { deal_id: "baseline-then-first-real-win", to_stage: "ganho", occurred_at: "2026-07-01T12:00:00Z", is_baseline: true },
        { deal_id: "baseline-then-first-real-win", to_stage: "ganho", occurred_at: "2026-08-04T12:00:00Z", is_baseline: false },
      ],
    }));

    expect(metrics.cac).toEqual({ status: "ready", valueCents: 150, totalCostCents: 300, wins: 2 });
  });

  it("lets a creation cohort mature through real milestones after its selected month", () => {
    const previousMonth = resolveLegalCrmPeriod("previous_month", now);
    const metrics = buildLegalCrmMetrics(input({
      period: previousMonth,
      deals: [{ id: "july-lead", contact_id: "c1", stage: "ganho", created_at: "2026-07-20T12:00:00Z", is_placeholder: false }],
      stageHistory: [{ deal_id: "july-lead", to_stage: "ganho", occurred_at: "2026-08-03T12:00:00Z", is_baseline: false }],
      contacts: [{ id: "c1", source: "Indicação" }],
    }));

    expect(metrics.leads).toEqual({ total: 1, qualified: 1 });
    expect(metrics.funnel.map((item) => item.reached)).toEqual([1, 1, 1, 1]);
    expect(metrics.origins).toEqual([
      { source: "Indicação", leads: 1, qualified: 1, wins: 1, conversion: 100, receivedCents: 0 },
    ]);
  });

  it("includes linked and unlinked partial receivables in received LTV while excluding cancelled rows", () => {
    const metrics = buildLegalCrmMetrics(input({
      payments: [
        { contact_id: "c1", amount_cents: 40_000, receivable_status: "partial" },
        { contact_id: null, amount_cents: 50_000, receivable_status: "partial" },
        { contact_id: "c2", amount_cents: 90_000, receivable_status: "cancelled" },
      ],
    }));

    expect(metrics.ltv).toEqual({ receivedCents: 40_000, contractedCents: null, unlinkedRecords: 1 });
  });
});
