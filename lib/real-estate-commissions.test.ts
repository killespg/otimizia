import { describe, expect, it } from "vitest";
import { isCommissionOverdue } from "./real-estate-commissions";

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
