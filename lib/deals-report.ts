import type { Deal } from "@/lib/supabase/types";

export type MonthlyDealStats = {
  monthKey: string;
  monthLabel: string;
  created: number;
  won: number;
  lost: number;
  wonValueCents: number;
  conversionRate: number | null;
};

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]}/${date.getFullYear()}`;
}

// Bucketiza por mês de referência: negócio conta em "created" no mês em que
// foi criado, e em "won"/"lost" no mês em que foi fechado (closed_at) — os
// dois podem ser meses diferentes, um negócio pode aparecer nas duas colunas
// em meses distintos.
export function buildMonthlyDealStats(deals: Deal[], from: Date, to: Date): MonthlyDealStats[] {
  const buckets = new Map<string, MonthlyDealStats>();
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    const key = monthKey(cursor);
    buckets.set(key, {
      monthKey: key,
      monthLabel: monthLabel(cursor),
      created: 0,
      won: 0,
      lost: 0,
      wonValueCents: 0,
      conversionRate: null,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const deal of deals) {
    const createdAt = new Date(deal.created_at);
    const createdKey = monthKey(createdAt);
    if (buckets.has(createdKey)) buckets.get(createdKey)!.created++;

    if (deal.closed_at) {
      const closedAt = new Date(deal.closed_at);
      const closedKey = monthKey(closedAt);
      const bucket = buckets.get(closedKey);
      if (bucket) {
        if (deal.stage === "ganho") {
          bucket.won++;
          bucket.wonValueCents += deal.value_cents ?? 0;
        } else if (deal.stage === "perdido") {
          bucket.lost++;
        }
      }
    }
  }

  for (const bucket of Array.from(buckets.values())) {
    const closed = bucket.won + bucket.lost;
    bucket.conversionRate = closed > 0 ? Math.round((bucket.won / closed) * 100) : null;
  }

  return Array.from(buckets.values());
}

export function dealsToCsv(deals: Deal[]): string {
  const header = ["titulo", "estagio", "valor_centavos", "criado_em", "fechado_em"];
  const lines = deals.map((d) =>
    [
      csvEscape(d.title),
      d.stage,
      String(d.value_cents ?? ""),
      d.created_at,
      d.closed_at ?? "",
    ].join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}
