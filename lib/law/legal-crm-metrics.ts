const LEGAL_CRM_TIME_ZONE = "America/Sao_Paulo";

export type LegalCrmLossReasonCode = "price" | "competitor" | "no_response" | "timing" | "profile_mismatch" | "other";

const FUNNEL_STAGES = ["novo", "em_contato", "negociacao", "ganho"] as const;
const FUNNEL_LABELS: Record<LegalCrmFunnelStage, string> = {
  novo: "Novo lead",
  em_contato: "Qualificação",
  negociacao: "Proposta enviada",
  ganho: "Contratado",
};
const STAGE_RANK: Record<LegalCrmStage, number> = {
  novo: 0,
  em_contato: 1,
  negociacao: 2,
  ganho: 3,
  perdido: -1,
};
const LOSS_LABELS: Record<LegalCrmLossReasonCode, string> = {
  price: "Preço",
  competitor: "Contratou concorrente",
  no_response: "Falta de retorno",
  timing: "Momento inadequado",
  profile_mismatch: "Perfil incompatível",
  other: "Outro",
};

export type MetricValue<T> =
  | { status: "ready"; value: T }
  | { status: "empty" }
  | { status: "unavailable"; reason: "missing_cost" | "no_wins" | "no_whatsapp" | "partial_failure" };

export type LegalCrmPeriodKey = "current_month" | "previous_month" | "last_3_months" | "last_6_months";

export type LegalCrmPeriod = {
  key: LegalCrmPeriodKey;
  label: string;
  startIso: string;
  endIso: string;
  startMonth: string;
  endMonth: string;
  isPartial: boolean;
};

export type LegalCrmFunnelStage = (typeof FUNNEL_STAGES)[number];
export type LegalCrmStage = LegalCrmFunnelStage | "perdido";

export type LegalCrmMetrics = {
  period: LegalCrmPeriod;
  firstResponse:
    | { status: "ready"; medianMinutes: number; responded: number; pending: number; ai: number; human: number }
    | { status: "empty" | "unavailable"; reason: "no_whatsapp" | "no_conversations" | "partial_failure" };
  leads: { total: number; qualified: number };
  funnel: Array<{
    stage: LegalCrmFunnelStage;
    label: string;
    reached: number;
    conversionFromPrevious: number | null;
  }>;
  origins: Array<{
    source: string;
    leads: number;
    qualified: number;
    wins: number;
    conversion: number | null;
    receivedCents: number | null;
  }>;
  losses: Array<{ code: string; label: string; count: number }>;
  cac:
    | { status: "ready"; valueCents: number; totalCostCents: number; wins: number }
    | { status: "hidden" | "not_configured" | "no_wins" };
  ltv: { receivedCents: number | null; contractedCents: number | null; unlinkedRecords: number } | null;
  coverage: { partial: boolean; startedAt: string | null };
};

export type LegalCrmMetricInput = {
  period: LegalCrmPeriod;
  deals: Array<{ id: string; contact_id: string | null; stage: LegalCrmStage; created_at: string; is_placeholder: boolean }>;
  stageHistory: Array<{ deal_id: string; to_stage: LegalCrmStage; occurred_at: string; is_baseline: boolean }>;
  contacts: Array<{ id: string; source: string | null }>;
  responses: Array<{
    first_inbound_at: string;
    first_response_at: string | null;
    first_response_sent_by: "ai" | "human" | null;
  }>;
  costs: Array<{ month: string; marketing_cents: number; commercial_cents: number }>;
  agreements: Array<{ contact_id: string | null; total_cents: number; status: "draft" | "active" | "completed" | "cancelled" }>;
  payments: Array<{ contact_id: string | null; amount_cents: number; receivable_status: "pending" | "partial" | "paid" | "cancelled" }>;
  lossRows: Array<{ loss_reason_code: LegalCrmLossReasonCode | null; legacy_reason: string | null }>;
  canViewFinance: boolean;
  coverageStartedAt: string | null;
  whatsappStatus?: "ready" | "not_configured" | "partial_failure";
};

type ZonedDateParts = { year: number; month: number; day: number };

function zonedDateParts(value: Date): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEGAL_CRM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function zonedMidnightUtc(year: number, monthIndex: number, day: number) {
  let result = new Date(Date.UTC(year, monthIndex, day));
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEGAL_CRM_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(result).map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    result = new Date(result.getTime() + (Date.UTC(year, monthIndex, day) - represented));
  }
  return result;
}

function monthAtOffset(year: number, monthIndex: number, offset: number) {
  const normalized = new Date(Date.UTC(year, monthIndex + offset, 1));
  return { year: normalized.getUTCFullYear(), monthIndex: normalized.getUTCMonth() };
}

function monthIso(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

export function resolveLegalCrmPeriod(key: LegalCrmPeriodKey, now: Date): LegalCrmPeriod {
  const localNow = zonedDateParts(now);
  const current = { year: localNow.year, monthIndex: localNow.month - 1 };
  const configuration: Record<LegalCrmPeriodKey, { label: string; startOffset: number; isPartial: boolean }> = {
    current_month: { label: "Este mês", startOffset: 0, isPartial: true },
    previous_month: { label: "Mês anterior", startOffset: -1, isPartial: false },
    last_3_months: { label: "Últimos 3 meses", startOffset: -2, isPartial: true },
    last_6_months: { label: "Últimos 6 meses", startOffset: -5, isPartial: true },
  };
  const selected = configuration[key];
  const start = monthAtOffset(current.year, current.monthIndex, selected.startOffset);
  const end = key === "previous_month" ? current : undefined;

  return {
    key,
    label: selected.label,
    startIso: zonedMidnightUtc(start.year, start.monthIndex, 1).toISOString(),
    endIso: end ? zonedMidnightUtc(end.year, end.monthIndex, 1).toISOString() : now.toISOString(),
    startMonth: monthIso(start.year, start.monthIndex),
    endMonth: monthIso((key === "previous_month" ? start : current).year, (key === "previous_month" ? start : current).monthIndex),
    isPartial: selected.isPartial,
  };
}

function isInPeriod(timestamp: string, period: LegalCrmPeriod) {
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && value >= new Date(period.startIso).getTime() && value < new Date(period.endIso).getTime();
}

function percentage(numerator: number, denominator: number) {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 10_000) / 100;
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function sourceName(source: string | null | undefined) {
  return source?.trim() || "Sem origem";
}

function includedMonths(period: LegalCrmPeriod) {
  const start = new Date(`${period.startMonth}T00:00:00Z`);
  const end = new Date(`${period.endMonth}T00:00:00Z`);
  const months: string[] = [];
  for (let cursor = start; cursor <= end; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    months.push(cursor.toISOString().slice(0, 10));
  }
  return months;
}

function buildFirstResponse(input: LegalCrmMetricInput): LegalCrmMetrics["firstResponse"] {
  if (input.whatsappStatus === "not_configured") return { status: "unavailable", reason: "no_whatsapp" };
  if (input.whatsappStatus === "partial_failure") return { status: "unavailable", reason: "partial_failure" };

  const responses = input.responses.filter((response) => isInPeriod(response.first_inbound_at, input.period));
  if (responses.length === 0) return { status: "empty", reason: "no_conversations" };

  const answered = responses.filter((response) => {
    if (!response.first_response_at || !response.first_response_sent_by) return false;
    return new Date(response.first_response_at).getTime() >= new Date(response.first_inbound_at).getTime();
  });
  const durations = answered.map((response) => (
    (new Date(response.first_response_at!).getTime() - new Date(response.first_inbound_at).getTime()) / 60_000
  ));

  if (durations.length === 0) return { status: "empty", reason: "no_conversations" };

  return {
    status: "ready",
    medianMinutes: median(durations),
    responded: answered.length,
    pending: responses.length - answered.length,
    ai: answered.filter((response) => response.first_response_sent_by === "ai").length,
    human: answered.filter((response) => response.first_response_sent_by === "human").length,
  };
}

export function buildLegalCrmMetrics(input: LegalCrmMetricInput): LegalCrmMetrics {
  const cohort = input.deals.filter((deal) => !deal.is_placeholder && isInPeriod(deal.created_at, input.period));
  const cohortDealIds = new Set(cohort.map((deal) => deal.id));
  const highestReached = new Map<string, number>();

  for (const entry of input.stageHistory) {
    if (entry.is_baseline || !cohortDealIds.has(entry.deal_id) || !isInPeriod(entry.occurred_at, input.period)) continue;
    const rank = STAGE_RANK[entry.to_stage];
    if (rank >= 0) highestReached.set(entry.deal_id, Math.max(highestReached.get(entry.deal_id) ?? 0, rank));
  }

  const funnel = FUNNEL_STAGES.map((stage, index) => {
    const reached = index === 0
      ? cohort.length
      : cohort.filter((deal) => (highestReached.get(deal.id) ?? 0) >= index).length;
    const previousReached = index === 0 ? null : (index === 1 ? cohort.length : undefined);
    const denominator = previousReached ?? (index > 1 ? cohort.filter((deal) => (highestReached.get(deal.id) ?? 0) >= index - 1).length : 0);
    return {
      stage,
      label: FUNNEL_LABELS[stage],
      reached,
      conversionFromPrevious: index === 0 ? null : percentage(reached, denominator),
    };
  });

  const contactById = new Map(input.contacts.map((contact) => [contact.id, contact]));
  const leadContacts = new Set(cohort.flatMap((deal) => deal.contact_id ? [deal.contact_id] : []));
  const qualifiedContacts = new Set(cohort.flatMap((deal) => (
    deal.contact_id && (highestReached.get(deal.id) ?? 0) >= STAGE_RANK.em_contato ? [deal.contact_id] : []
  )));
  const wonContacts = new Set(cohort.flatMap((deal) => (
    deal.contact_id && (highestReached.get(deal.id) ?? 0) >= STAGE_RANK.ganho ? [deal.contact_id] : []
  )));

  const paidByContact = new Map<string, number>();
  if (input.canViewFinance) {
    for (const payment of input.payments) {
      if (payment.receivable_status !== "paid" || !payment.contact_id) continue;
      paidByContact.set(payment.contact_id, (paidByContact.get(payment.contact_id) ?? 0) + payment.amount_cents);
    }
  }

  const originGroups = new Map<string, { contacts: Set<string>; qualified: Set<string>; wins: Set<string>; receivedCents: number }>();
  for (const contactId of leadContacts) {
    const source = sourceName(contactById.get(contactId)?.source);
    const group = originGroups.get(source) ?? { contacts: new Set(), qualified: new Set(), wins: new Set(), receivedCents: 0 };
    group.contacts.add(contactId);
    if (qualifiedContacts.has(contactId)) group.qualified.add(contactId);
    if (wonContacts.has(contactId)) group.wins.add(contactId);
    group.receivedCents += paidByContact.get(contactId) ?? 0;
    originGroups.set(source, group);
  }
  const origins = [...originGroups.entries()]
    .map(([source, group]) => ({
      source,
      leads: group.contacts.size,
      qualified: group.qualified.size,
      wins: group.wins.size,
      conversion: percentage(group.wins.size, group.contacts.size),
      receivedCents: input.canViewFinance ? group.receivedCents : null,
    }))
    .sort((left, right) => right.leads - left.leads || left.source.localeCompare(right.source, "pt-BR"));

  const lossCounts = new Map<string, { label: string; count: number }>();
  for (const loss of input.lossRows) {
    const code = loss.loss_reason_code ?? "uncategorized";
    const label = loss.loss_reason_code ? LOSS_LABELS[loss.loss_reason_code] : "Não categorizado";
    const current = lossCounts.get(code) ?? { label, count: 0 };
    current.count += 1;
    lossCounts.set(code, current);
  }
  const losses = [...lossCounts.entries()]
    .map(([code, value]) => ({ code, ...value }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"));

  const winDeals = cohort.filter((deal) => (highestReached.get(deal.id) ?? 0) >= STAGE_RANK.ganho);
  const costsByMonth = new Map<string, { marketing_cents: number; commercial_cents: number }>();
  for (const cost of input.costs) {
    if (!includedMonths(input.period).includes(cost.month)) continue;
    const current = costsByMonth.get(cost.month) ?? { marketing_cents: 0, commercial_cents: 0 };
    current.marketing_cents += cost.marketing_cents;
    current.commercial_cents += cost.commercial_cents;
    costsByMonth.set(cost.month, current);
  }
  const requiredMonths = includedMonths(input.period);
  const cac = !input.canViewFinance
    ? { status: "hidden" as const }
    : requiredMonths.some((month) => !costsByMonth.has(month))
      ? { status: "not_configured" as const }
      : winDeals.length === 0
        ? { status: "no_wins" as const }
        : (() => {
            const totalCostCents = [...costsByMonth.values()].reduce(
              (sum, cost) => sum + cost.marketing_cents + cost.commercial_cents,
              0,
            );
            return {
              status: "ready" as const,
              valueCents: Math.round(totalCostCents / winDeals.length),
              totalCostCents,
              wins: winDeals.length,
            };
          })();

  const ltv = input.canViewFinance ? (() => {
    const validAgreements = input.agreements.filter((agreement) => (
      (agreement.status === "active" || agreement.status === "completed") && Boolean(agreement.contact_id)
    ));
    const validPayments = input.payments.filter((payment) => payment.receivable_status === "paid" && Boolean(payment.contact_id));
    const unlinkedRecords = input.agreements.filter((agreement) => (
      (agreement.status === "active" || agreement.status === "completed") && !agreement.contact_id
    )).length + input.payments.filter((payment) => payment.receivable_status === "paid" && !payment.contact_id).length;
    const agreementContacts = new Set(validAgreements.map((agreement) => agreement.contact_id!));
    const paymentContacts = new Set(validPayments.map((payment) => payment.contact_id!));
    const contractedCents = validAgreements.length === 0
      ? null
      : Math.round(validAgreements.reduce((sum, agreement) => sum + agreement.total_cents, 0) / agreementContacts.size);
    const receivedCents = validPayments.length === 0
      ? null
      : Math.round(validPayments.reduce((sum, payment) => sum + payment.amount_cents, 0) / paymentContacts.size);
    return { receivedCents, contractedCents, unlinkedRecords };
  })() : null;

  const coverageStartedAt = input.coverageStartedAt;
  const coveragePartial = coverageStartedAt !== null && new Date(coverageStartedAt).getTime() > new Date(input.period.startIso).getTime();

  return {
    period: input.period,
    firstResponse: buildFirstResponse(input),
    leads: { total: leadContacts.size, qualified: qualifiedContacts.size },
    funnel,
    origins,
    losses,
    cac,
    ltv,
    coverage: { partial: coveragePartial, startedAt: coverageStartedAt },
  };
}
