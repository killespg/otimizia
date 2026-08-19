"use client";

import { useMemo } from "react";
import Link from "next/link";
import { bulkClearCaseDeadlines, bulkDeleteLegalCases } from "@/app/(dashboard)/painel/juridico/actions";
import { BulkActionBar, BulkSelectAll, BulkSelectCheckbox, useBulkSelection } from "@/components/ui/BulkSelect";

export type DeadlineRow = {
  id: string;
  title: string;
  subtitle: string;
  responsibleLabel: string;
  deadlineLabel: string;
};

/**
 * Uma fila da agenda cronológica (Atrasados, Próximos 7 dias, ...). Cada linha é
 * um caso posicionado pelo próprio prazo, por isso as duas ações do lote são
 * diferentes: "tirar da agenda" apenas zera o prazo do caso, enquanto excluir
 * apaga o caso inteiro — esta última atrás da confirmação em dois toques.
 */
export function LegalDeadlineQueue({
  label,
  rows,
  tone,
  canManage,
}: {
  label: string;
  rows: DeadlineRow[];
  tone?: "danger" | "muted";
  canManage: boolean;
}) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useBulkSelection(ids);
  const anchor = `deadline-${label.replaceAll(" ", "-").toLowerCase()}`;

  return (
    <section aria-labelledby={anchor}>
      <div className="flex items-center gap-3 px-5 pb-2 pt-4">
        {canManage && (
          <BulkSelectAll
            allSelected={selection.allSelected}
            someSelected={selection.selectedCount > 0}
            onToggleAll={selection.toggleAll}
            label={`Selecionar ${label.toLocaleLowerCase("pt-BR")}`}
            dark
          />
        )}
        <h3 id={anchor} className="text-sm font-semibold text-white">
          {label}
        </h3>
        <span className="ml-auto text-xs font-semibold tabular-nums text-od-text-3">{rows.length}</span>
      </div>
      <div className="od-rows">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-5 transition-colors hover:bg-white/[0.035]">
            {canManage && (
              <BulkSelectCheckbox
                checked={selection.selected.includes(row.id)}
                onCheckedChange={(checked) => selection.toggleOne(row.id, checked)}
                label={`Selecionar ${row.title}`}
                dark
              />
            )}
            <Link
              href={`/painel/juridico/processos/${row.id}`}
              className="grid min-h-16 min-w-0 flex-1 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_11rem_11rem] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">{row.title}</p>
                <p className="mt-1 truncate text-xs text-od-text-3">{row.subtitle}</p>
              </div>
              <span className="text-xs text-white/58">{row.responsibleLabel}</span>
              <span
                className={
                  "text-xs font-semibold " +
                  (tone === "danger" ? "text-[#fb7767]" : tone === "muted" ? "text-od-text-3" : "text-od-text-2")
                }
              >
                {row.deadlineLabel}
              </span>
            </Link>
          </div>
        ))}
      </div>
      {canManage && (
        <BulkActionBar
          allSelected={selection.allSelected}
          selectedCount={selection.selectedCount}
          isPending={selection.isPending}
          error={selection.error}
          onToggleAll={selection.toggleAll}
          onDelete={() => selection.run(bulkDeleteLegalCases)}
          nounSingular="caso"
          nounPlural="casos"
          dark
        >
          <button
            type="button"
            disabled={selection.isPending}
            onClick={() => selection.run(bulkClearCaseDeadlines)}
            className="min-h-11 rounded-[var(--radius-control)] border border-white/[0.12] px-3 text-xs font-semibold text-od-text-2 hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            Tirar da agenda
          </button>
        </BulkActionBar>
      )}
    </section>
  );
}
