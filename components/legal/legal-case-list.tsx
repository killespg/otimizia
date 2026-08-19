"use client";

import { useMemo } from "react";
import Link from "next/link";
import { bulkDeleteLegalCases } from "@/app/(dashboard)/painel/juridico/actions";
import { BulkActionBar, BulkSelectAll, BulkSelectCheckbox, useBulkSelection } from "@/components/ui/BulkSelect";

export type LegalCaseRow = {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  responsibleLabel: string;
  deadlineLabel: string;
  deadlineNear: boolean;
};

/**
 * Fila de processos com seleção múltipla. Só quem pode gerenciar casos recebe
 * `canManage` — para os demais a lista continua sendo apenas leitura.
 */
export function LegalCaseList({ rows, canManage }: { rows: LegalCaseRow[]; canManage: boolean }) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useBulkSelection(ids);

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-2 text-od-label text-od-text-3">
        {canManage && (
          <BulkSelectAll
            allSelected={selection.allSelected}
            someSelected={selection.selectedCount > 0}
            onToggleAll={selection.toggleAll}
            dark
          />
        )}
        <div className="hidden flex-1 grid-cols-[minmax(0,1.5fr)_8rem_9rem_10rem] gap-4 sm:grid">
          <span>Caso</span>
          <span>Situação</span>
          <span>Responsável</span>
          <span>Próximo prazo</span>
        </div>
        {canManage && <span className="sm:hidden">Selecionar casos</span>}
      </div>

      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4 hover:bg-white/[0.025]">
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
            className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1.5fr)_8rem_9rem_10rem] sm:items-center sm:gap-4"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">{row.title}</p>
              <p className="mt-1 truncate text-xs text-od-text-3">{row.subtitle}</p>
            </div>
            <span className="w-fit rounded-[var(--radius-round)] bg-white/[0.06] px-2 py-1 text-xs font-semibold text-od-text">
              {row.statusLabel}
            </span>
            <span className="text-xs text-white/58">{row.responsibleLabel}</span>
            <span className={"text-xs font-semibold " + (row.deadlineNear ? "text-[#fb7767]" : "text-white/52")}>
              {row.deadlineLabel}
            </span>
          </Link>
        </div>
      ))}
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
        />
      )}
    </div>
  );
}
