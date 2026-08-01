import { describe, expect, it } from "vitest";
import {
  commissionPeriodOrFilter,
  isCommissionDueInPeriod,
  isCommissionOverdue,
  isCommissionReceivedInPeriod,
  normalizeCommissionPeriod,
} from "./real-estate-commissions";

describe("isCommissionOverdue", () => {
  it("é vencida quando due_at já passou e status ainda não é received/cancelled", () => {
    expect(isCommissionOverdue({ status: "expected", due_at: "2020-01-01" })).toBe(true);
    expect(isCommissionOverdue({ status: "partial", due_at: "2020-01-01" })).toBe(true);
  });

  it("não é vencida quando já foi recebida ou cancelada, mesmo com due_at no passado", () => {
    expect(isCommissionOverdue({ status: "received", due_at: "2020-01-01" })).toBe(false);
    expect(isCommissionOverdue({ status: "cancelled", due_at: "2020-01-01" })).toBe(false);
  });

  it("não é vencida sem due_at definido", () => {
    expect(isCommissionOverdue({ status: "expected", due_at: null })).toBe(false);
  });

  it("não é vencida quando due_at está no futuro", () => {
    expect(isCommissionOverdue({ status: "expected", due_at: "2099-01-01" })).toBe(false);
  });
});

describe("período financeiro das comissões", () => {
  const period = normalizeCommissionPeriod("2026-07-01", "2026-07-31");

  it("usa vencimento para previsão e received_at para caixa recebido", () => {
    const commission = {
      due_at: "2026-07-10T12:00:00.000Z",
      received_at: "2026-08-02T12:00:00.000Z",
    };
    expect(isCommissionDueInPeriod(commission, period)).toBe(true);
    expect(isCommissionReceivedInPeriod(commission, period)).toBe(false);
  });

  it("gera filtro de união sem usar created_at", () => {
    const filter = commissionPeriodOrFilter(period);
    expect(filter).toContain("due_at.gte.2026-07-01");
    expect(filter).toContain("received_at.lte.2026-07-31");
    expect(filter).not.toContain("created_at");
  });

  it("recusa datas inválidas e intervalo invertido", () => {
    const fallback = normalizeCommissionPeriod(
      "javascript:alert(1)",
      "2026-01-01",
      new Date("2026-07-15T12:00:00Z"),
    );
    expect(fallback.from).toBe("2026-07-01");
    expect(fallback.to).toBe("2026-07-31");
  });
});
