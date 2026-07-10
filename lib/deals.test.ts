import { describe, expect, it } from "vitest";
import {
  dealValueOrZero,
  formatCommission,
  formatDealValue,
  getCommissionCents,
  getCommissionPercent,
  getDealValueCents,
} from "./deals";

describe("getDealValueCents", () => {
  it("returns the cents value when set", () => {
    expect(getDealValueCents({ value_cents: 150000, details: {} })).toBe(150000);
  });

  it("returns null when details.value_unset is 'true'", () => {
    expect(getDealValueCents({ value_cents: 150000, details: { value_unset: "true" } })).toBeNull();
  });

  it("returns null for missing/non-finite value_cents", () => {
    expect(getDealValueCents({ value_cents: null as unknown as number, details: {} })).toBeNull();
  });
});

describe("dealValueOrZero", () => {
  it("returns 0 when the value is unset", () => {
    expect(dealValueOrZero({ value_cents: 500, details: { value_unset: "true" } })).toBe(0);
  });

  it("returns the cents value otherwise", () => {
    expect(dealValueOrZero({ value_cents: 500, details: {} })).toBe(500);
  });
});

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

describe("formatDealValue", () => {
  it("formats as currency when set", () => {
    expect(formatDealValue({ value_cents: 150050, details: {} })).toBe(brl(150050));
  });

  it("shows 'Sem preço' when unset", () => {
    expect(formatDealValue({ value_cents: 150050, details: { value_unset: "true" } })).toBe("Sem preço");
  });
});

describe("getCommissionPercent", () => {
  it("parses a comma-decimal percent", () => {
    expect(getCommissionPercent({ details: { commission_percent: "5,5" } })).toBe(5.5);
  });

  it("returns null for missing or negative/invalid values", () => {
    expect(getCommissionPercent({ details: {} })).toBeNull();
    expect(getCommissionPercent({ details: { commission_percent: "-1" } })).toBeNull();
    expect(getCommissionPercent({ details: { commission_percent: "abc" } })).toBeNull();
  });
});

describe("getCommissionCents / formatCommission", () => {
  it("computes commission cents from value and percent", () => {
    const deal = { value_cents: 100000, details: { commission_percent: "10" } };
    expect(getCommissionCents(deal)).toBe(10000);
    expect(formatCommission(deal)).toBe(brl(10000));
  });

  it("returns null when value or percent is missing", () => {
    expect(getCommissionCents({ value_cents: 100000, details: {} })).toBeNull();
    expect(formatCommission({ value_cents: 100000, details: {} })).toBeNull();
  });
});
