import { redirect } from "next/navigation";
import { getSellerPageContext } from "@/lib/seller/seller-server";
import { sellerSalesHrefWithParams } from "@/lib/seller/seller-sales";

export default async function SellerAfterSalesPage({ searchParams }: { searchParams: Promise<{ warranty?: string; status?: string; warranties?: string; claims?: string }> }) {
  await getSellerPageContext();
  const params = await searchParams;
  redirect(sellerSalesHrefWithParams("pos-venda", {
    warranty: params.warranty,
    status: params.status,
    warranties: params.warranties,
    claims: params.claims,
  }));
}
