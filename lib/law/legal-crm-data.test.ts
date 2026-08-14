import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseLegalCrmRepository,
  getLegalCrmMetrics,
  loadLegalCrmMetrics,
  type LegalCrmRepository,
  type QueryResult,
} from "./legal-crm-data";
import {
  buildLegalCrmMetrics,
  resolveLegalCrmPeriod,
  type LegalCrmMetricInput,
  type LegalCrmMetricQuerySource,
} from "./legal-crm-metrics";

type AdapterMetricInput = LegalCrmMetricInput & {
  failedSources: Array<
    "deals" | "history" | "contacts" | "responses" | "costs" | "agreements" | "payments"
  >;
};

type Availability = Record<
  | "leads"
  | "funnel"
  | "origins"
  | "originRevenue"
  | "losses"
  | "cac"
  | "ltvReceived"
  | "ltvContracted"
  | "ltvUnlinked"
  | "coverage",
  "ready" | "unavailable" | "hidden"
>;

const now = new Date("2026-08-14T12:00:00-03:00");
const period = resolveLegalCrmPeriod("current_month", now);

function input(overrides: Partial<AdapterMetricInput> = {}): AdapterMetricInput {
  return {
    period,
    deals: [],
    stageHistory: {
      completeness: "complete_through_observed_at",
      observedAt: now.toISOString(),
      rows: [],
    },
    contacts: [],
    responses: [],
    costs: [],
    agreements: [],
    payments: [],
    lossRows: [],
    canViewFinance: true,
    coverageStartedAt: null,
    failedSources: [],
    ...overrides,
  };
}

describe("legal CRM adapter partial-failure contract", () => {
  it("does not mislabel a failed cost query as costs not configured", () => {
    const metrics = buildLegalCrmMetrics(input({ failedSources: ["costs"] }));

    expect((metrics as typeof metrics & { availability?: Availability }).availability?.cac).toBe("unavailable");
    expect(metrics.cac).not.toEqual({ status: "not_configured" });
  });

  it("keeps received LTV available when only agreements fail", () => {
    const metrics = buildLegalCrmMetrics(input({
      failedSources: ["agreements"],
      payments: [
        {
          contact_id: "contact-1",
          amount_cents: 75_000,
          receivable_status: "partial",
        },
      ],
    }));

    expect((metrics as typeof metrics & { availability?: Availability }).availability).toMatchObject({
      ltvReceived: "ready",
      ltvContracted: "unavailable",
      ltvUnlinked: "unavailable",
    });
    expect(metrics.ltv?.receivedCents).toBe(75_000);
  });

  it("does not turn a failed payment query into zero revenue by origin", () => {
    const metrics = buildLegalCrmMetrics(input({
      failedSources: ["payments"],
      deals: [
        {
          id: "deal-1",
          contact_id: "contact-1",
          stage: "ganho",
          created_at: "2026-08-02T12:00:00.000Z",
          is_placeholder: false,
        },
      ],
      contacts: [{ id: "contact-1", source: "Indicacao" }],
      stageHistory: {
        completeness: "complete_through_observed_at",
        observedAt: now.toISOString(),
        rows: [
          {
            deal_id: "deal-1",
            to_stage: "ganho",
            occurred_at: "2026-08-05T12:00:00.000Z",
            is_baseline: false,
          },
        ],
      },
    }));

    expect((metrics as typeof metrics & { availability?: Availability }).availability).toMatchObject({
      origins: "ready",
      originRevenue: "unavailable",
      ltvReceived: "unavailable",
      ltvContracted: "ready",
      ltvUnlinked: "unavailable",
    });
    expect(metrics.origins?.[0]).not.toMatchObject({ receivedCents: 0 });
  });

  it("marks only operational metrics dependent on failed deals or history unavailable", () => {
    const dealFailure = buildLegalCrmMetrics(input({ failedSources: ["deals"] }));
    const historyFailure = buildLegalCrmMetrics(input({ failedSources: ["history"] }));

    expect((dealFailure as typeof dealFailure & { availability?: Availability }).availability).toMatchObject({
      leads: "unavailable",
      funnel: "unavailable",
      origins: "unavailable",
      losses: "unavailable",
      cac: "ready",
    });
    expect((historyFailure as typeof historyFailure & { availability?: Availability }).availability).toMatchObject({
      leads: "unavailable",
      funnel: "unavailable",
      origins: "unavailable",
      losses: "ready",
      cac: "unavailable",
      coverage: "unavailable",
    });
  });
});

function ok<T>(data: T): QueryResult<T> {
  return { ok: true, data };
}

function failed<T>(source: LegalCrmMetricQuerySource): QueryResult<T> {
  return { ok: false, data: [] as T, source };
}

function repository(overrides: Partial<LegalCrmRepository> = {}): LegalCrmRepository {
  return {
    deals: async () => ok([]),
    stageHistory: async () => ok([]),
    contacts: async () => ok([]),
    responses: async () => ok({ whatsappStatus: "ready", rows: [] }),
    costs: async () => ok([]),
    agreements: async () => ok([]),
    payments: async () => ok([]),
    ...overrides,
  };
}

describe("loadLegalCrmMetrics", () => {
  it("never invokes a financial repository method without finance permission", async () => {
    const financeCalls: string[] = [];
    const fake = repository({
      costs: async () => {
        financeCalls.push("costs");
        throw new Error("costs must stay gated");
      },
      agreements: async () => {
        financeCalls.push("agreements");
        throw new Error("agreements must stay gated");
      },
      payments: async () => {
        financeCalls.push("payments");
        throw new Error("payments must stay gated");
      },
    });

    const metrics = await loadLegalCrmMetrics(fake, {
      orgId: "org-1",
      period,
      observedAt: now.toISOString(),
      canViewFinance: false,
    });

    expect(financeCalls).toEqual([]);
    expect(metrics.cac).toEqual({ status: "hidden" });
    expect(metrics.ltv).toBeNull();
    expect(metrics.availability).toMatchObject({
      cac: "hidden",
      originRevenue: "hidden",
      ltvReceived: "hidden",
      ltvContracted: "hidden",
      ltvUnlinked: "hidden",
    });
  });

  it("starts every operational query concurrently before awaiting results", async () => {
    const started: string[] = [];
    const resolvers: Array<() => void> = [];
    const waitForRelease = <T,>(name: string, value: QueryResult<T>) => {
      started.push(name);
      return new Promise<QueryResult<T>>((resolve) => {
        resolvers.push(() => resolve(value));
      });
    };
    const fake = repository({
      deals: async () => waitForRelease("deals", ok([])),
      stageHistory: async () => waitForRelease("history", ok([])),
      contacts: async () => waitForRelease("contacts", ok([])),
      responses: async () => waitForRelease("responses", ok({ whatsappStatus: "ready", rows: [] })),
    });

    const loading = loadLegalCrmMetrics(fake, {
      orgId: "org-1",
      period,
      observedAt: now.toISOString(),
      canViewFinance: false,
    });

    expect(started).toEqual(["deals", "history", "contacts", "responses"]);
    resolvers.forEach((resolve) => resolve());
    await loading;
  });

  it("uses complete observed history so an earlier win prevents counting a re-win", async () => {
    const historyArguments: string[] = [];
    const fake = repository({
      stageHistory: async (_orgId, observedAt) => {
        historyArguments.push(observedAt);
        return ok([
          { deal_id: "deal-1", to_stage: "ganho", occurred_at: "2026-07-20T12:00:00.000Z", is_baseline: false },
          { deal_id: "deal-1", to_stage: "ganho", occurred_at: "2026-08-05T12:00:00.000Z", is_baseline: false },
        ]);
      },
      costs: async () => ok([{ month: "2026-08-01", marketing_cents: 50_000, commercial_cents: 30_000 }]),
    });

    const metrics = await loadLegalCrmMetrics(fake, {
      orgId: "org-1",
      period,
      observedAt: now.toISOString(),
      canViewFinance: true,
    });

    expect(historyArguments).toEqual([now.toISOString()]);
    expect(metrics.cac).toEqual({ status: "no_wins" });
    expect(metrics.coverage).toEqual({ partial: false, startedAt: "2026-07-20T12:00:00.000Z" });
  });

  it("lets a previous-period cohort mature after the selected period through observedAt", async () => {
    const previousPeriod = resolveLegalCrmPeriod("previous_month", now);
    const fake = repository({
      deals: async () => ok([
        {
          id: "deal-july",
          contact_id: "contact-1",
          stage: "ganho",
          created_at: "2026-07-10T12:00:00.000Z",
          details: {},
          loss_reason_code: null,
        },
      ]),
      contacts: async () => ok([{ id: "contact-1", source: "Indicacao" }]),
      stageHistory: async () => ok([
        { deal_id: "deal-july", to_stage: "novo", occurred_at: "2026-07-10T12:00:00.000Z", is_baseline: false },
        { deal_id: "deal-july", to_stage: "ganho", occurred_at: "2026-08-05T12:00:00.000Z", is_baseline: false },
      ]),
    });

    const metrics = await loadLegalCrmMetrics(fake, {
      orgId: "org-1",
      period: previousPeriod,
      observedAt: now.toISOString(),
      canViewFinance: false,
    });

    expect(metrics.funnel?.map((stage) => stage.reached)).toEqual([1, 1, 1, 1]);
  });

  it("reports WhatsApp as not configured and coverage as unavailable when history is empty", async () => {
    const fake = repository({
      responses: async () => ok({ whatsappStatus: "not_configured", rows: [] }),
    });

    const metrics = await loadLegalCrmMetrics(fake, {
      orgId: "org-1",
      period,
      observedAt: now.toISOString(),
      canViewFinance: false,
    });

    expect(metrics.firstResponse).toEqual({ status: "unavailable", reason: "no_whatsapp" });
    expect(metrics.coverage).toBeNull();
    expect(metrics.availability.coverage).toBe("unavailable");
  });

  it("marks only a failed source unavailable, preserves successful data, and logs no rows", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fake = repository({
      agreements: async () => failed("agreements"),
      payments: async () => ok([
        { contact_id: "contact-1", amount_cents: 75_000, receivable_status: "partial" },
      ]),
    });

    const metrics = await loadLegalCrmMetrics(fake, {
      orgId: "org-private",
      period,
      observedAt: now.toISOString(),
      canViewFinance: true,
    });

    expect(metrics.availability).toMatchObject({
      ltvReceived: "ready",
      ltvContracted: "unavailable",
      ltvUnlinked: "unavailable",
    });
    expect(metrics.ltv?.receivedCents).toBe(75_000);
    expect(log).toHaveBeenCalledTimes(1);
    const serializedLog = String(log.mock.calls[0]?.[0]);
    expect(serializedLog).toContain('"source":"agreements"');
    expect(serializedLog).toContain('"orgId":"org-private"');
    expect(serializedLog).not.toContain("75000");
    log.mockRestore();
  });
});

type RecordedOperation = { name: string; args: unknown[] };
type RecordedQuery = { table: string; operations: RecordedOperation[] };
type SupabaseResponse = { data: unknown; error: unknown };

class QueryRecorder implements PromiseLike<SupabaseResponse> {
  constructor(
    private readonly response: SupabaseResponse,
    readonly record: RecordedQuery,
  ) {}

  private operation(name: string, ...args: unknown[]) {
    this.record.operations.push({ name, args });
    return this;
  }

  select(columns: string) { return this.operation("select", columns); }
  eq(column: string, value: unknown) { return this.operation("eq", column, value); }
  gte(column: string, value: unknown) { return this.operation("gte", column, value); }
  lt(column: string, value: unknown) { return this.operation("lt", column, value); }
  lte(column: string, value: unknown) { return this.operation("lte", column, value); }
  order(column: string, options?: unknown) { return this.operation("order", column, options); }
  range(from: number, to: number) { return this.operation("range", from, to); }
  maybeSingle() { return this.operation("maybeSingle"); }

  then<TResult1 = SupabaseResponse, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.response).then(onfulfilled, onrejected);
  }
}

class SupabaseRecorder {
  readonly queries: RecordedQuery[] = [];

  constructor(private readonly responses: Record<string, SupabaseResponse[]>) {}

  from(table: string) {
    const record = { table, operations: [] } satisfies RecordedQuery;
    this.queries.push(record);
    const response = this.responses[table]?.shift() ?? { data: [], error: null };
    return new QueryRecorder(response, record);
  }
}

function operation(query: RecordedQuery, name: string) {
  return query.operations.filter((candidate) => candidate.name === name).map((candidate) => candidate.args);
}

describe("createSupabaseLegalCrmRepository", () => {
  it("pages complete history with a deterministic order until the final short page", async () => {
    const firstPage = Array.from({ length: 1_000 }, (_, index) => ({
      deal_id: `deal-${index}`,
      to_stage: "novo",
      occurred_at: "2026-08-01T12:00:00.000Z",
      is_baseline: false,
    }));
    const finalRow = {
      deal_id: "deal-final",
      to_stage: "ganho",
      occurred_at: "2026-08-05T12:00:00.000Z",
      is_baseline: false,
    };
    const recorder = new SupabaseRecorder({
      deal_stage_history: [
        { data: firstPage, error: null },
        { data: [finalRow], error: null },
      ],
    });
    const adapter = createSupabaseLegalCrmRepository(recorder as unknown as SupabaseClient);

    const result = await adapter.stageHistory("org-1", now.toISOString());

    expect(result).toEqual(ok([...firstPage, finalRow]));
    const pages = recorder.queries.filter((query) => query.table === "deal_stage_history");
    expect(pages).toHaveLength(2);
    expect(pages.map((query) => operation(query, "range"))).toEqual([
      [[0, 999]],
      [[1_000, 1_999]],
    ]);
    for (const page of pages) {
      expect(operation(page, "order")).toEqual([
        ["occurred_at", { ascending: true }],
        ["id", { ascending: true }],
      ]);
    }
  });

  it("uses explicit columns and tenant/workspace filters, with full history and safe finance joins", async () => {
    const recorder = new SupabaseRecorder({
      deals: [{ data: [], error: null }],
      deal_stage_history: [{ data: [], error: null }],
      contacts: [{ data: [], error: null }],
      whatsapp_instances: [{ data: { id: "wa-1", status: "conectado" }, error: null }],
      whatsapp_conversations: [{ data: [], error: null }],
      law_acquisition_costs: [{ data: [], error: null }],
      fee_agreements: [{ data: [], error: null }],
      receivable_payments: [{
        data: [{ amount_cents: 40_000, receivables: { contact_id: "contact-1", status: "partial" } }],
        error: null,
      }],
    });
    const adapter = createSupabaseLegalCrmRepository(recorder as unknown as SupabaseClient);

    const results = await Promise.all([
      adapter.deals("org-1", period.startIso, period.endIso),
      adapter.stageHistory("org-1", now.toISOString()),
      adapter.contacts("org-1"),
      adapter.responses("org-1", period.startIso, period.endIso),
      adapter.costs("org-1", period.startMonth, period.endMonth),
      adapter.agreements("org-1"),
      adapter.payments("org-1"),
    ]);

    for (const query of recorder.queries) {
      const selected = operation(query, "select");
      expect(selected).toHaveLength(1);
      expect(String(selected[0]?.[0])).not.toContain("*");
      expect(operation(query, "eq")).toContainEqual(["org_id", "org-1"]);
    }

    const workspaceTables = [
      "deals",
      "deal_stage_history",
      "contacts",
      "law_acquisition_costs",
      "fee_agreements",
    ];
    for (const table of workspaceTables) {
      const query = recorder.queries.find((candidate) => candidate.table === table)!;
      expect(operation(query, "eq")).toContainEqual(["workspace_key", "law_office"]);
    }

    const history = recorder.queries.find((query) => query.table === "deal_stage_history")!;
    expect(operation(history, "lte")).toEqual([["occurred_at", now.toISOString()]]);
    expect(operation(history, "gte")).toEqual([]);

    const pagedOrders: Record<string, string[]> = {
      deals: ["created_at", "id"],
      deal_stage_history: ["occurred_at", "id"],
      contacts: ["id"],
      whatsapp_conversations: ["first_inbound_at", "id"],
      fee_agreements: ["id"],
      receivable_payments: ["id"],
    };
    for (const [table, orderedColumns] of Object.entries(pagedOrders)) {
      const query = recorder.queries.find((candidate) => candidate.table === table)!;
      expect(operation(query, "range")).toEqual([[0, 999]]);
      expect(operation(query, "order").map(([column]) => column)).toEqual(orderedColumns);
    }

    const conversations = recorder.queries.find((query) => query.table === "whatsapp_conversations")!;
    expect(operation(conversations, "eq")).toContainEqual(["contacts.org_id", "org-1"]);
    expect(operation(conversations, "eq")).toContainEqual(["contacts.workspace_key", "law_office"]);

    const payments = recorder.queries.find((query) => query.table === "receivable_payments")!;
    expect(operation(payments, "eq")).toContainEqual(["receivables.org_id", "org-1"]);
    expect(operation(payments, "eq")).toContainEqual(["receivables.workspace_key", "law_office"]);
    expect(results[6]).toEqual(ok([
      { contact_id: "contact-1", amount_cents: 40_000, receivable_status: "partial" },
    ]));
  });

  it("resolves the requested civil period and observes history through now", async () => {
    const recorder = new SupabaseRecorder({
      deals: [{ data: [], error: null }],
      deal_stage_history: [{
        data: [{ deal_id: "old", to_stage: "ganho", occurred_at: "2026-07-01T03:00:00.000Z", is_baseline: true }],
        error: null,
      }],
      contacts: [{ data: [], error: null }],
      whatsapp_instances: [{ data: null, error: null }],
    });

    const metrics = await getLegalCrmMetrics({
      supabase: recorder as unknown as SupabaseClient,
      orgId: "org-1",
      periodKey: "previous_month",
      now,
      canViewFinance: false,
    });

    expect(metrics.period).toMatchObject({
      key: "previous_month",
      startIso: "2026-07-01T03:00:00.000Z",
      endIso: "2026-08-01T03:00:00.000Z",
    });
    const history = recorder.queries.find((query) => query.table === "deal_stage_history")!;
    expect(operation(history, "lte")).toEqual([["occurred_at", now.toISOString()]]);
  });

  it("does not query conversations when the organization has no WhatsApp instance", async () => {
    const recorder = new SupabaseRecorder({
      whatsapp_instances: [{ data: null, error: null }],
    });
    const adapter = createSupabaseLegalCrmRepository(recorder as unknown as SupabaseClient);

    const result = await adapter.responses("org-1", period.startIso, period.endIso);

    expect(result).toEqual(ok({ whatsappStatus: "not_configured", rows: [] }));
    expect(recorder.queries.map((query) => query.table)).toEqual(["whatsapp_instances"]);
  });

  it.each(["pendente", "desconectado"])(
    "does not report WhatsApp ready when the instance is %s",
    async (status) => {
      const recorder = new SupabaseRecorder({
        whatsapp_instances: [{ data: { id: "wa-1", status }, error: null }],
      });
      const adapter = createSupabaseLegalCrmRepository(recorder as unknown as SupabaseClient);

      const result = await adapter.responses("org-1", period.startIso, period.endIso);

      expect(result).toEqual(ok({ whatsappStatus: "not_configured", rows: [] }));
      expect(recorder.queries.map((query) => query.table)).toEqual(["whatsapp_instances"]);
    },
  );
});
