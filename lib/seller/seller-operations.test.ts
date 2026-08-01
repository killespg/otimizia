import { describe, expect, it } from "vitest";
import {
  daysUntil,
  isWarrantyExpired,
  modulesForSalesModels,
  sellerProfileWithDefaults,
} from "./seller-operations";

describe("seller operations", () => {
  it("activates the shared modules for mixed product operations", () => {
    expect(modulesForSalesModels(["fashion", "durable"])).toEqual(expect.arrayContaining([
      "catalog", "orders", "collections", "variants", "inventory", "warranties", "delivery",
    ]));
  });

  it("sanitizes profile configuration", () => {
    expect(sellerProfileWithDefaults({
      sales_models: ["fashion", "unknown"] as never,
      enabled_modules: ["catalog", "warranties", "invalid"] as never,
      default_warranty_days: 99999,
      low_stock_threshold: -10,
      allow_negative_stock: true,
    })).toMatchObject({
      sales_models: ["fashion"],
      enabled_modules: ["catalog", "warranties"],
      default_warranty_days: 3650,
      low_stock_threshold: 0,
      allow_negative_stock: true,
    });
  });

  it("derives warranty timing without persisting a stale expired status", () => {
    const now = new Date("2026-07-21T12:00:00-03:00");
    expect(isWarrantyExpired("2026-07-20", now)).toBe(true);
    expect(isWarrantyExpired("2026-07-21", now)).toBe(false);
    expect(daysUntil("2026-07-23", now)).toBe(3);
  });
});
