"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Box, Check, Minus, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { confirmSellerSale, type ConfirmSellerSaleState } from "@/app/(dashboard)/painel/operacao/actions";
import { SELLER_SALES_MODELS } from "@/lib/seller-operations";
import type { SellerCollection, SellerModule, SellerProduct, SellerProductVariant, SellerSalesModel } from "@/lib/supabase/types";

type CatalogProduct = SellerProduct & { variants: SellerProductVariant[] };
type CatalogOption = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  sku: string | null;
  price: number;
  warrantyDays: number;
  available: number | null;
  requiresSerial: boolean;
  kind: SellerSalesModel;
  defaultLeadTimeDays: number | null;
  defaultCommissionPercent: number | null;
  reorderIntervalDays: number | null;
};
type SaleItem = {
  key: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  sku: string | null;
  variantName: string | null;
  quantity: number;
  unitPriceCents: number;
  warrantyDays: number;
  serialNumber: string;
  available: number | null;
  requiresSerial: boolean;
  kind: SellerSalesModel;
  customizationNotes: string;
  promisedOn: string;
  commissionPercent: number;
  quickProduct?: {
    name: string;
    sku: string;
    kind: SellerSalesModel;
    collectionId: string;
    variantName: string;
    initialStock: number;
    trackStock: boolean;
    requiresSerial: boolean;
    brand: string;
    defaultLeadTimeDays: number | null;
    defaultCommissionPercent: number | null;
    reorderIntervalDays: number | null;
  };
};

type QuickDraft = {
  name: string; sku: string; price: string; quantity: number; kind: SellerSalesModel;
  collectionId: string; variantName: string; initialStock: number; warrantyDays: number;
  serialNumber: string; trackStock: boolean; requiresSerial: boolean;
  brand: string; defaultLeadTimeDays: number; defaultCommissionPercent: number;
  reorderIntervalDays: number; customizationNotes: string; promisedOn: string;
};

const initialState: ConfirmSellerSaleState = { error: null, orderId: null };

export function SellerSaleConfirmation({
  dealId,
  products,
  collections,
  defaultWarrantyDays,
  defaultKind,
  enabledModules,
}: {
  dealId: string;
  products: CatalogProduct[];
  collections: SellerCollection[];
  defaultWarrantyDays: number;
  defaultKind: SellerSalesModel;
  enabledModules: SellerModule[];
}) {
  const usesCollections = enabledModules.includes("collections");
  const usesVariants = enabledModules.includes("variants");
  const usesInventory = enabledModules.includes("inventory");
  const usesWarranties = enabledModules.includes("warranties");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(confirmSellerSale, initialState);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [discount, setDiscount] = useState("");
  const [shipping, setShipping] = useState("");
  const [quick, setQuick] = useState<QuickDraft>(() => ({
    name: "", sku: "", price: "", quantity: 1, kind: defaultKind,
    collectionId: "", variantName: "", initialStock: 1,
    warrantyDays: usesWarranties ? defaultWarrantyDays : 0, serialNumber: "", trackStock: usesInventory, requiresSerial: false,
    brand: "", defaultLeadTimeDays: 7, defaultCommissionPercent: 0,
    reorderIntervalDays: 30, customizationNotes: "", promisedOn: "",
  }));

  useEffect(() => {
    if (state.orderId) router.replace(`/painel/pedidos/${state.orderId}?confirmado=1`);
  }, [router, state.orderId]);

  const options = useMemo<CatalogOption[]>(() => products.flatMap<CatalogOption>((product) => {
    if (product.variants.length === 0) return [{
      key: product.id, productId: product.id, variantId: null, name: product.name,
      variantName: null, sku: product.sku, price: product.base_price_cents,
      warrantyDays: usesWarranties ? product.warranty_days : 0, available: usesInventory && product.track_stock ? product.stock_quantity - product.reserved_quantity : null,
      requiresSerial: usesWarranties && product.requires_serial,
      kind: product.kind, defaultLeadTimeDays: product.default_lead_time_days,
      defaultCommissionPercent: product.default_commission_percent, reorderIntervalDays: product.reorder_interval_days,
    }];
    return product.variants.filter((variant) => variant.active).map((variant) => ({
      key: `${product.id}:${variant.id}`, productId: product.id, variantId: variant.id,
      name: product.name, variantName: variant.name, sku: variant.sku ?? product.sku,
      price: variant.price_cents ?? product.base_price_cents, warrantyDays: usesWarranties ? product.warranty_days : 0,
      available: usesInventory && product.track_stock ? variant.stock_quantity - variant.reserved_quantity : null,
      requiresSerial: usesWarranties && product.requires_serial,
      kind: product.kind, defaultLeadTimeDays: product.default_lead_time_days,
      defaultCommissionPercent: product.default_commission_percent, reorderIntervalDays: product.reorder_interval_days,
    }));
  }), [products, usesInventory, usesWarranties]);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const matches = normalizedSearch ? options.filter((option) => [option.name, option.variantName, option.sku].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(normalizedSearch)).slice(0, 8) : [];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const total = Math.max(0, subtotal - inputToCents(discount) + inputToCents(shipping));
  const payload = items.map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
    warranty_days: item.warrantyDays,
    serial_number: item.serialNumber,
    customization_notes: item.customizationNotes,
    promised_on: item.promisedOn,
    commission_percent: item.commissionPercent,
    variant_snapshot: item.variantName,
    ...(item.quickProduct ? { quick_product: {
      name: item.quickProduct.name,
      sku: item.quickProduct.sku,
      kind: item.quickProduct.kind,
      collection_id: item.quickProduct.collectionId,
      variant_name: item.quickProduct.variantName,
      initial_stock: item.quickProduct.initialStock,
      warranty_days: item.warrantyDays,
      track_stock: item.quickProduct.trackStock,
      requires_serial: item.quickProduct.requiresSerial,
      brand: item.quickProduct.brand,
      default_lead_time_days: item.quickProduct.defaultLeadTimeDays,
      default_commission_percent: item.quickProduct.defaultCommissionPercent,
      reorder_interval_days: item.quickProduct.reorderIntervalDays,
    } } : {}),
  }));

  function addCatalogOption(option: CatalogOption) {
    setItems((current) => {
      const existing = current.find((item) => item.key === option.key);
      if (existing) return current.map((item) => item.key === option.key ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, {
        key: option.key, productId: option.productId, variantId: option.variantId,
        name: option.name, sku: option.sku, variantName: option.variantName,
        quantity: 1, unitPriceCents: option.price, warrantyDays: option.warrantyDays,
        serialNumber: "", available: option.available, requiresSerial: option.requiresSerial,
        kind: option.kind, customizationNotes: "", promisedOn: defaultPromisedOn(option.kind, option.defaultLeadTimeDays),
        commissionPercent: option.defaultCommissionPercent ?? 0,
      }];
    });
    setSearch("");
  }

  function addQuickProduct() {
    const name = quick.name.trim();
    const unitPriceCents = inputToCents(quick.price);
    if (!name || unitPriceCents < 0) return;
    const key = `quick:${crypto.randomUUID()}`;
    setItems((current) => [...current, {
      key, productId: null, variantId: null, name, sku: quick.sku.trim() || null,
      variantName: quick.variantName.trim() || null, quantity: Math.max(1, quick.quantity),
      unitPriceCents, warrantyDays: Math.max(0, quick.warrantyDays),
      serialNumber: quick.serialNumber.trim(), available: null, requiresSerial: quick.requiresSerial,
      kind: quick.kind, customizationNotes: quick.customizationNotes.trim(), promisedOn: quick.promisedOn,
      commissionPercent: quick.kind === "commercial_representative" ? Math.max(0, Math.min(100, quick.defaultCommissionPercent)) : 0,
      quickProduct: {
        name, sku: quick.sku.trim(), kind: quick.kind, collectionId: quick.collectionId,
        variantName: quick.variantName.trim(), initialStock: Math.max(quick.quantity, quick.initialStock),
        trackStock: quick.trackStock, requiresSerial: quick.requiresSerial,
        brand: quick.brand.trim(),
        defaultLeadTimeDays: quick.kind === "made_to_order" ? Math.max(1, quick.defaultLeadTimeDays) : null,
        defaultCommissionPercent: quick.kind === "commercial_representative" ? Math.max(0, Math.min(100, quick.defaultCommissionPercent)) : null,
        reorderIntervalDays: quick.kind === "consumable" ? Math.max(1, quick.reorderIntervalDays) : null,
      },
    }]);
    setQuick({ name: "", sku: "", price: "", quantity: 1, kind: defaultKind, collectionId: "", variantName: "", initialStock: 1, warrantyDays: usesWarranties ? defaultWarrantyDays : 0, serialNumber: "", trackStock: usesInventory, requiresSerial: false, brand: "", defaultLeadTimeDays: 7, defaultCommissionPercent: 0, reorderIntervalDays: 30, customizationNotes: "", promisedOn: "" });
    setShowQuick(false);
  }

  function updateItem(key: string, patch: Partial<SaleItem>) { setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item)); }
  function removeItem(key: string) { setItems((current) => current.filter((item) => item.key !== key)); }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="deal_id" value={dealId} />
      <input type="hidden" name="items_json" value={JSON.stringify(payload)} />

      <section className="border border-white/[0.09] bg-[#1e1d22]/92">
        <header className="flex flex-col gap-3 border-b border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold text-white">Itens da venda</h2><p className="mt-1 text-xs text-od-text-3">Busque no catálogo ou cadastre o que está vendendo agora.</p></div>
          <button type="button" onClick={() => setShowQuick((value) => !value)} className="btn-secondary"><PackagePlus size={15} /> Criar produto nesta venda</button>
        </header>

        <div className="relative border-b border-white/[0.08] p-4">
          <label className="relative block max-w-2xl"><span className="sr-only">Buscar produto</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-od-text-3" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto ou criar agora" className="field pl-10" /></label>
          {matches.length > 0 ? <div className="absolute left-4 right-4 top-[64px] z-[var(--z-dropdown)] max-w-2xl border border-white/[0.13] bg-[#151419] shadow-lg">
            {matches.map((option) => <button type="button" key={option.key} onClick={() => addCatalogOption(option)} className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_7rem_6rem] items-center gap-3 border-b border-white/[0.07] px-3 text-left last:border-b-0 hover:bg-white/[0.04]"><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-white/78">{option.name}</strong><span className="mt-1 block truncate text-xs text-od-text-3">{option.variantName || option.sku || "Produto principal"}</span></span><span className="text-sm font-medium tabular-nums text-white/68">{formatMoney(option.price)}</span><span className={`text-right text-xs ${option.available !== null && option.available <= 0 ? "text-[#fb7767]" : "text-od-text-3"}`}>{option.available === null ? "Livre" : `${option.available} un.`}</span></button>)}
          </div> : null}
        </div>

        {showQuick ? <div className="border-b border-od-accent/18 bg-od-accent/[0.035] p-4">
          <div className="mb-4 flex items-center gap-3"><span className="grid size-8 place-items-center border border-od-accent/20 bg-od-accent/[0.08] text-od-text-2"><PackagePlus size={16} /></span><div><h3 className="text-sm font-semibold text-white">Produto novo</h3><p className="mt-1 text-xs text-od-text-3">Preencha o essencial. Fotos e detalhes podem ser completados no catálogo.</p></div></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <QuickField label="Nome do produto"><input value={quick.name} onChange={(event) => setQuick({ ...quick, name: event.target.value })} required placeholder="Ex: Relógio Masculino" className="field mt-1.5" /></QuickField>
            <QuickField label="SKU opcional"><input value={quick.sku} onChange={(event) => setQuick({ ...quick, sku: event.target.value })} placeholder="Ex: REL-COU-01" className="field mt-1.5" /></QuickField>
            <QuickField label="Preço"><input value={quick.price} onChange={(event) => setQuick({ ...quick, price: event.target.value })} inputMode="decimal" placeholder="0,00" className="field mt-1.5" /></QuickField>
            <QuickField label="Quantidade"><input value={quick.quantity} onChange={(event) => setQuick({ ...quick, quantity: Math.max(1, Number(event.target.value) || 1) })} type="number" min="1" className="field mt-1.5" /></QuickField>
            <QuickField label="Tipo"><select value={quick.kind} onChange={(event) => { const kind = event.target.value as SellerSalesModel; setQuick({ ...quick, kind, promisedOn: kind === "made_to_order" ? quick.promisedOn || defaultPromisedOn(kind, quick.defaultLeadTimeDays) : "" }); }} className="field mt-1.5">{SELLER_SALES_MODELS.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}</select></QuickField>
            <QuickField label="Marca"><input value={quick.brand} onChange={(event) => setQuick({ ...quick, brand: event.target.value })} placeholder="Opcional" className="field mt-1.5" /></QuickField>
            {usesCollections ? <QuickField label="Coleção"><select value={quick.collectionId} onChange={(event) => setQuick({ ...quick, collectionId: event.target.value })} className="field mt-1.5"><option value="">Sem coleção</option>{collections.filter((collection) => collection.status !== "archived").map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></QuickField> : null}
            {usesVariants ? <QuickField label="Variação"><input value={quick.variantName} onChange={(event) => setQuick({ ...quick, variantName: event.target.value })} placeholder="Ex: Preto / 220V" className="field mt-1.5" /></QuickField> : null}
            {quick.kind === "made_to_order" ? <><QuickField label="Prazo de produção (dias)"><input value={quick.defaultLeadTimeDays} onChange={(event) => { const defaultLeadTimeDays = Math.max(1, Number(event.target.value) || 1); setQuick({ ...quick, defaultLeadTimeDays, promisedOn: defaultPromisedOn("made_to_order", defaultLeadTimeDays) }); }} type="number" min="1" max="365" className="field mt-1.5" /></QuickField><QuickField label="Entrega prometida"><input value={quick.promisedOn} onChange={(event) => setQuick({ ...quick, promisedOn: event.target.value })} type="date" className="field mt-1.5" /></QuickField><QuickField label="Personalização"><input value={quick.customizationNotes} onChange={(event) => setQuick({ ...quick, customizationNotes: event.target.value })} placeholder="Medidas, cor, acabamento…" className="field mt-1.5" /></QuickField></> : null}
            {quick.kind === "commercial_representative" ? <QuickField label="Comissão padrão (%)"><input value={quick.defaultCommissionPercent} onChange={(event) => setQuick({ ...quick, defaultCommissionPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} type="number" min="0" max="100" step="0.01" className="field mt-1.5" /></QuickField> : null}
            {quick.kind === "consumable" ? <QuickField label="Sugerir recompra em (dias)"><input value={quick.reorderIntervalDays} onChange={(event) => setQuick({ ...quick, reorderIntervalDays: Math.max(1, Number(event.target.value) || 1) })} type="number" min="1" max="3650" className="field mt-1.5" /></QuickField> : null}
            {usesInventory ? <><QuickField label="Estoque inicial"><input value={quick.initialStock} onChange={(event) => setQuick({ ...quick, initialStock: Math.max(0, Number(event.target.value) || 0) })} type="number" min="0" className="field mt-1.5" /></QuickField><label className="flex min-h-11 items-center gap-2 self-end text-sm text-white/58"><input type="checkbox" checked={quick.trackStock} onChange={(event) => setQuick({ ...quick, trackStock: event.target.checked })} className="size-4 accent-od-accent" /> Controlar estoque</label></> : null}
            {usesWarranties ? <><QuickField label="Garantia em dias"><input value={quick.warrantyDays} onChange={(event) => setQuick({ ...quick, warrantyDays: Math.max(0, Number(event.target.value) || 0) })} type="number" min="0" max="3650" className="field mt-1.5" /></QuickField><QuickField label="Número de série"><input value={quick.serialNumber} onChange={(event) => setQuick({ ...quick, serialNumber: event.target.value })} placeholder="Opcional" className="field mt-1.5" /></QuickField><label className="flex min-h-11 items-center gap-2 self-end text-sm text-white/58"><input type="checkbox" checked={quick.requiresSerial} onChange={(event) => setQuick({ ...quick, requiresSerial: event.target.checked })} className="size-4 accent-od-accent" /> Exigir série</label></> : null}
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowQuick(false)} className="btn-secondary">Cancelar</button><button type="button" onClick={addQuickProduct} disabled={!quick.name.trim() || !quick.price.trim()} className="btn"><Plus size={15} /> Criar e adicionar</button></div>
        </div> : null}

        {items.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center"><Box size={23} className="text-od-text-3" /><p className="mt-3 text-sm font-semibold text-white/64">Nenhum item adicionado</p><p className="mt-1 text-xs text-od-text-3">A venda só será confirmada depois que os itens reais forem informados.</p></div> : <div>
          <div className="hidden grid-cols-[minmax(12rem,1.3fr)_7rem_7rem_8rem_7rem_2.5rem] border-b border-white/[0.08] px-4 py-2 text-xs font-semibold text-od-text-3 lg:grid"><span>Produto</span><span>Quantidade</span><span>Preço</span><span>Garantia</span><span>Subtotal</span><span /></div>
          <div className="divide-y divide-white/[0.08]">{items.map((item) => <div key={item.key} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(12rem,1.3fr)_7rem_7rem_8rem_7rem_2.5rem] lg:items-center">
            <div className="min-w-0"><div className="flex items-center gap-2"><strong className="truncate text-sm font-semibold text-white/82">{item.name}</strong>{item.quickProduct ? <span className="border border-od-accent/25 px-1.5 py-0.5 text-xs font-semibold text-od-text">Novo</span> : null}</div><p className="mt-1 truncate text-xs text-od-text-3">{[item.variantName, item.sku].filter(Boolean).join(" · ") || "Produto principal"}{item.available !== null ? ` · ${item.available} un. disponíveis` : ""}</p>{(item.requiresSerial || item.warrantyDays > 0) ? <input value={item.serialNumber} onChange={(event) => updateItem(item.key, { serialNumber: event.target.value })} placeholder="Número de série" className="field mt-2 h-9 min-h-9 text-xs" /> : null}{item.kind === "made_to_order" ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={item.customizationNotes} onChange={(event) => updateItem(item.key, { customizationNotes: event.target.value })} placeholder="Personalização / especificações" className="field h-9 min-h-9 text-xs" /><label><span className="sr-only">Entrega prometida</span><input value={item.promisedOn} onChange={(event) => updateItem(item.key, { promisedOn: event.target.value })} type="date" title="Entrega prometida" className="field h-9 min-h-9 text-xs" /></label></div> : null}{item.kind === "commercial_representative" ? <label className="mt-2 block"><span className="mb-1 block text-xs font-medium text-od-text-3">Comissão desta venda (%)</span><input value={item.commissionPercent} onChange={(event) => updateItem(item.key, { commissionPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} type="number" min="0" max="100" step="0.01" className="field h-9 min-h-9 text-xs" /></label> : null}</div>
            <label><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Quantidade</span><span className="flex h-11 items-center border border-white/[0.1]"><button type="button" aria-label={`Reduzir quantidade de ${item.name}`} onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })} className="grid h-full w-9 place-items-center text-od-text-3"><Minus size={13} /></button><input aria-label={`Quantidade de ${item.name}`} value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: Math.max(1, Number(event.target.value) || 1) })} type="number" min="1" className="h-full min-h-0 border-y-0 px-1 text-center text-sm" /><button type="button" aria-label={`Aumentar quantidade de ${item.name}`} onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })} className="grid h-full w-9 place-items-center text-od-text-3"><Plus size={13} /></button></span></label>
            <label><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Preço</span><input aria-label={`Preço de ${item.name}`} value={centsToInput(item.unitPriceCents)} onChange={(event) => updateItem(item.key, { unitPriceCents: inputToCents(event.target.value) })} inputMode="decimal" className="field text-sm" /></label>
            {usesWarranties ? <label><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Garantia em dias</span><span className="sr-only">Garantia em dias</span><input value={item.warrantyDays} onChange={(event) => updateItem(item.key, { warrantyDays: Math.max(0, Number(event.target.value) || 0) })} type="number" min="0" max="3650" className="field text-sm" /></label> : <span className="hidden lg:block" />}
            <strong className="text-sm font-semibold tabular-nums text-white/76"><span className="mb-1 block text-xs font-medium text-od-text-3 lg:hidden">Subtotal</span>{formatMoney(item.quantity * item.unitPriceCents)}</strong>
            <button type="button" onClick={() => removeItem(item.key)} aria-label={`Remover ${item.name}`} className="grid size-10 place-items-center text-od-text-3 hover:text-[#fb7767]"><Trash2 size={15} /></button>
          </div>)}</div>
        </div>}
      </section>

      <section className="grid border border-white/[0.09] bg-[#1e1d22]/92 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid gap-4 border-b border-white/[0.08] p-4 md:grid-cols-2 xl:border-b-0 xl:border-r">
          <label><span className="label">Forma de pagamento</span><select name="payment_method" defaultValue="pix" className="field mt-1.5"><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="installments">Parcelado</option><option value="bank_transfer">Transferência</option><option value="payment_link">Link de pagamento</option><option value="other">Outro</option></select></label>
          <label><span className="label">Entrega</span><select name="delivery_method" defaultValue="pickup" className="field mt-1.5"><option value="pickup">Retirada</option><option value="local_delivery">Entrega local</option><option value="carrier">Transportadora</option><option value="customer_address">Endereço do cliente</option><option value="digital">Digital</option><option value="other">Outro</option></select></label>
          <label><span className="label">Desconto</span><input name="discount" value={discount} onChange={(event) => setDiscount(event.target.value)} inputMode="decimal" placeholder="0,00" className="field mt-1.5" /></label>
          <label><span className="label">Frete</span><input name="shipping" value={shipping} onChange={(event) => setShipping(event.target.value)} inputMode="decimal" placeholder="0,00" className="field mt-1.5" /></label>
          <label className="md:col-span-2"><span className="label">Observações do pedido</span><textarea name="notes" maxLength={2000} placeholder="Entrega combinada, embalagem, personalização ou outra informação" className="field mt-1.5" /></label>
        </div>
        <dl className="p-4 text-sm"><TotalRow label="Subtotal" value={formatMoney(subtotal)} /><TotalRow label="Desconto" value={`− ${formatMoney(inputToCents(discount))}`} /><TotalRow label="Frete" value={formatMoney(inputToCents(shipping))} /><div className="mt-3 flex items-end justify-between gap-4 border-t border-white/[0.1] pt-4"><dt className="font-semibold text-white/58">Total da venda</dt><dd className="text-xl font-semibold tabular-nums text-od-text">{formatMoney(total)}</dd></div></dl>
      </section>

      {state.error ? <div role="alert" className="flex items-start gap-3 border border-[#fb7767]/30 bg-[#fb7767]/[0.06] p-4 text-sm text-[#fca79b]"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><strong className="font-semibold">A venda não foi confirmada.</strong><p className="mt-1 text-[#fca79b]/80">{state.error}</p></div></div> : null}

      <footer className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-[var(--z-sticky)] flex flex-col-reverse gap-2 border-t border-white/[0.08] bg-[#151419]/96 py-3 sm:flex-row sm:items-center sm:justify-end md:bottom-0">
        <button type="button" onClick={() => router.push("/painel/funil")} className="btn-secondary">Voltar ao funil</button>
        <button type="submit" disabled={pending || items.length === 0} className="btn min-w-64">{pending ? "Confirmando venda…" : <><Check size={16} /> Confirmar venda e criar pedido</>}</button>
      </footer>
    </form>
  );
}

function QuickField({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="label">{label}</span>{children}</label>; }
function TotalRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 py-2"><dt className="text-od-text-3">{label}</dt><dd className="font-semibold tabular-nums text-white/72">{value}</dd></div>; }
function inputToCents(value: string) { const raw = value.trim().replace(/R\$\s?/gi, "").replace(/\s/g, ""); if (!raw) return 0; const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw; const parsed = Number(normalized); return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0; }
function centsToInput(value: number) { return (value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatMoney(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }
function defaultPromisedOn(kind: SellerSalesModel, leadTimeDays: number | null) {
  if (kind !== "made_to_order") return "";
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + Math.max(1, leadTimeDays ?? 1));
  return date.toISOString().slice(0, 10);
}
