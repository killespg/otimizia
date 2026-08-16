"use client";

import { useMemo } from "react";
import Link from "next/link";
import { bulkDeleteProperties } from "@/app/(dashboard)/painel/imoveis/actions";
import { BulkActionBar, BulkSelectAll, BulkSelectCheckbox, useBulkSelection } from "@/components/ui/BulkSelect";

export type PropertyListRow = {
  id: string;
  title: string;
  statusLabel: string;
  statusTagClass: string;
  subtitle: string;
  facts: string;
  priceLabel: string;
  coverUrl?: string;
};

export function PropertySelectableList({ rows, selectable = true }: { rows: PropertyListRow[]; selectable?: boolean }) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useBulkSelection(ids);

  return (
    <div>
      {selectable && (
        <div className="flex items-center gap-3.5 border-b border-line bg-surface-2 px-5 py-2 text-xs font-bold text-ink-muted">
          <BulkSelectAll
            allSelected={selection.allSelected}
            someSelected={selection.selectedCount > 0}
            onToggleAll={selection.toggleAll}
          />
          Selecionar imóveis
        </div>
      )}
      <div>
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3.5 px-5 py-4 hover:bg-brand-50">
            {selectable && (
              <BulkSelectCheckbox
                checked={selection.selected.includes(row.id)}
                onCheckedChange={(checked) => selection.toggleOne(row.id, checked)}
                label={`Selecionar ${row.title}`}
              />
            )}
            <Link
              href={`/painel/imoveis/${row.id}`}
              className="nav-item flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                {row.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail vem de storage público
                  <img src={row.coverUrl} alt={`Foto de capa de ${row.title}`} className="h-14 w-14 shrink-0 rounded-[var(--radius-inner)] border border-line object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius-inner)] border border-line bg-surface-2 text-ink-muted/60">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
                      <rect x="5" y="3.5" width="10" height="17" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M15 9.5h4.5v11H15" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[15px] font-semibold text-ink">{row.title}</p>
                    <span className={"tag " + row.statusTagClass}>{row.statusLabel}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-bold text-ink-muted">{row.subtitle}</p>
                  <p className="mt-1 text-xs font-semibold text-ink-soft">{row.facts}</p>
                </div>
              </div>
              <span className="shrink-0 text-base font-bold tracking-tight text-ink sm:text-right">{row.priceLabel}</span>
            </Link>
          </div>
        ))}
      </div>
      {selectable && (
        <BulkActionBar
          allSelected={selection.allSelected}
          selectedCount={selection.selectedCount}
          isPending={selection.isPending}
          error={selection.error}
          onToggleAll={selection.toggleAll}
          onDelete={() => selection.run(bulkDeleteProperties)}
          nounSingular="imóvel"
          nounPlural="imóveis"
        >
          <Link
            href={`/painel/imoveis/colecoes/nova?ids=${selection.selected.join(",")}`}
            className="min-h-11 shrink-0 content-center text-xs font-semibold text-brand-700 hover:text-brand-900"
          >
            Criar vitrine
          </Link>
        </BulkActionBar>
      )}
    </div>
  );
}
