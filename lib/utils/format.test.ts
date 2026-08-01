import { describe, expect, it } from "vitest";
import { formatBRL, formatDate, formatDateTime } from "./format";

describe("formatBRL", () => {
  it("formats cents as Brazilian currency", () => {
    expect(formatBRL(150050)).toBe("R$ 1.500,50");
  });

  it("treats null/undefined/NaN as zero", () => {
    expect(formatBRL(null)).toBe("R$ 0,00");
    expect(formatBRL(undefined)).toBe("R$ 0,00");
    expect(formatBRL(NaN)).toBe("R$ 0,00");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as dd/mm/yyyy", () => {
    expect(formatDate("2026-07-10T12:00:00Z")).toBe("10/07/2026");
  });

  it("returns a dash for null or invalid input", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("not-a-date")).toBe("-");
  });
});

describe("formatDateTime", () => {
  it("returns a dash for null or invalid input", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("not-a-date")).toBe("-");
  });

  it("formats a valid ISO datetime", () => {
    const result = formatDateTime("2026-07-10T12:00:00Z");
    expect(result).not.toBe("-");
    expect(result).toMatch(/10\/07/);
  });
});
