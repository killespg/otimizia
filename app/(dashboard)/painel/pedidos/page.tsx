import { redirect } from "next/navigation";
import { getSellerPageContext } from "@/lib/seller/seller-server";
import { sellerSalesHrefWithParams } from "@/lib/seller/seller-sales";

export default async function SellerOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await getSellerPageContext();
  const params = await searchParams;
  redirect(sellerSalesHrefWithParams("confirmadas", { q: params.q, status: params.status }));
}
