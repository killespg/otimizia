"use client";

import { useMemo } from "react";
import Link from "next/link";
import { bulkDeleteLegalCases } from "@/app/(dashboard)/painel/juridico/actions";
import { BulkActionBar, BulkSelectAll, BulkSelectCheckbox, useBulkSelection } from "@/components/ui/BulkSelect";
import { Status, type StatusIntent } from "@/components/ui/data-display";
import { legalCaseHref } from "@/lib/law/legal-case-path";

export type LegalCaseRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  placeLabel: string | null;
  statusLabel: string;
  statusIntent: StatusIntent;
  riskLabel: string;
  riskIntent: StatusIntent;
  responsibleLabel: string;
  deadlineLabel: string;
  deadlineIntent: StatusIntent;
  datajudLabel: string | null;
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
      <div className="flex items-center gap-3 border-b border-od-border px-5 py-2 text-od-label text-od-text-3">
        {canManage && (
          <BulkSelectAll
            allSelected={selection.allSelected}
            someSelected={selection.selectedCount > 0}
            onToggleAll={selection.toggleAll}
            dark
          />
        )}
        <div className="hidden min-w-0 flex-1 grid-cols-[minmax(0,1.7fr)_7.5rem_6.5rem_8rem_9rem] gap-4 sm:grid">
          <span>Caso</span>
          <span>Situação</span>
          <span>Prioridade</span>
          <span>Responsável</span>
          <span>Próximo prazo</span>
        </div>
        {canManage && <span className="sm:hidden">Selecionar casos</span>}
      </div>

      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-3 border-b border-od-border px-5 py-4 hover:bg-od-surface-hover">
          {canManage && (
            <BulkSelectCheckbox
              checked={selection.selected.includes(row.id)}
              onCheckedChange={(checked) => selection.toggleOne(row.id, checked)}
              label={`Selecionar ${row.title}`}
              dark
            />
          )}
          <Link
            href={legalCaseHref(row.slug, row.id)}
            className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1.7fr)_7.5rem_6.5rem_8rem_9rem] sm:items-center sm:gap-4"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-od-text">{row.title}</p>
              <p className="mt-1 truncate text-xs text-od-text-3">{row.subtitle}</p>
              {row.placeLabel ? <p className="mt-1 truncate text-xs text-od-text-3">{row.placeLabel}</p> : null}
              {row.datajudLabel ? <p className="mt-1 text-xs text-od-text-2">{row.datajudLabel}</p> : null}
            </div>
            <Status intent={row.statusIntent}>{row.statusLabel}</Status>
            <Status intent={row.riskIntent}>{row.riskLabel}</Status>
            <span className="text-xs text-od-text-2">{row.responsibleLabel}</span>
            <Status intent={row.deadlineIntent}>{row.deadlineLabel}</Status>
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
