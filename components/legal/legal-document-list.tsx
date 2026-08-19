"use client";

import { useMemo, type ReactNode } from "react";
import { bulkDeleteLegalDocuments } from "@/app/(dashboard)/painel/juridico/actions";
import { BulkActionBar, BulkSelectAll, BulkSelectCheckbox, useBulkSelection } from "@/components/ui/BulkSelect";

export type LegalDocumentRow = {
  id: string;
  name: string;
  /** A linha inteira (link, download ou minuta) continua vindo do servidor. */
  content: ReactNode;
};

/** Arquivos recentes do escritório, com exclusão em lote para quem gerencia. */
export function LegalDocumentList({ rows, canManage }: { rows: LegalDocumentRow[]; canManage: boolean }) {
  const ids = useMemo(() => rows.map((row) => row.id), [rows]);
  const selection = useBulkSelection(ids);

  return (
    <div>
      <div className="hidden grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1fr)_90px_100px_26px] gap-3 border-b border-white/[0.07] px-2 py-2 text-xs font-semibold uppercase tracking-wide text-od-text-3 md:grid">
        <span />
        <span>Documento</span>
        <span>Caso</span>
        <span>Status</span>
        <span>Atualizado</span>
        <span />
      </div>
      {canManage && (
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-2 py-2 text-xs font-semibold text-od-text-3">
          <BulkSelectAll
            allSelected={selection.allSelected}
            someSelected={selection.selectedCount > 0}
            onToggleAll={selection.toggleAll}
            label="Selecionar documentos"
            dark
          />
          Selecionar documentos
        </div>
      )}
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          {canManage && (
            <BulkSelectCheckbox
              checked={selection.selected.includes(row.id)}
              onCheckedChange={(checked) => selection.toggleOne(row.id, checked)}
              label={`Selecionar ${row.name}`}
              dark
            />
          )}
          <div className="min-w-0 flex-1">{row.content}</div>
        </div>
      ))}
      {canManage && (
        <BulkActionBar
          allSelected={selection.allSelected}
          selectedCount={selection.selectedCount}
          isPending={selection.isPending}
          error={selection.error}
          onToggleAll={selection.toggleAll}
          onDelete={() => selection.run(bulkDeleteLegalDocuments)}
          nounSingular="documento"
          nounPlural="documentos"
          dark
        />
      )}
    </div>
  );
}
