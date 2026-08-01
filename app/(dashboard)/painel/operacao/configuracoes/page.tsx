import { CheckCircle2 } from "lucide-react";
import { SellerOperationSettingsForm } from "@/components/seller/SellerOperationSettingsForm";
import { SellerPageHeader } from "@/components/seller/seller-ui";
import { getSellerPageContext } from "@/lib/seller/seller-server";

export default async function SellerOperationSettingsPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const { salvo } = await searchParams;
  const { profile, isOrgAdmin } = await getSellerPageContext();
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <SellerPageHeader title="Configurar operação" description="Escolha os controles que correspondem ao que você vende. O CRM continua simples e mostra apenas os módulos que fazem sentido." />
      {salvo === "1" ? <div role="status" className="flex min-h-12 items-center gap-3 border border-emerald-400/25 bg-emerald-400/[0.06] px-4 text-sm text-emerald-300"><CheckCircle2 size={17} /><span>Configuração salva. Os módulos da operação já foram atualizados.</span></div> : null}
      <SellerOperationSettingsForm
        salesModels={profile.sales_models}
        enabledModules={profile.enabled_modules}
        defaultWarrantyDays={profile.default_warranty_days}
        lowStockThreshold={profile.low_stock_threshold}
        allowNegativeStock={profile.allow_negative_stock}
        canEdit={isOrgAdmin}
      />
    </div>
  );
}
