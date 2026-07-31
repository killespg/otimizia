import type { RealEstateCommission } from "@/lib/supabase/types";

export type CommissionPeriod = {
  from: string;
  to: string;
  fromIso: string;
  toIso: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstOfMonth(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function lastOfMonth(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

function validDate(value: string | null | undefined): value is string {
  return Boolean(value && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

export function normalizeCommissionPeriod(
  rawFrom: string | null | undefined,
  rawTo: string | null | undefined,
  now = new Date(),
): CommissionPeriod {
  const fallbackFrom = firstOfMonth(now);
  const fallbackTo = lastOfMonth(now);
  const from = validDate(rawFrom) ? rawFrom : fallbackFrom;
  const to = validDate(rawTo) && rawTo >= from ? rawTo : fallbackTo;
  return {
    from,
    to,
    fromIso: `${from}T00:00:00.000Z`,
    toIso: `${to}T23:59:59.999Z`,
  };
}

export function commissionPeriodOrFilter(period: CommissionPeriod): string {
  return [
    `and(due_at.gte.${period.fromIso},due_at.lte.${period.toIso})`,
    `and(received_at.gte.${period.fromIso},received_at.lte.${period.toIso})`,
  ].join(",");
}

export function isCommissionDueInPeriod(
  commission: Pick<RealEstateCommission, "due_at">,
  period: CommissionPeriod,
): boolean {
  return Boolean(
    commission.due_at &&
      commission.due_at >= period.fromIso &&
      commission.due_at <= period.toIso,
  );
}

export function isCommissionReceivedInPeriod(
  commission: Pick<RealEstateCommission, "received_at">,
  period: CommissionPeriod,
): boolean {
  return Boolean(
    commission.received_at &&
      commission.received_at >= period.fromIso &&
      commission.received_at <= period.toIso,
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}

// Mesmo padrão de lib/deals-report.ts (dealsToCsv) — export simples sem
// dependência externa.
export function commissionsToCsv(commissions: RealEstateCommission[]): string {
  const header = ["status", "valor_venda_centavos", "percentual", "valor_previsto_centavos", "valor_recebido_centavos", "vencimento", "recebido_em", "criado_em"];
  const lines = commissions.map((c) =>
    [
      c.status,
      String(c.gross_sale_value_cents),
      String(c.commission_percent),
      String(c.expected_amount_cents),
      String(c.received_amount_cents),
      c.due_at ?? "",
      c.received_at ?? "",
      c.created_at,
    ]
      .map((v) => csvEscape(v))
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function isCommissionOverdue(commission: Pick<RealEstateCommission, "status" | "due_at">): boolean {
  if (commission.status === "received" || commission.status === "cancelled") return false;
  if (!commission.due_at) return false;
  return new Date(commission.due_at) < new Date();
}
