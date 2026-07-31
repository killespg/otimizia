import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleDollarSign, UserRound } from "lucide-react";
import { SellerSaleConfirmation } from "@/components/seller/SellerSaleConfirmation";
import { SellerPageHeader, date, money } from "@/components/seller/seller-ui";
import { getSellerPageContext } from "@/lib/seller/seller-server";
import type { Contact, Deal, SellerCollection, SellerProduct, SellerProductVariant } from "@/lib/supabase/types";

type CatalogProduct = SellerProduct & { variants: SellerProductVariant[] };

export default async function ConfirmSellerSalePage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { supabase, orgId, profile } = await getSellerPageContext();
  const [{ data: dealRow }, { data: existingOrder }, { data: productRows }, { data: variantRows }, { data: collectionRows }] = await Promise.all([
    supabase.from("deals").select("*").eq("id", dealId).eq("org_id", orgId).eq("workspace_key", "autonomous_seller").maybeSingle(),
    supabase.from("seller_orders").select("id").eq("deal_id", dealId).eq("org_id", orgId).maybeSingle(),
    supabase.from("seller_products").select("*").eq("org_id", orgId).eq("status", "active").order("name"),
    supabase.from("seller_product_variants").select("*").eq("org_id", orgId).order("name"),
    supabase.from("seller_collections").select("*").eq("org_id", orgId).neq("status", "archived").order("name"),
  ]);
  if (existingOrder?.id) redirect(`/painel/pedidos/${existingOrder.id}`);
  if (!dealRow) notFound();
  const deal = dealRow as Deal;
  if (deal.details?.pipeline_list_placeholder === "true" || deal.stage === "perdido") notFound();
  const { data: contactRow } = deal.contact_id
    ? await supabase.from("contacts").select("*").eq("id", deal.contact_id).eq("org_id", orgId).maybeSingle()
    : { data: null };
  const contact = contactRow as Contact | null;
  const variantsByProduct = ((variantRows ?? []) as SellerProductVariant[]).reduce<Map<string, SellerProductVariant[]>>((map, variant) => {
    map.set(variant.product_id, [...(map.get(variant.product_id) ?? []), variant]);
    return map;
  }, new Map());
  const products = ((productRows ?? []) as SellerProduct[]).map<CatalogProduct>((product) => ({ ...product, variants: variantsByProduct.get(product.id) ?? [] }));
  const defaultKind = profile.sales_models.find((model) => model !== "general") ?? profile.sales_models[0] ?? "general";

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5">
      <Link href="/painel/funil" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/52 hover:text-white"><ArrowLeft size={15} /> Voltar ao funil</Link>
      <SellerPageHeader title="Confirmar venda" description="Revise o cliente, adicione os itens reais e só então autentique o fechamento. O pedido, o estoque e as garantias serão criados juntos." />
      <section className="grid border-y border-white/[0.08] bg-[#1e1d22]/88 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={<UserRound size={16} />} label="Cliente" value={contact?.name ?? "Sem cliente vinculado"} detail={contact?.phone || contact?.email || "Cadastre depois no pedido"} />
        <Summary icon={<CircleDollarSign size={16} />} label="Negociação" value={deal.title} detail={money(deal.value_cents)} />
        <Summary icon={<CalendarDays size={16} />} label="Criada em" value={date(deal.created_at)} detail={deal.stage === "ganho" ? "Fechamento antigo sem pedido" : "Aguardando confirmação"} />
        <Summary icon={<CircleDollarSign size={16} />} label="Catálogo disponível" value={`${products.length} ${products.length === 1 ? "produto" : "produtos"}`} detail="Você também pode criar um item agora" />
      </section>
      <SellerSaleConfirmation dealId={deal.id} products={products} collections={(collectionRows ?? []) as SellerCollection[]} defaultWarrantyDays={profile.default_warranty_days} defaultKind={defaultKind} enabledModules={profile.enabled_modules} />
    </div>
  );
}

function Summary({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="border-b border-white/[0.07] p-4 sm:border-r xl:border-b-0 xl:last:border-r-0"><div className="flex items-center gap-2 text-xs text-od-text-3"><span className="text-od-text-2">{icon}</span>{label}</div><p className="mt-2 truncate text-sm font-semibold text-white/82">{value}</p><p className="mt-1 truncate text-xs text-od-text-3">{detail}</p></div>;
}
