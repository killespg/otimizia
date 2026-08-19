"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { bulkDeleteSellerProducts } from "@/app/(dashboard)/painel/operacao/actions";
import { ProductThumb, SellerEmptyState } from "@/components/seller/seller-ui";
import { BulkActionBar, BulkSelectAll, BulkSelectCheckbox, useBulkSelection } from "@/components/ui/BulkSelect";

export type ProductCatalogRow = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  collectionName: string;
  variantCount: number;
  priceLabel: string;
  stockLabel: string;
  lowStock: boolean;
  variantSummaries: { id: string; name: string; available: number }[];
};

/**
 * Fila do catálogo. Mantém a mesma grade da página, mas em client component
 * porque cada linha ganha caixa de seleção para a exclusão em lote.
 */
export function ProductCatalogList({
  rows,
  columnsStyle,
  usesCollections,
  usesVariants,
  usesInventory,
}: {
  rows: ProductCatalogRow[];
  columnsStyle: CSSProperties;
  usesCollections: boolean;
  usesVariants: boolean;
  usesInventory: boolean;
}) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useBulkSelection(ids);

  if (rows.length === 0) {
    return <SellerEmptyState title="Nenhum produto encontrado" description="Revise a busca ou remova o filtro de coleção." />;
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-2 text-xs font-semibold text-od-text-3">
        <BulkSelectAll
          allSelected={selection.allSelected}
          someSelected={selection.selectedCount > 0}
          onToggleAll={selection.toggleAll}
          dark
        />
        <div className="seller-product-grid hidden flex-1 gap-3 xl:grid" style={columnsStyle}>
          <span>Produto</span>
          {usesCollections ? <span>Coleção</span> : null}
          {usesVariants ? <span>Variações</span> : null}
          <span>Preço</span>
          {usesInventory ? <span>Estoque</span> : null}
          <span className="text-right">Ações</span>
        </div>
        <span className="xl:hidden">Selecionar produtos</span>
      </div>
      <div className="divide-y divide-white/[0.08]">
        {rows.map((row) => (
          <article key={row.id} className="group px-4 py-3 hover:bg-white/[0.025]">
            <div className="flex items-start gap-3">
              <BulkSelectCheckbox
                checked={selection.selected.includes(row.id)}
                onCheckedChange={(checked) => selection.toggleOne(row.id, checked)}
                label={`Selecionar ${row.name}`}
                dark
              />
              <div className="min-w-0 flex-1">
                <div className="seller-product-grid grid gap-3 xl:items-center" style={columnsStyle}>
                  <Link href={`/painel/produtos/${row.id}`} className="flex min-w-0 items-center gap-3">
                    <ProductThumb src={row.imageUrl} name={row.name} />
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-semibold text-white/88">{row.name}</strong>
                      <span className="mt-1 block truncate text-xs text-od-text-3">SKU: {row.sku || "não informado"}</span>
                    </span>
                  </Link>
                  {usesCollections ? (
                    <span className="text-xs text-white/54">
                      <span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Coleção</span>
                      {row.collectionName}
                    </span>
                  ) : null}
                  {usesVariants ? (
                    <span className="text-xs text-white/54">
                      <span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Variações</span>
                      {row.variantCount || "—"}
                    </span>
                  ) : null}
                  <span className="text-sm font-medium tabular-nums text-white/78">
                    <span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Preço</span>
                    {row.priceLabel}
                  </span>
                  {usesInventory ? (
                    <span className={`text-sm font-semibold tabular-nums ${row.lowStock ? "text-amber-300" : "text-white/70"}`}>
                      <span className="mb-1 block text-xs font-medium text-od-text-3 xl:hidden">Estoque</span>
                      {row.stockLabel}
                    </span>
                  ) : null}
                  <Link
                    href={`/painel/produtos/${row.id}`}
                    className="flex min-h-11 items-center justify-end text-xs font-semibold text-od-text-2"
                  >
                    Detalhes <ChevronRight size={14} />
                  </Link>
                </div>
                {usesVariants && row.variantSummaries.length > 0 ? (
                  <div className="mt-3 hidden border-t border-white/[0.06] pt-2 xl:block">
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-od-text-3">
                      {row.variantSummaries.map((variant) => (
                        <span key={variant.id}>
                          {variant.name}: <strong className="font-semibold text-white/58">{variant.available} un.</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      <BulkActionBar
        allSelected={selection.allSelected}
        selectedCount={selection.selectedCount}
        isPending={selection.isPending}
        error={selection.error}
        onToggleAll={selection.toggleAll}
        onDelete={() => selection.run(bulkDeleteSellerProducts)}
        nounSingular="produto"
        nounPlural="produtos"
        dark
      />
    </div>
  );
}
