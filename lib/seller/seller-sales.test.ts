import { describe, expect, it } from "vitest";
import { parseSellerSalesTab, sellerSalesHref, sellerSalesHrefWithParams } from "./seller-sales";

describe("seller sales destinations", () => {
  it("defaults unknown tabs to the open conversations view", () => {
    expect(parseSellerSalesTab(undefined)).toBe("conversa");
    expect(parseSellerSalesTab("funil")).toBe("conversa");
    expect(parseSellerSalesTab("confirmadas")).toBe("confirmadas");
  });

  it("keeps the conversations tab on the bare sales path", () => {
    expect(sellerSalesHref()).toBe("/painel/vendas");
    expect(sellerSalesHref("confirmadas")).toBe("/painel/vendas?tab=confirmadas");
  });

  it("preserves filters when composing a sales destination", () => {
    expect(sellerSalesHrefWithParams("confirmadas", { status: "open" })).toBe(
      "/painel/vendas?tab=confirmadas&status=open",
    );
    expect(sellerSalesHrefWithParams("conversa")).toBe("/painel/vendas");
  });
});
