import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Camera, PackagePlus, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { ProductThumb, SellerPageHeader, SellerStatus, date, money } from "@/components/seller/seller-ui";
import { SELLER_SALES_MODELS } from "@/lib/seller/seller-operations";
import { getSellerPageContext, sellerProductImageUrl } from "@/lib/seller/seller-server";
import type { SellerCollection, SellerInventoryMovement, SellerOrderItem, SellerProduct, SellerProductMedia, SellerProductVariant, SellerWarranty } from "@/lib/supabase/types";
import { adjustSellerStock, createSellerVariant, deleteSellerProductPhoto, updateSellerProduct, uploadSellerProductPhoto } from "../../operacao/actions";

export default async function SellerProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, orgId, profile } = await getSellerPageContext();
  const [{ data: productRow }, { data: collectionRows }, { data: variantRows }, { data: mediaRows }, { data: movementRows }, { data: itemRows }] = await Promise.all([
    supabase.from("seller_products").select("*").eq("id", id).eq("org_id", orgId).maybeSingle(),
    supabase.from("seller_collections").select("*").eq("org_id", orgId).order("starts_on", { ascending: false, nullsFirst: false }),
    supabase.from("seller_product_variants").select("*").eq("product_id", id).eq("org_id", orgId).order("created_at"),
    supabase.from("seller_product_media").select("*").eq("product_id", id).eq("org_id", orgId).order("position"),
    supabase.from("seller_inventory_movements").select("*").eq("product_id", id).eq("org_id", orgId).order("created_at", { ascending: false }).limit(30),
    supabase.from("seller_order_items").select("*").eq("product_id", id).eq("org_id", orgId).order("created_at", { ascending: false }).limit(30),
  ]);
  if (!productRow) notFound();
  const product = productRow as SellerProduct;
  const collections = (collectionRows ?? []) as SellerCollection[];
  const variants = (variantRows ?? []) as SellerProductVariant[];
  const media = (mediaRows ?? []) as SellerProductMedia[];
  const movements = (movementRows ?? []) as SellerInventoryMovement[];
  const orderItems = (itemRows ?? []) as SellerOrderItem[];
  const { data: warrantyRows } = orderItems.length
    ? await supabase.from("seller_warranties").select("*").eq("org_id", orgId).in("order_item_id", orderItems.map((item) => item.id)).order("expires_on")
    : { data: [] };
  const warranties = (warrantyRows ?? []) as SellerWarranty[];
  const collection = collections.find((item) => item.id === product.collection_id);
  const totalStock = variants.length ? variants.reduce((sum, variant) => sum + variant.stock_quantity - variant.reserved_quantity, 0) : product.stock_quantity - product.reserved_quantity;
  const usesInventory = profile.enabled_modules.includes("inventory");
  const usesCollections = profile.enabled_modules.includes("collections");
  const usesWarranties = profile.enabled_modules.includes("warranties");
  const usesConsumables = profile.enabled_modules.includes("consumables");
  const usesMadeToOrder = profile.enabled_modules.includes("made_to_order");
  const usesCommissions = profile.enabled_modules.includes("commissions");

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <Link href="/painel/produtos" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/52 hover:text-white"><ArrowLeft size={15} /> Voltar ao catálogo</Link>
      <SellerPageHeader
        title={product.name}
        description={[product.sku ? `SKU ${product.sku}` : "Sem SKU", product.brand, usesCollections ? collection?.name ?? "Sem coleção" : null, usesInventory ? product.track_stock ? `${totalStock} unidades disponíveis` : "Estoque não controlado" : null].filter(Boolean).join(" · ")}
        actions={<><SellerStatus tone={product.status === "active" ? "success" : product.status === "draft" ? "warning" : "neutral"}>{product.status === "active" ? "Ativo" : product.status === "draft" ? "Rascunho" : "Inativo"}</SellerStatus>{usesInventory ? <Link href="#ajustar-estoque" className="btn-secondary"><SlidersHorizontal size={15} /> Ajustar estoque</Link> : null}</>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
            <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Dados do produto</h2><p className="mt-1 text-xs text-od-text-3">Alterações futuras não modificam os pedidos já confirmados.</p></header>
            <form action={updateSellerProduct} className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              <input type="hidden" name="product_id" value={product.id} />
              {!usesCollections && product.collection_id ? <input type="hidden" name="collection_id" value={product.collection_id} /> : null}
              {!usesWarranties ? <><input type="hidden" name="warranty_days" value={product.warranty_days} />{product.requires_serial ? <input type="hidden" name="requires_serial" value="on" /> : null}</> : null}
              {!usesConsumables && product.reorder_interval_days ? <input type="hidden" name="reorder_interval_days" value={product.reorder_interval_days} /> : null}
              {!usesMadeToOrder && product.default_lead_time_days ? <input type="hidden" name="default_lead_time_days" value={product.default_lead_time_days} /> : null}
              {!usesCommissions && product.default_commission_percent !== null ? <input type="hidden" name="default_commission_percent" value={product.default_commission_percent} /> : null}
              {!usesInventory ? <>{product.track_stock ? <input type="hidden" name="track_stock" value="on" /> : null}{product.low_stock_threshold !== null ? <input type="hidden" name="low_stock_threshold" value={product.low_stock_threshold} /> : null}</> : null}
              <label><span className="label">Nome</span><input name="name" required maxLength={160} defaultValue={product.name} className="field mt-1.5" /></label>
              <label><span className="label">SKU</span><input name="sku" maxLength={80} defaultValue={product.sku ?? ""} className="field mt-1.5" /></label>
              <label><span className="label">Tipo de operação</span><select name="kind" defaultValue={product.kind} className="field mt-1.5">{SELLER_SALES_MODELS.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}</select></label>
              <label><span className="label">Categoria</span><input name="category" maxLength={80} defaultValue={product.category ?? ""} className="field mt-1.5" /></label>
              <label><span className="label">Marca</span><input name="brand" maxLength={120} defaultValue={product.brand ?? ""} className="field mt-1.5" /></label>
              <label><span className="label">Preço</span><input name="base_price" inputMode="decimal" defaultValue={inputMoney(product.base_price_cents)} className="field mt-1.5" /></label>
              <label><span className="label">Custo</span><input name="cost" inputMode="decimal" defaultValue={product.cost_cents === null ? "" : inputMoney(product.cost_cents)} className="field mt-1.5" /></label>
              {usesCollections ? <label><span className="label">Coleção</span><select name="collection_id" defaultValue={product.collection_id ?? ""} className="field mt-1.5"><option value="">Sem coleção</option>{collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
              {usesWarranties ? <label><span className="label">Garantia em dias</span><input name="warranty_days" type="number" min="0" max="3650" defaultValue={product.warranty_days} className="field mt-1.5" /></label> : null}
              {usesConsumables ? <label><span className="label">Reposição estimada</span><input name="reorder_interval_days" type="number" min="1" defaultValue={product.reorder_interval_days ?? ""} className="field mt-1.5" /></label> : null}
              {usesMadeToOrder ? <label><span className="label">Prazo padrão de produção</span><input name="default_lead_time_days" type="number" min="1" max="3650" defaultValue={product.default_lead_time_days ?? ""} className="field mt-1.5" /></label> : null}
              {usesCommissions ? <label><span className="label">Comissão padrão</span><input name="default_commission_percent" type="number" min="0" max="100" step="0.01" defaultValue={product.default_commission_percent ?? ""} className="field mt-1.5" /></label> : null}
              {usesInventory ? <label><span className="label">Limite de estoque baixo</span><input name="low_stock_threshold" type="number" min="0" defaultValue={product.low_stock_threshold ?? ""} placeholder={`Padrão: ${profile.low_stock_threshold}`} className="field mt-1.5" /></label> : null}
              <label><span className="label">Status</span><select name="status" defaultValue={product.status} className="field mt-1.5"><option value="active">Ativo</option><option value="draft">Rascunho</option><option value="inactive">Inativo</option></select></label>
              {usesInventory || usesWarranties ? <div className="flex flex-col justify-end gap-2 pb-1">{usesInventory ? <label className="flex min-h-11 items-center gap-2 text-sm text-white/62"><input name="track_stock" type="checkbox" defaultChecked={product.track_stock} className="size-4 accent-od-accent" /> Controlar estoque</label> : null}{usesWarranties ? <label className="flex min-h-11 items-center gap-2 text-sm text-white/62"><input name="requires_serial" type="checkbox" defaultChecked={product.requires_serial} className="size-4 accent-od-accent" /> Exigir número de série</label> : null}</div> : null}
              <label className="md:col-span-2 xl:col-span-3"><span className="label">Descrição</span><textarea name="description" maxLength={3000} defaultValue={product.description ?? ""} className="field mt-1.5" /></label>
              <div className="md:col-span-2 xl:col-span-3 flex justify-end"><PendingButton className="btn" pendingLabel="Salvando produto">Salvar produto</PendingButton></div>
            </form>
          </section>

          <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
            <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-4"><div><h2 className="text-sm font-semibold text-white">Variações</h2><p className="mt-1 text-xs text-od-text-3">Tamanhos, cores, modelos, voltagens ou outras opções do mesmo produto.</p></div><Boxes size={18} className="text-od-text-2" /></header>
            {variants.length ? <div className="divide-y divide-white/[0.08]">{variants.map((variant) => <div key={variant.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(10rem,1fr)_8rem_8rem_7rem] sm:items-center"><div><strong className="font-semibold text-white/82">{variant.name}</strong><p className="mt-1 text-xs text-od-text-3">{Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Sem atributos extras"}</p></div><span className="text-xs text-white/52"><span className="mb-1 block text-xs font-medium text-od-text-3 sm:hidden">SKU</span>{variant.sku || "Sem SKU"}</span><span className="font-medium tabular-nums text-white/72"><span className="mb-1 block text-xs font-medium text-od-text-3 sm:hidden">Preço</span>{money(variant.price_cents ?? product.base_price_cents)}</span><span className="font-semibold tabular-nums text-white/72"><span className="mb-1 block text-xs font-medium text-od-text-3 sm:hidden">Estoque</span>{variant.stock_quantity - variant.reserved_quantity} un.</span></div>)}</div> : <p className="px-4 py-6 text-sm text-od-text-3">Nenhuma variação cadastrada. O produto usa o estoque principal.</p>}
            <details className="group border-t border-white/[0.08] p-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-od-text-2"><Plus size={15} /> Adicionar variação</summary>
              <form action={createSellerVariant} className="mt-3 grid gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2 xl:grid-cols-5">
                <input type="hidden" name="product_id" value={product.id} />
                <label><span className="label">Nome</span><input name="name" required placeholder="Ex: Azul / M" className="field mt-1.5" /></label>
                <label><span className="label">SKU</span><input name="sku" placeholder="Ex: CAM-AZ-M" className="field mt-1.5" /></label>
                <label><span className="label">Atributos</span><input name="attributes" placeholder="Cor: Azul, Tamanho: M" className="field mt-1.5" /></label>
                <label><span className="label">Preço próprio</span><input name="price" inputMode="decimal" placeholder="Usar preço padrão" className="field mt-1.5" /></label>
                <label><span className="label">Estoque inicial</span><input name="stock_quantity" type="number" defaultValue="0" className="field mt-1.5" /></label>
                <div className="sm:col-span-2 xl:col-span-5 flex justify-end"><PendingButton className="btn" pendingLabel="Criando variação">Criar variação</PendingButton></div>
              </form>
            </details>
          </section>

          <section id="ajustar-estoque" className="scroll-mt-24 rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
            <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Movimentar estoque</h2><p className="mt-1 text-xs text-od-text-3">Use quantidade positiva para entrada e negativa para saída ou correção.</p></header>
            <form action={adjustSellerStock} className="grid gap-3 p-4 sm:grid-cols-[minmax(10rem,1fr)_8rem_minmax(12rem,1.5fr)_auto] sm:items-end">
              <input type="hidden" name="product_id" value={product.id} />
              <label><span className="label">Variação</span><select name="variant_id" defaultValue="" className="field mt-1.5"><option value="">Estoque principal</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>
              <label><span className="label">Quantidade</span><input name="quantity_delta" type="number" required placeholder="Ex: 10 ou -2" className="field mt-1.5" /></label>
              <label><span className="label">Motivo</span><input name="reason" required maxLength={240} placeholder="Ex: Compra do fornecedor" className="field mt-1.5" /></label>
              <PendingButton className="btn" pendingLabel="Ajustando">Registrar ajuste</PendingButton>
            </form>
          </section>

          <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
            <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Histórico de estoque</h2></header>
            {movements.length ? <div className="divide-y divide-white/[0.07]">{movements.map((movement) => <div key={movement.id} className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-[8rem_minmax(10rem,1fr)_6rem_7rem]"><span className="text-od-text-3"><span className="mr-2 font-medium text-od-text-3 sm:hidden">Data</span>{date(movement.created_at)}</span><span className="text-white/62"><span className="mr-2 font-medium text-od-text-3 sm:hidden">Motivo</span>{movement.reason || movement.movement_type}</span><strong className={movement.quantity_delta > 0 ? "text-emerald-300" : "text-[#fb7767]"}><span className="mr-2 font-medium text-od-text-3 sm:hidden">Movimento</span>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</strong><span className="tabular-nums text-white/54 sm:text-right"><span className="mr-2 font-medium text-od-text-3 sm:hidden">Saldo</span>{movement.balance_after}</span></div>)}</div> : <p className="px-4 py-6 text-sm text-od-text-3">Nenhuma movimentação registrada.</p>}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90 p-4">
            <h2 className="text-sm font-semibold text-white">Fotos do produto</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">{media.map((item) => <div key={item.id} className="group relative"><ProductThumb src={sellerProductImageUrl(item.storage_path)} name={item.alt_text || product.name} size="lg" /><form action={deleteSellerProductPhoto} className="absolute right-1 top-1"><input type="hidden" name="media_id" value={item.id} /><input type="hidden" name="product_id" value={product.id} /><PendingButton iconOnly pendingLabel="Excluindo" aria-label="Excluir foto" className="grid size-8 place-items-center bg-od-bg text-danger-400"><Trash2 size={14} /></PendingButton></form></div>)}</div>
            <form action={uploadSellerProductPhoto} className="mt-4 space-y-3 border-t border-white/[0.08] pt-4">
              <input type="hidden" name="product_id" value={product.id} />
              <label><span className="label">Nova foto</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="field mt-1.5" /></label>
              <label><span className="label">Descrição da foto</span><input name="alt_text" maxLength={200} placeholder="Ex: Frente da camiseta azul" className="field mt-1.5" /></label>
              <PendingButton className="btn-secondary w-full" pendingLabel="Enviando foto"><Camera size={15} /> Enviar foto</PendingButton>
            </form>
          </section>

          <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90 p-4"><h2 className="text-sm font-semibold text-white">Desempenho do produto</h2><dl className="mt-3 divide-y divide-white/[0.07] text-sm"><Metric label="Itens vendidos" value={String(orderItems.reduce((sum, item) => sum + item.quantity, 0))} /><Metric label="Receita observada" value={money(orderItems.reduce((sum, item) => sum + item.line_total_cents, 0))} /><Metric label="Garantias emitidas" value={String(warranties.length)} /><Metric label="Garantias ativas" value={String(warranties.filter((warranty) => warranty.status === "active" && new Date(`${warranty.expires_on}T23:59:59`) >= new Date()).length)} /></dl></section>

          <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90 p-4"><h2 className="text-sm font-semibold text-white">Criação rápida</h2><p className="mt-2 text-xs leading-relaxed text-od-text-3">Se este produto ainda não existisse, ele poderia ser criado diretamente ao confirmar uma venda. Depois, esta tela serviria para completar fotos, variações e estoque.</p><Link href="/painel/funil" className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-od-text-2"><PackagePlus size={15} /> Ir para o funil</Link></section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 py-3"><dt className="text-od-text-3">{label}</dt><dd className="font-semibold tabular-nums text-white/82">{value}</dd></div>; }
function inputMoney(cents: number) { return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
