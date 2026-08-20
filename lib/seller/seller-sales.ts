export const SELLER_SALES_HREF = "/painel/vendas";

export type SellerSalesTab = "conversa" | "confirmadas" | "numeros" | "pos-venda";

export function parseSellerSalesTab(value: string | undefined): SellerSalesTab {
  if (value === "confirmadas" || value === "numeros" || value === "pos-venda") {
    return value;
  }
  return "conversa";
}

export function sellerSalesHref(tab: SellerSalesTab = "conversa") {
  return tab === "conversa" ? SELLER_SALES_HREF : `${SELLER_SALES_HREF}?tab=${tab}`;
}

export function sellerSalesHrefWithParams(
  tab: SellerSalesTab,
  params: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  if (tab !== "conversa") query.set("tab", tab);
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const encoded = query.toString();
  return encoded ? `${SELLER_SALES_HREF}?${encoded}` : SELLER_SALES_HREF;
}
