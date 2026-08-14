import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/utils/logger";
import {
  buildLegalCrmMetrics,
  resolveLegalCrmPeriod,
  type LegalCrmLossReasonCode,
  type LegalCrmMetricQuerySource,
  type LegalCrmMetrics,
  type LegalCrmPeriod,
  type LegalCrmPeriodKey,
  type LegalCrmStage,
  type LegalCrmStageHistoryRow,
} from "./legal-crm-metrics";

const LEGAL_WORKSPACE = "law_office";
const QUERY_PAGE_SIZE = 1_000;

export type DealMetricRow = {
  id: string;
  contact_id: string | null;
  stage: LegalCrmStage;
  created_at: string;
  details: Record<string, unknown> | null;
  loss_reason_code: LegalCrmLossReasonCode | null;
};

export type StageMetricRow = LegalCrmStageHistoryRow;
type StageMetricQueryRow = StageMetricRow & {
  deal_parent: { details: Record<string, unknown> | null } | Array<{ details: Record<string, unknown> | null }>;
};
export type ContactMetricRow = { id: string; source: string | null };
export type ResponseMetricRow = {
  first_inbound_at: string;
  first_response_at: string | null;
  first_response_sent_by: "ai" | "human" | null;
};
export type ResponseMetricData = {
  whatsappStatus: "ready" | "not_configured";
  rows: ResponseMetricRow[];
};
export type CostMetricRow = { month: string; marketing_cents: number; commercial_cents: number };
export type AgreementMetricRow = {
  contact_id: string | null;
  total_cents: number;
  status: "draft" | "active" | "completed" | "cancelled";
};
export type PaymentMetricRow = {
  contact_id: string | null;
  amount_cents: number;
  receivable_status: "pending" | "partial" | "paid" | "cancelled";
};

export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; data: T; source: LegalCrmMetricQuerySource };

export interface LegalCrmRepository {
  deals(orgId: string, start: string, end: string): Promise<QueryResult<DealMetricRow[]>>;
  stageHistory(orgId: string, observedAt: string): Promise<QueryResult<StageMetricRow[]>>;
  contacts(orgId: string): Promise<QueryResult<ContactMetricRow[]>>;
  responses(orgId: string, start: string, end: string): Promise<QueryResult<ResponseMetricData>>;
  costs(orgId: string, startMonth: string, endMonth: string): Promise<QueryResult<CostMetricRow[]>>;
  agreements(orgId: string): Promise<QueryResult<AgreementMetricRow[]>>;
  payments(orgId: string): Promise<QueryResult<PaymentMetricRow[]>>;
}

function failedResult<T>(source: LegalCrmMetricQuerySource, data: T): QueryResult<T> {
  return { ok: false, data, source };
}

function successfulRows<T>(data: T[] | null): QueryResult<T[]> {
  return { ok: true, data: data ?? [] };
}

function queryRows<T>(
  source: LegalCrmMetricQuerySource,
  result: { data: T[] | null; error: unknown },
): QueryResult<T[]> {
  return result.error ? failedResult(source, []) : successfulRows(result.data);
}

async function pagedRows<T>(
  source: LegalCrmMetricQuerySource,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<QueryResult<T[]>> {
  const data: T[] = [];
  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const result = await page(from, from + QUERY_PAGE_SIZE - 1);
    if (result.error) return failedResult(source, []);
    const rows = result.data ?? [];
    data.push(...rows);
    if (rows.length < QUERY_PAGE_SIZE) return { ok: true, data };
  }
}

function joinedRecord(value: unknown) {
  const joined = value;
  if (Array.isArray(joined)) return joined[0] as Record<string, unknown> | undefined;
  return joined && typeof joined === "object" ? joined as Record<string, unknown> : undefined;
}

function isPipelinePlaceholder(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return false;
  const marker = (details as Record<string, unknown>).pipeline_list_placeholder;
  return marker === "true" || marker === true;
}

export function createSupabaseLegalCrmRepository(supabase: SupabaseClient): LegalCrmRepository {
  return {
    async deals(orgId, start, end) {
      return pagedRows<DealMetricRow>("deals", (from, to) => supabase
          .from("deals")
          .select("id,contact_id,stage,created_at,details,loss_reason_code")
          .eq("org_id", orgId)
          .eq("workspace_key", LEGAL_WORKSPACE)
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: DealMetricRow[] | null; error: unknown }>);
    },

    async stageHistory(orgId, observedAt) {
      const result = await pagedRows<StageMetricQueryRow>("history", (from, to) => supabase
          .from("deal_stage_history")
          .select("deal_id,to_stage,occurred_at,is_baseline,deal_parent:deals!inner(details,org_id,workspace_key)")
          .eq("org_id", orgId)
          .eq("workspace_key", LEGAL_WORKSPACE)
          .eq("deal_parent.org_id", orgId)
          .eq("deal_parent.workspace_key", LEGAL_WORKSPACE)
          .lte("occurred_at", observedAt)
          .order("occurred_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: StageMetricQueryRow[] | null; error: unknown }>);
      if (!result.ok) return result;
      return {
        ok: true,
        data: result.data.flatMap((row) => {
          const parent = joinedRecord(row.deal_parent);
          if (!parent || isPipelinePlaceholder(parent.details)) return [];
          return [{
            deal_id: row.deal_id,
            to_stage: row.to_stage,
            occurred_at: row.occurred_at,
            is_baseline: row.is_baseline,
          }];
        }),
      };
    },

    async contacts(orgId) {
      return pagedRows<ContactMetricRow>("contacts", (from, to) => supabase
          .from("contacts")
          .select("id,source")
          .eq("org_id", orgId)
          .eq("workspace_key", LEGAL_WORKSPACE)
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: ContactMetricRow[] | null; error: unknown }>);
    },

    async responses(orgId, start, end) {
      const instanceResult = await supabase
        .from("whatsapp_instances")
        .select("id,status")
        .eq("org_id", orgId)
        .maybeSingle();
      if (instanceResult.error) {
        return failedResult("responses", { whatsappStatus: "ready", rows: [] });
      }
      if (!instanceResult.data || instanceResult.data.status !== "conectado") {
        return { ok: true, data: { whatsappStatus: "not_configured", rows: [] } };
      }

      const conversations = await pagedRows<ResponseMetricRow>("responses", (from, to) => supabase
          .from("whatsapp_conversations")
          .select("first_inbound_at,first_response_at,first_response_sent_by,contacts!inner(id,org_id,workspace_key)")
          .eq("org_id", orgId)
          .eq("contacts.org_id", orgId)
          .eq("contacts.workspace_key", LEGAL_WORKSPACE)
          .gte("first_inbound_at", start)
          .lt("first_inbound_at", end)
          .order("first_inbound_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: ResponseMetricRow[] | null; error: unknown }>);
      return conversations.ok
        ? { ok: true, data: { whatsappStatus: "ready", rows: conversations.data } }
        : failedResult("responses", { whatsappStatus: "ready", rows: [] });
    },

    async costs(orgId, startMonth, endMonth) {
      const result = await supabase
        .from("law_acquisition_costs")
        .select("month,marketing_cents,commercial_cents")
        .eq("org_id", orgId)
        .eq("workspace_key", LEGAL_WORKSPACE)
        .gte("month", startMonth)
        .lte("month", endMonth);
      return queryRows("costs", result as { data: CostMetricRow[] | null; error: unknown });
    },

    async agreements(orgId) {
      return pagedRows<AgreementMetricRow>("agreements", (from, to) => supabase
          .from("fee_agreements")
          .select("contact_id,total_cents,status")
          .eq("org_id", orgId)
          .eq("workspace_key", LEGAL_WORKSPACE)
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: AgreementMetricRow[] | null; error: unknown }>);
    },

    async payments(orgId) {
      const result = await pagedRows<Record<string, unknown>>("payments", (from, to) => supabase
          .from("receivable_payments")
          .select("amount_cents,receivables!inner(contact_id,status,org_id,workspace_key)")
          .eq("org_id", orgId)
          .eq("receivables.org_id", orgId)
          .eq("receivables.workspace_key", LEGAL_WORKSPACE)
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: Record<string, unknown>[] | null; error: unknown }>);
      if (!result.ok) return failedResult("payments", []);

      const rows = result.data.flatMap((row) => {
        const parent = joinedRecord(row.receivables);
        if (!parent) return [];
        return [{
          contact_id: typeof parent.contact_id === "string" ? parent.contact_id : null,
          amount_cents: Number(row.amount_cents),
          receivable_status: parent.status as PaymentMetricRow["receivable_status"],
        }];
      });
      return { ok: true, data: rows };
    },
  };
}

function logQueryFailure(source: LegalCrmMetricQuerySource, orgId: string) {
  logError("legal-crm-data.query-failed", "query_failed", { source, orgId });
}

async function settle<T>(
  source: LegalCrmMetricQuerySource,
  orgId: string,
  fallback: T,
  query: () => Promise<QueryResult<T>>,
): Promise<QueryResult<T>> {
  try {
    const result = await query();
    if (result.ok) return result;
    logQueryFailure(source, orgId);
    return failedResult(source, fallback);
  } catch {
    logQueryFailure(source, orgId);
    return failedResult(source, fallback);
  }
}

function coverageStart(rows: StageMetricRow[], observedAt: string) {
  const upperBound = new Date(observedAt).getTime();
  const valid = rows
    .map((row) => ({ value: row.occurred_at, timestamp: new Date(row.occurred_at).getTime() }))
    .filter((entry) => Number.isFinite(entry.timestamp) && entry.timestamp <= upperBound)
    .sort((left, right) => left.timestamp - right.timestamp);
  return valid[0]?.value ?? null;
}

function legacyLossReason(details: Record<string, unknown> | null) {
  const reason = details?.loss_reason;
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}

export async function loadLegalCrmMetrics(
  repository: LegalCrmRepository,
  input: {
    orgId: string;
    period: LegalCrmPeriod;
    observedAt: string;
    canViewFinance: boolean;
  },
): Promise<LegalCrmMetrics> {
  const [deals, history, contacts, responses] = await Promise.all([
    settle("deals", input.orgId, [], () => repository.deals(input.orgId, input.period.startIso, input.period.endIso)),
    settle("history", input.orgId, [], () => repository.stageHistory(input.orgId, input.observedAt)),
    settle("contacts", input.orgId, [], () => repository.contacts(input.orgId)),
    settle("responses", input.orgId, { whatsappStatus: "ready" as const, rows: [] }, () => (
      repository.responses(input.orgId, input.period.startIso, input.period.endIso)
    )),
  ]);

  let costs: QueryResult<CostMetricRow[]> = { ok: true, data: [] };
  let agreements: QueryResult<AgreementMetricRow[]> = { ok: true, data: [] };
  let payments: QueryResult<PaymentMetricRow[]> = { ok: true, data: [] };
  if (input.canViewFinance) {
    [costs, agreements, payments] = await Promise.all([
      settle("costs", input.orgId, [], () => repository.costs(input.orgId, input.period.startMonth, input.period.endMonth)),
      settle("agreements", input.orgId, [], () => repository.agreements(input.orgId)),
      settle("payments", input.orgId, [], () => repository.payments(input.orgId)),
    ]);
  }

  const allResults: QueryResult<unknown>[] = [deals, history, contacts, responses];
  if (input.canViewFinance) allResults.push(costs, agreements, payments);
  const failedSources = allResults.flatMap((result) => result.ok ? [] : [result.source]);

  const dealRows = deals.ok ? deals.data : [];
  const historyRows = history.ok ? history.data : [];
  const responseData = responses.ok
    ? responses.data
    : { whatsappStatus: "ready" as const, rows: [] };

  return buildLegalCrmMetrics({
    period: input.period,
    deals: dealRows.map((deal) => ({
      id: deal.id,
      contact_id: deal.contact_id,
      stage: deal.stage,
      created_at: deal.created_at,
      is_placeholder: isPipelinePlaceholder(deal.details),
    })),
    stageHistory: {
      completeness: "complete_through_observed_at",
      observedAt: input.observedAt,
      rows: historyRows,
    },
    contacts: contacts.ok ? contacts.data : [],
    responses: responseData.rows,
    costs: costs.ok ? costs.data : [],
    agreements: agreements.ok ? agreements.data : [],
    payments: payments.ok ? payments.data : [],
    lossRows: dealRows
      .filter((deal) => deal.stage === "perdido" && !isPipelinePlaceholder(deal.details))
      .map((deal) => ({
        loss_reason_code: deal.loss_reason_code,
        legacy_reason: legacyLossReason(deal.details),
      })),
    canViewFinance: input.canViewFinance,
    coverageStartedAt: history.ok ? coverageStart(historyRows, input.observedAt) : null,
    whatsappStatus: responseData.whatsappStatus,
    failedSources,
  });
}

export async function getLegalCrmMetrics(input: {
  supabase: SupabaseClient;
  orgId: string;
  periodKey: LegalCrmPeriodKey;
  now: Date;
  canViewFinance: boolean;
}) {
  const period = resolveLegalCrmPeriod(input.periodKey, input.now);
  return loadLegalCrmMetrics(createSupabaseLegalCrmRepository(input.supabase), {
    orgId: input.orgId,
    period,
    observedAt: input.now.toISOString(),
    canViewFinance: input.canViewFinance,
  });
}
