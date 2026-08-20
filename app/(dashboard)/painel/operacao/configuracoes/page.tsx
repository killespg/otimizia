import { redirect } from "next/navigation";
import { getSellerPageContext } from "@/lib/seller/seller-server";

export default async function SellerOperationSettingsPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  await getSellerPageContext();
  const { salvo } = await searchParams;
  redirect(salvo === "1" ? "/painel/configuracoes?salvo=1#operacao" : "/painel/configuracoes#operacao");
}
