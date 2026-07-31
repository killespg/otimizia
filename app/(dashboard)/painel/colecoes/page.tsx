import Link from "next/link";
import { Archive, ArrowRightLeft, CalendarDays, Layers3, Plus } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { SellerEmptyState, SellerPageHeader, SellerStatus, date } from "@/components/seller/seller-ui";
import { getSellerPageContext } from "@/lib/seller/seller-server";
import type { SellerCollection, SellerProduct } from "@/lib/supabase/types";
import { createSellerCollection, switchSellerCollection, updateSellerCollectionStatus } from "../operacao/actions";

export default async function SellerCollectionsPage() {
  const { supabase, orgId } = await getSellerPageContext();
  const [{ data: collectionRows }, { data: productRows }] = await Promise.all([
    supabase.from("seller_collections").select("*").eq("org_id", orgId).order("created_at", { ascending: false }),
    supabase.from("seller_products").select("*").eq("org_id", orgId).neq("status", "inactive").order("name"),
  ]);
  const collections = (collectionRows ?? []) as SellerCollection[];
  const products = (productRows ?? []) as SellerProduct[];
  const productCounts = products.reduce<Map<string, number>>((map, product) => {
    if (product.collection_id) map.set(product.collection_id, (map.get(product.collection_id) ?? 0) + 1);
    return map;
  }, new Map());
  const active = collections.filter((collection) => collection.status === "active");
  const current = active[0] ?? null;
  const currentProducts = current ? products.filter((product) => product.collection_id === current.id) : [];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <SellerPageHeader title="Coleções" description="Organize lançamentos, encerre ciclos antigos e leve produtos selecionados para a próxima coleção sem apagar o histórico." actions={<><Link href="#trocar" className="btn-secondary"><ArrowRightLeft size={15} /> Trocar coleção</Link><Link href="#nova" className="btn"><Plus size={16} /> Nova coleção</Link></>} />

      {collections.length === 0 ? <SellerEmptyState title="Nenhuma coleção criada" description="Coleções são opcionais. Use-as para moda, campanhas sazonais ou catálogos por temporada." action={<Link href="#nova" className="btn"><Plus size={16} /> Criar coleção</Link>} /> : (
        <section className="grid border-l border-t border-white/[0.08] md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => <article id={collection.id} key={collection.id} className="scroll-mt-24 border-b border-r border-white/[0.08] bg-[#1e1d22]/82 p-5">
            <div className="flex items-start justify-between gap-4"><span className="grid size-9 place-items-center border border-od-accent/20 bg-od-accent/[0.06] text-od-text-2"><Layers3 size={17} /></span><SellerStatus tone={collection.status === "active" ? "success" : collection.status === "draft" ? "warning" : "neutral"}>{collection.status === "active" ? "Ativa" : collection.status === "draft" ? "Rascunho" : "Arquivada"}</SellerStatus></div>
            <h2 className="mt-5 text-base font-semibold text-white/86">{collection.name}</h2>
            <p className="mt-2 min-h-10 text-xs leading-relaxed text-od-text-3">{collection.description || "Sem descrição."}</p>
            <dl className="mt-4 divide-y divide-white/[0.07] text-xs"><Row label="Período" value={`${date(collection.starts_on)} — ${date(collection.ends_on)}`} /><Row label="Produtos" value={String(productCounts.get(collection.id) ?? 0)} /></dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {collection.status !== "active" ? <StatusForm id={collection.id} status="active" label="Ativar" /> : null}
              {collection.status !== "archived" ? <StatusForm id={collection.id} status="archived" label="Arquivar" /> : null}
              {collection.status === "archived" ? <StatusForm id={collection.id} status="draft" label="Reabrir como rascunho" /> : null}
              <Link href={`/painel/produtos?collection=${collection.id}`} className="inline-flex min-h-11 items-center px-3 text-xs font-semibold text-od-text-2">Ver produtos</Link>
            </div>
          </article>)}
        </section>
      )}

      <section id="trocar" className="scroll-mt-24 border border-od-accent/20 bg-[#1e1d22]/90">
        <header className="border-b border-od-accent/15 px-4 py-4"><div className="flex items-center gap-3"><ArrowRightLeft size={18} className="text-od-text-2" /><div><h2 className="text-sm font-semibold text-white">Trocar coleção</h2><p className="mt-1 text-xs text-od-text-3">Cria e ativa a nova coleção, arquiva a atual e move somente os produtos marcados.</p></div></div></header>
        <form action={switchSellerCollection} className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,.8fr)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="previous_collection_id" value={current?.id ?? ""} />
            <label><span className="label">Nova coleção</span><input name="name" required maxLength={120} placeholder="Ex: Primavera 2027" className="field mt-1.5" /></label>
            <label><span className="label">Coleção atual</span><input value={current?.name ?? "Nenhuma coleção ativa"} disabled className="field mt-1.5" /></label>
            <label><span className="label">Início</span><input name="starts_on" type="date" className="field mt-1.5" /></label>
            <label><span className="label">Fim</span><input name="ends_on" type="date" className="field mt-1.5" /></label>
            <label className="sm:col-span-2"><span className="label">Descrição</span><textarea name="description" maxLength={1000} placeholder="Tema, público ou objetivo desta coleção" className="field mt-1.5" /></label>
          </div>
          <div>
            <p className="label">Produtos que continuam</p>
            {currentProducts.length ? <div className="mt-2 max-h-64 divide-y divide-white/[0.07] overflow-y-auto border-y border-white/[0.08]">{currentProducts.map((product) => <label key={product.id} className="flex min-h-11 items-center gap-3 px-2 text-sm text-white/62"><input type="checkbox" name="product_ids" value={product.id} defaultChecked className="size-4 accent-od-accent" /><span className="min-w-0 flex-1 truncate">{product.name}</span><span className="text-xs text-od-text-3">{product.sku || "Sem SKU"}</span></label>)}</div> : <p className="mt-2 text-sm leading-relaxed text-od-text-3">A coleção atual não possui produtos. A nova será criada vazia.</p>}
            <PendingButton className="btn mt-4 w-full" pendingLabel="Trocando coleção">Ativar nova coleção</PendingButton>
          </div>
        </form>
      </section>

      <section id="nova" className="scroll-mt-24 border border-white/[0.09] bg-[#1e1d22]/90">
        <header className="border-b border-white/[0.08] px-4 py-4"><div className="flex items-center gap-3"><CalendarDays size={18} className="text-od-text-2" /><div><h2 className="text-sm font-semibold text-white">Criar coleção sem trocar a atual</h2><p className="mt-1 text-xs text-od-text-3">Útil para preparar um lançamento como rascunho.</p></div></div></header>
        <form action={createSellerCollection} className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_10rem_10rem_10rem_minmax(14rem,1.5fr)_auto] xl:items-end">
          <input type="hidden" name="return_to" value="/painel/colecoes" />
          <label><span className="label">Nome</span><input name="name" required maxLength={120} placeholder="Ex: Alto Verão" className="field mt-1.5" /></label>
          <label><span className="label">Status</span><select name="status" defaultValue="draft" className="field mt-1.5"><option value="draft">Rascunho</option><option value="active">Ativa</option></select></label>
          <label><span className="label">Início</span><input name="starts_on" type="date" className="field mt-1.5" /></label>
          <label><span className="label">Fim</span><input name="ends_on" type="date" className="field mt-1.5" /></label>
          <label><span className="label">Descrição</span><input name="description" maxLength={1000} placeholder="Opcional" className="field mt-1.5" /></label>
          <PendingButton className="btn" pendingLabel="Criando coleção"><Plus size={15} /> Criar coleção</PendingButton>
        </form>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-od-text-3">{label}</dt><dd className="text-right font-semibold text-white/65">{value}</dd></div>; }
function StatusForm({ id, status, label }: { id: string; status: "active" | "archived" | "draft"; label: string }) { return <form action={updateSellerCollectionStatus}><input type="hidden" name="collection_id" value={id} /><input type="hidden" name="status" value={status} /><PendingButton className="btn-secondary px-3 text-xs" pendingLabel="Atualizando">{status === "archived" ? <Archive size={14} /> : null}{label}</PendingButton></form>; }
