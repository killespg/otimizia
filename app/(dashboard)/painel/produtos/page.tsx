import Link from "next/link";
import type { CSSProperties } from "react";
import { Archive, ChevronRight, Layers3, PackagePlus, Plus, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { ProductThumb, SellerEmptyState, SellerPageHeader, SellerStatus, SellerSummaryStrip, money } from "@/components/seller/seller-ui";
import { SELLER_SALES_MODELS } from "@/lib/seller/seller-operations";
import { getSellerPageContext, sellerProductImageUrl } from "@/lib/seller/seller-server";
import type { SellerCollection, SellerModule, SellerProduct, SellerProductMedia, SellerProductVariant } from "@/lib/supabase/types";
import { createSellerProduct } from "../operacao/actions";

type ProductRow = SellerProduct & {
  seller_product_variants: SellerProductVariant[];
  seller_product_media: SellerProductMedia[];
};

export default async function SellerProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; collection?: string; stock?: string }> }) {
  const { supabase, orgId, profile } = await getSellerPageContext();
  const params = await searchParams;
  const [{ data: productRows }, { data: collectionRows }, { count: confirmedOrders }] = await Promise.all([
    supabase.from("seller_products").select("*, seller_product_variants(*), seller_product_media(*)").eq("org_id", orgId).order("updated_at", { ascending: false }).limit(300),
    supabase.from("seller_collections").select("*").eq("org_id", orgId).order("starts_on", { ascending: false, nullsFirst: false }),
    supabase.from("seller_orders").select("id", { count: "exact", head: true }).eq("org_id", orgId).neq("status", "cancelled"),
  ]);
  const products = (productRows ?? []) as ProductRow[];
  const collections = (collectionRows ?? []) as SellerCollection[];
  const usesCollections = profile.enabled_modules.includes("collections");
  const usesVariants = profile.enabled_modules.includes("variants");
  const usesInventory = profile.enabled_modules.includes("inventory");
  const collectionMap = new Map(collections.map((collection) => [collection.id, collection]));
  const query = (params.q ?? "").trim().toLocaleLowerCase("pt-BR");
  const collectionFilter = params.collection ?? "";
  const filtered = products.filter((product) => {
    const searchable = [product.name, product.sku, product.category, collectionMap.get(product.collection_id ?? "")?.name, ...product.seller_product_variants.flatMap((variant) => [variant.name, variant.sku])]
      .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    const threshold = product.low_stock_threshold ?? profile.low_stock_threshold;
    const stockMatches = params.stock !== "baixo" || (product.track_stock && availableStock(product) <= threshold);
    return (!query || searchable.includes(query)) && (!collectionFilter || product.collection_id === collectionFilter) && stockMatches;
  });
  const active = products.filter((product) => product.status === "active");
  const skuCount = products.reduce((total, product) => total + Math.max(1, product.seller_product_variants.length), 0);
  const stockTotal = active.reduce((total, product) => total + productStock(product), 0);
  const lowStock = active.filter((product) => product.track_stock && availableStock(product) <= (product.low_stock_threshold ?? profile.low_stock_threshold));
  const activeCollections = collections.filter((collection) => collection.status === "active");
  const productColumns = ["minmax(12rem,1.5fr)", ...(usesCollections ? ["minmax(6.5rem,.7fr)"] : []), ...(usesVariants ? ["5rem"] : []), "6.5rem", ...(usesInventory ? ["5.5rem"] : []), "4rem"].join(" ");
  const productGridStyle = { "--seller-product-columns": productColumns } as CSSProperties;
  const summaryItems = [
    { label: "Produtos ativos", value: active.length },
    ...(usesCollections ? [{ label: "Coleções ativas", value: activeCollections.length }] : []),
    { label: "SKUs cadastrados", value: skuCount },
    ...(usesInventory ? [{ label: "Estoque total", value: `${stockTotal.toLocaleString("pt-BR")} un.` }, { label: "Estoque baixo", value: lowStock.length, tone: lowStock.length ? "warning" as const : "default" as const }] : []),
    { label: "Pedidos", value: confirmedOrders ?? 0 },
  ];

  return (
    <div className="mx-auto w-full max-w-[1640px] space-y-6">
      <SellerPageHeader
        title="Produtos"
        description="Catálogo, variações, estoque, coleções e garantias que alimentam seus pedidos."
        actions={<>
          <Link href="/painel/operacao/configuracoes" className="btn-secondary"><SlidersHorizontal size={15} /> Configurar operação</Link>
          <Link href="#novo-produto" className="btn"><Plus size={16} /> Novo produto</Link>
        </>}
      />

      <div className="space-y-3">
        <form className="flex flex-col gap-2 sm:flex-row" role="search">
          {params.stock ? <input type="hidden" name="stock" value={params.stock} /> : null}
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar produto</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-od-text-3" />
            <input name="q" defaultValue={params.q} placeholder="Buscar produto, SKU ou coleção" className="field pl-10" />
          </label>
          {usesCollections ? <select name="collection" defaultValue={collectionFilter} className="field sm:max-w-64" aria-label="Filtrar por coleção">
            <option value="">Todas as coleções</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select> : null}
          <button className="btn-secondary" type="submit">Filtrar</button>
          {params.stock === "baixo" ? <Link href="/painel/produtos" className="btn-secondary">Limpar estoque baixo</Link> : null}
        </form>

        <SellerSummaryStrip items={summaryItems} />
      </div>

      <details id="novo-produto" className="group scroll-mt-24 rounded-[var(--radius-panel)] border border-od-accent/25 bg-od-accent/[0.035] open:pb-6">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-1 text-sm font-semibold text-od-text">
          <span className="grid size-8 place-items-center rounded-[var(--radius-inner)] border border-od-accent/25 bg-od-accent/[0.08]"><PackagePlus size={16} /></span>
          Cadastrar produto
          <ChevronRight size={15} className="ml-auto transition-transform group-open:rotate-90" />
        </summary>
        <form action={createSellerProduct} className="grid gap-4 border-t border-od-accent/15 pt-6 md:grid-cols-2 xl:grid-cols-4">
          <ProductFormFields collections={collections} defaultWarrantyDays={profile.default_warranty_days} enabledModules={profile.enabled_modules} />
          <div className="flex justify-end md:col-span-2 xl:col-span-4"><PendingButton className="btn" pendingLabel="Criando produto">Criar produto</PendingButton></div>
        </form>
      </details>

      {products.length === 0 ? (
        <SellerEmptyState className="seller-catalog-empty" title="Seu catálogo começa aqui" description="Cadastre o primeiro produto. Ele poderá ser selecionado — ou criado — durante a confirmação de uma venda." action={<Link href="#novo-produto" className="btn"><Plus size={16} /> Cadastrar produto</Link>} />
      ) : (
        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="min-w-0 overflow-hidden rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
            <div className="seller-product-grid hidden gap-3 border-b border-white/[0.08] px-4 py-2 text-xs font-semibold text-od-text-3 xl:grid" style={productGridStyle}>
              <span>Produto</span>{usesCollections ? <span>Coleção</span> : null}{usesVariants ? <span>Variações</span> : null}<span>Preço</span>{usesInventory ? <span>Estoque</span> : null}<span className="text-right">Ações</span>
            </div>
            {filtered.length === 0 ? <SellerEmptyState title="Nenhum produto encontrado" description="Revise a busca ou remova o filtro de coleção." /> : (
              <div className="divide-y divide-white/[0.08]">
                {filtered.map((product) => {
                  const collection = product.collection_id ? collectionMap.get(product.collection_id) : null;
                  const image = sellerProductImageUrl(product.seller_product_media.sort((a, b) => a.position - b.position)[0]?.storage_path);
                  const stock = availableStock(product);
                  const threshold = product.low_stock_threshold ?? profile.low_stock_threshold;
                  return (
                    <article key={product.id} className="group px-4 py-3 hover:bg-white/[0.025]">
                      <div className="seller-product-grid grid gap-3 xl:items-center" style={productGridStyle}>
                        <Link href={`/painel/produtos/${product.id}`} className="flex min-w-0 items-center gap-3">
                          <ProductThumb src={image} name={product.name} />
                          <span className="min-w-0"><strong className="block truncate text-sm font-semibold text-white/88">{product.name}</strong><span className="mt-1 block truncate text-xs text-od-text-3">SKU: {product.sku || "não informado"}</span></span>
                        </Link>
                        {usesCollections ? <span className="text-xs text-white/54"><span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Coleção</span>{collection?.name ?? "Sem coleção"}</span> : null}
                        {usesVariants ? <span className="text-xs text-white/54"><span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Variações</span>{product.seller_product_variants.length || "—"}</span> : null}
                        <span className="text-sm font-medium tabular-nums text-white/78"><span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Preço</span>{money(product.base_price_cents)}</span>
                        {usesInventory ? <span className={`text-sm font-semibold tabular-nums ${product.track_stock && stock <= threshold ? "text-amber-300" : "text-white/70"}`}><span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Estoque</span>{product.track_stock ? `${stock} un.` : "Livre"}</span> : null}
                        <Link href={`/painel/produtos/${product.id}`} className="flex min-h-11 items-center justify-end text-xs font-semibold text-od-text-2">Detalhes <ChevronRight size={14} /></Link>
                      </div>
                      {usesVariants && product.seller_product_variants.length > 0 ? (
                        <div className="mt-3 hidden border-t border-white/[0.06] pt-2 xl:block">
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-od-text-3">{product.seller_product_variants.slice(0, 6).map((variant) => <span key={variant.id}>{variant.name}: <strong className="font-semibold text-white/58">{variant.stock_quantity - variant.reserved_quantity} un.</strong></span>)}</div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-3">
            {usesCollections ? <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90 p-4">
              <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-white">Coleções ativas</h2><Layers3 size={16} className="text-od-text-3" /></div>
              {activeCollections.length ? <ul className="mt-3 divide-y divide-white/[0.07]">{activeCollections.map((collection) => <li key={collection.id}><Link href={`/painel/colecoes#${collection.id}`} className="flex min-h-12 items-center justify-between gap-3 text-xs text-white/66"><span className="truncate">{collection.name}</span><SellerStatus tone="success">Ativa</SellerStatus></Link></li>)}</ul> : <p className="mt-3 text-xs leading-relaxed text-od-text-3">Nenhuma coleção ativa. Use coleções para organizar lançamentos sem apagar o histórico.</p>}
              <Link href="/painel/colecoes" className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-od-text-2">Gerenciar coleções <ChevronRight size={14} /></Link>
            </section> : null}
            {usesInventory ? <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90 p-4">
              <div className="flex items-center gap-2"><TriangleAlert size={16} className="text-amber-300" /><h2 className="text-sm font-semibold text-white">Estoque baixo</h2></div>
              {lowStock.length ? <ul className="mt-3 divide-y divide-white/[0.07]">{lowStock.slice(0, 8).map((product) => <li key={product.id}><Link href={`/painel/produtos/${product.id}`} className="flex min-h-11 items-center justify-between gap-3 text-xs"><span className="truncate text-white/62">{product.name}</span><strong className="tabular-nums text-amber-300">{availableStock(product)} un.</strong></Link></li>)}</ul> : <p className="mt-3 text-xs text-od-text-3">Nenhum produto abaixo do limite configurado.</p>}
            </section> : null}
            <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90 p-4"><div className="flex items-center gap-2"><Archive size={16} className="text-od-text-3" /><h2 className="text-sm font-semibold text-white">Inativos</h2></div><p className="mt-2 text-2xl font-semibold tabular-nums text-white/80">{products.filter((product) => product.status === "inactive").length}</p></section>
          </aside>
        </div>
      )}
    </div>
  );
}

function ProductFormFields({ collections, defaultWarrantyDays, enabledModules }: { collections: SellerCollection[]; defaultWarrantyDays: number; enabledModules: SellerModule[] }) {
  const usesCollections = enabledModules.includes("collections");
  const usesInventory = enabledModules.includes("inventory");
  const usesWarranties = enabledModules.includes("warranties");
  const usesConsumables = enabledModules.includes("consumables");
  const usesMadeToOrder = enabledModules.includes("made_to_order");
  const usesCommissions = enabledModules.includes("commissions");
  return <>
    <label><span className="label">Nome do produto</span><input name="name" required maxLength={160} placeholder="Ex: Camiseta Linho" className="field mt-1.5" /></label>
    <label><span className="label">SKU</span><input name="sku" maxLength={80} placeholder="Ex: CAM-LIN-001" className="field mt-1.5" /></label>
    <label><span className="label">Tipo de operação</span><select name="kind" defaultValue="general" className="field mt-1.5">{SELLER_SALES_MODELS.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}</select></label>
    <label><span className="label">Categoria</span><input name="category" maxLength={80} placeholder="Ex: Camisetas" className="field mt-1.5" /></label>
    <label><span className="label">Marca</span><input name="brand" maxLength={120} placeholder="Ex: Marca representada" className="field mt-1.5" /></label>
    <label><span className="label">Preço de venda</span><input name="base_price" inputMode="decimal" placeholder="0,00" className="field mt-1.5" /></label>
    <label><span className="label">Custo</span><input name="cost" inputMode="decimal" placeholder="0,00" className="field mt-1.5" /></label>
    {usesInventory ? <label><span className="label">Estoque inicial</span><input name="stock_quantity" type="number" defaultValue="0" className="field mt-1.5" /></label> : null}
    {usesCollections ? <label><span className="label">Coleção</span><select name="collection_id" defaultValue="" className="field mt-1.5"><option value="">Sem coleção</option>{collections.filter((collection) => collection.status !== "archived").map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label> : null}
    {usesWarranties ? <label><span className="label">Garantia em dias</span><input name="warranty_days" type="number" min="0" max="3650" defaultValue={defaultWarrantyDays} className="field mt-1.5" /></label> : null}
    {usesConsumables ? <label><span className="label">Reposição estimada</span><input name="reorder_interval_days" type="number" min="1" placeholder="Dias até nova compra" className="field mt-1.5" /></label> : null}
    {usesMadeToOrder ? <label><span className="label">Prazo padrão de produção</span><input name="default_lead_time_days" type="number" min="1" max="3650" placeholder="Dias" className="field mt-1.5" /></label> : null}
    {usesCommissions ? <label><span className="label">Comissão padrão</span><input name="default_commission_percent" type="number" min="0" max="100" step="0.01" placeholder="%" className="field mt-1.5" /></label> : null}
    {usesInventory ? <label><span className="label">Limite de estoque baixo</span><input name="low_stock_threshold" type="number" min="0" placeholder="Usar padrão" className="field mt-1.5" /></label> : null}
    <label><span className="label">Status</span><select name="status" defaultValue="active" className="field mt-1.5"><option value="active">Ativo</option><option value="draft">Rascunho</option><option value="inactive">Inativo</option></select></label>
    {usesInventory ? <label className="flex min-h-11 items-center gap-2 self-end text-sm text-white/62"><input name="track_stock" type="checkbox" defaultChecked className="size-4 accent-od-accent" /> Controlar estoque</label> : null}
    {usesWarranties ? <label className="flex min-h-11 items-center gap-2 self-end text-sm text-white/62"><input name="requires_serial" type="checkbox" className="size-4 accent-od-accent" /> Exigir número de série</label> : null}
    <label className="md:col-span-2 xl:col-span-4"><span className="label">Descrição</span><textarea name="description" maxLength={3000} placeholder="Informações úteis para venda e pós-venda" className="field mt-1.5" /></label>
  </>;
}

function productStock(product: ProductRow) { const variants = product.seller_product_variants.filter((variant) => variant.active); return variants.length ? variants.reduce((sum, variant) => sum + variant.stock_quantity, 0) : product.stock_quantity; }
function availableStock(product: ProductRow) { const variants = product.seller_product_variants.filter((variant) => variant.active); return variants.length ? variants.reduce((sum, variant) => sum + variant.stock_quantity - variant.reserved_quantity, 0) : product.stock_quantity - product.reserved_quantity; }
