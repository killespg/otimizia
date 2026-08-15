"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, SlidersHorizontal } from "lucide-react";
import { PendingButton } from "@/components/ui/PendingButton";
import { modulesForSalesModels, SELLER_MODULES, SELLER_SALES_MODELS } from "@/lib/seller/seller-operations";
import type { SellerModule, SellerSalesModel } from "@/lib/supabase/types";
import { updateSellerBusinessProfile, type UpdateSellerBusinessProfileState } from "@/app/(dashboard)/painel/operacao/actions";

type Props = {
  salesModels: SellerSalesModel[];
  enabledModules: SellerModule[];
  defaultWarrantyDays: number;
  lowStockThreshold: number;
  allowNegativeStock: boolean;
  canEdit: boolean;
};

export function SellerOperationSettingsForm(props: Props) {
  const [state, formAction] = useActionState<UpdateSellerBusinessProfileState, FormData>(updateSellerBusinessProfile, { error: null });
  const [models, setModels] = useState<SellerSalesModel[]>(props.salesModels);
  const [modules, setModules] = useState<SellerModule[]>(props.enabledModules);

  function toggleModel(model: SellerSalesModel) {
    if (!props.canEdit) return;
    setModels((current) => {
      const next = current.includes(model) ? current.filter((item) => item !== model) : [...current, model];
      if (!current.includes(model)) setModules((enabled) => [...new Set([...enabled, ...modulesForSalesModels([model])])]);
      return next;
    });
  }

  function toggleModule(module: SellerModule) {
    if (!props.canEdit || module === "catalog" || module === "orders") return;
    setModules((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module]);
  }

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
        <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">O que você vende</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-od-text-3">Marque tudo que fizer parte da sua operação. Um mesmo negócio pode trabalhar com moda, garantia e encomendas ao mesmo tempo.</p></header>
        <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {SELLER_SALES_MODELS.map((model) => {
            const selected = models.includes(model.value);
            return <label key={model.value} className={`relative flex min-h-28 cursor-pointer gap-3 rounded-[var(--radius-inner)] border p-4 ${selected ? "border-od-accent bg-od-accent/[0.055]" : "border-white/[0.07] hover:bg-white/[0.02]"}`}>
              <input type="checkbox" name="sales_models" value={model.value} checked={selected} onChange={() => toggleModel(model.value)} disabled={!props.canEdit} className="sr-only" />
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-[var(--radius-control)] border ${selected ? "border-od-accent bg-od-accent text-white" : "border-white/20 text-transparent"}`}><Check size={14} /></span>
              <span><strong className="block text-sm font-semibold text-white/78">{model.label}</strong><span className="mt-1.5 block text-xs leading-relaxed text-od-text-3">{model.description}</span></span>
            </label>;
          })}
        </div>
      </section>

      <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
        <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Ferramentas da operação</h2><p className="mt-1 text-xs text-od-text-3">As opções sugeridas foram ativadas conforme os tipos de venda selecionados. Você pode ajustar.</p></header>
        <div className="divide-y divide-white/[0.07]">
          {SELLER_MODULES.map((module) => {
            const selected = modules.includes(module.value);
            const locked = module.value === "catalog" || module.value === "orders";
            return <label key={module.value} className="flex min-h-16 cursor-pointer items-center gap-3 px-4 hover:bg-white/[0.02]">
              <input type="checkbox" name="enabled_modules" value={module.value} checked={selected} onChange={() => toggleModule(module.value)} disabled={!props.canEdit || locked} className="sr-only" />
              {locked ? <input type="hidden" name="enabled_modules" value={module.value} /> : null}
              <span className={`grid size-6 shrink-0 place-items-center rounded-[var(--radius-control)] border ${selected ? "border-od-accent bg-od-accent text-white" : "border-white/20 text-transparent"}`}><Check size={14} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-white/72">{module.label}</strong><span className="mt-1 block text-xs text-od-text-3">{module.description}</span></span>
              {locked ? <span className="text-xs font-semibold text-od-text-3">Essencial</span> : null}
            </label>;
          })}
        </div>
      </section>

      <section className="rounded-[var(--radius-panel)] border border-white/[0.09] bg-[#1e1d22]/90">
        <header className="border-b border-white/[0.08] px-4 py-4"><h2 className="text-sm font-semibold text-white">Padrões de cadastro</h2><p className="mt-1 text-xs text-od-text-3">Esses valores entram automaticamente na criação rápida durante a venda e podem ser alterados por item.</p></header>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <label><span className="label">Garantia padrão em dias</span><input name="default_warranty_days" type="number" min="0" max="3650" defaultValue={props.defaultWarrantyDays} disabled={!props.canEdit} className="field mt-1.5" /></label>
          <label><span className="label">Alerta de estoque baixo</span><input name="low_stock_threshold" type="number" min="0" defaultValue={props.lowStockThreshold} disabled={!props.canEdit} className="field mt-1.5" /></label>
          <label className="flex min-h-11 items-center gap-3 self-end text-sm text-white/62"><input name="allow_negative_stock" type="checkbox" defaultChecked={props.allowNegativeStock} disabled={!props.canEdit} className="size-4 accent-od-accent" /><span>Permitir estoque negativo</span></label>
        </div>
      </section>

      {state.error ? <div role="alert" className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-[#fb7767]/30 bg-[#fb7767]/[0.06] p-4 text-sm text-[#fca79b]"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><strong className="font-semibold">A configuração não foi salva.</strong><p className="mt-1 text-[#fca79b]/80">{state.error}</p></div></div> : null}
      {props.canEdit ? <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-[var(--z-sticky)] flex justify-end border-t border-od-border bg-od-bg py-3 md:bottom-0"><PendingButton className="btn" pendingLabel="Salvando configuração"><SlidersHorizontal size={15} /> Salvar configuração</PendingButton></div> : <p className="rounded-[var(--radius-inner)] border border-amber-300/20 bg-amber-300/[0.04] p-4 text-sm text-amber-200">Você pode consultar esta configuração, mas somente a administração pode alterá-la.</p>}
    </form>
  );
}
