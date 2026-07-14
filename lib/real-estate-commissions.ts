import type { RealEstateCommission } from "@/lib/supabase/types";

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
