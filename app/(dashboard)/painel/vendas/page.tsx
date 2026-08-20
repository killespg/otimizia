import { SellerSalesTabs } from "@/components/seller/SellerSalesTabs";
import { SellerAfterSalesPanel } from "@/components/seller/SellerAfterSalesPanel";
import { SellerOrdersPanel } from "@/components/seller/SellerOrdersPanel";
import { getSellerPageContext } from "@/lib/seller/seller-server";
import { parseSellerSalesTab } from "@/lib/seller/seller-sales";
import { PipelineReportView } from "../funil/PipelineReportView";
import { PipelineWorkspace } from "../funil/PipelineWorkspace";

export default async function SellerSalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    months?: string;
    warranty?: string;
    warranties?: string;
    claims?: string;
  }>;
}) {
  await getSellerPageContext();
  const params = await searchParams;
  const tab = parseSellerSalesTab(params.tab);

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-5">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <p className="text-xs font-semibold text-od-text-2">Hoje / Vendas</p>
          <h1 className="mt-2 text-od-title text-white">Vendas</h1>
          <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-white/52 sm:block">
            Conversas abertas e vendas já confirmadas, no mesmo lugar. Feche a venda para gerar o pedido.
          </p>
        </div>
        <SellerSalesTabs current={params.tab} />
      </header>

      {tab === "conversa" ? (
        <PipelineWorkspace returnTo="/painel/vendas" hideHeader />
      ) : null}
      {tab === "confirmadas" ? (
        <SellerOrdersPanel q={params.q} status={params.status} embedded />
      ) : null}
      {tab === "numeros" ? (
        <PipelineReportView months={params.months} embedded formAction="/painel/vendas" />
      ) : null}
      {tab === "pos-venda" ? (
        <SellerAfterSalesPanel
          warranty={params.warranty}
          status={params.status}
          warranties={params.warranties}
          claims={params.claims}
          embedded
        />
      ) : null}
    </div>
  );
}
