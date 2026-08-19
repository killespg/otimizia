"use client";

import { useMemo, type ReactNode } from "react";
import { bulkDeleteLegalDeadlines } from "@/app/(dashboard)/painel/juridico/actions";
import { BulkActionBar, BulkSelectAll, BulkSelectCheckbox, useBulkSelection } from "@/components/ui/BulkSelect";

export type CaseDeadlineRow = {
  id: string;
  title: string;
  meta: string;
  overdue: boolean;
  /** Concluir e visibilidade continuam sendo forms renderizados no servidor. */
  actions: ReactNode;
  visibility: ReactNode;
};

/**
 * Prazos e audiências de um caso. Diferente da agenda geral, aqui as linhas são
 * registros da tabela de prazos, então excluir apaga o prazo — o caso não é
 * tocado.
 */
export function LegalCaseDeadlineList({ rows, canManage }: { rows: CaseDeadlineRow[]; canManage: boolean }) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useBulkSelection(ids);

  return (
    <div>
      {canManage && (
        <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-4 py-2 text-xs font-bold text-ink-muted">
          <BulkSelectAll
            allSelected={selection.allSelected}
            someSelected={selection.selectedCount > 0}
            onToggleAll={selection.toggleAll}
            label="Selecionar prazos"
          />
          Selecionar prazos
        </div>
      )}
      <div className="divide-y divide-line">
        {rows.map((row) => (
          <article key={row.id} className="flex items-start gap-3 p-4">
            {canManage && (
              <BulkSelectCheckbox
                checked={selection.selected.includes(row.id)}
                onCheckedChange={(checked) => selection.toggleOne(row.id, checked)}
                label={`Selecionar ${row.title}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={"text-sm font-black " + (row.overdue ? "text-danger-600" : "text-ink")}>{row.title}</p>
                  <p className="mt-1 text-xs font-bold text-ink-muted">{row.meta}</p>
                </div>
                {row.actions}
              </div>
              {row.visibility ? <div className="mt-2">{row.visibility}</div> : null}
            </div>
          </article>
        ))}
      </div>
      {canManage && (
        <BulkActionBar
          allSelected={selection.allSelected}
          selectedCount={selection.selectedCount}
          isPending={selection.isPending}
          error={selection.error}
          onToggleAll={selection.toggleAll}
          onDelete={() => selection.run(bulkDeleteLegalDeadlines)}
          nounSingular="prazo"
          nounPlural="prazos"
        />
      )}
    </div>
  );
}
