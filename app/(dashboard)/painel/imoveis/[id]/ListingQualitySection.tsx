import { PendingButton } from "@/components/ui/PendingButton";
import type { RealEstateProperty, RealEstatePropertyDocument } from "@/lib/supabase/types";
import { IconPlus, IconTrash } from "../../icons";
import { addDocumentChecklistItem, recalculateListingQuality, removeDocumentChecklistItem, updateDocumentChecklistStatus } from "../quality-actions";

const DOCUMENT_STATUS_LABEL: Record<string, string> = { pending: "Pendente", received: "Recebido", waived: "Dispensado" };

function scoreColor(score: number | null): string {
  if (score === null) return "bg-surface-2 text-ink-muted";
  if (score >= 80) return "bg-success-50 text-success-700";
  if (score >= 50) return "bg-warning-50 text-warning-700";
  return "bg-danger-50 text-danger-700";
}

// RE-5xx (Fase 5): exclusividade/validade de contrato já existem desde a
// Fase 0 (0056) — só faltava exibir. Score/checklist são a parte nova.
export function ListingQualitySection({
  property,
  documents,
  canManage,
}: {
  property: RealEstateProperty;
  documents: RealEstatePropertyDocument[];
  canManage: boolean;
}) {
  return (
    <section className="panel space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Qualidade do anúncio</h2>
          <p className="mt-1 text-xs font-medium text-ink-muted">Score calculado a partir de fotos, descrição, preço, endereço e detalhes preenchidos.</p>
        </div>
        <span className={"rounded px-3 py-1.5 text-sm font-semibold " + scoreColor(property.listing_quality_score)}>
          {property.listing_quality_score ?? "—"}/100
        </span>
      </div>
      {canManage && (
        <form action={recalculateListingQuality}>
          <input type="hidden" name="property_id" value={property.id} />
          <PendingButton className="btn-secondary" pendingLabel="Calculando">
            Recalcular qualidade
          </PendingButton>
        </form>
      )}

      <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-ink-muted">Exclusividade</p>
          <p className="mt-0.5 text-sm font-bold text-ink">
            {property.exclusive_listing
              ? `Exclusivo${property.exclusive_until ? ` até ${new Date(property.exclusive_until).toLocaleDateString("pt-BR")}` : ""}`
              : "Não exclusivo"}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-ink-muted">Matrícula</p>
          <p className="mt-0.5 text-sm font-bold text-ink">{property.registration_number ?? "Não informada"}</p>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="text-sm font-semibold text-ink">Checklist documental</h3>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm font-medium text-ink-muted">Nenhum item no checklist ainda.</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-2 py-3">
                <span className="text-sm font-bold text-ink">{doc.document_type}</span>
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <form action={updateDocumentChecklistStatus} className="flex items-center gap-1.5">
                      <input type="hidden" name="document_id" value={doc.id} />
                      <input type="hidden" name="property_id" value={property.id} />
                      <select name="status" defaultValue={doc.status} className="field h-8 py-0 text-xs">
                        <option value="pending">Pendente</option>
                        <option value="received">Recebido</option>
                        <option value="waived">Dispensado</option>
                      </select>
                      <button type="submit" className="press-sm rounded-md border border-line bg-surface px-2 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2">
                        Salvar
                      </button>
                    </form>
                  ) : (
                    <span className="tag bg-surface-2 text-ink-muted">{DOCUMENT_STATUS_LABEL[doc.status]}</span>
                  )}
                  {canManage && (
                    <form action={removeDocumentChecklistItem}>
                      <input type="hidden" name="document_id" value={doc.id} />
                      <input type="hidden" name="property_id" value={property.id} />
                      <button type="submit" aria-label="Remover item" className="nav-item text-danger-600 hover:text-danger-700">
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <form action={addDocumentChecklistItem} className="mt-3 flex gap-2">
            <input type="hidden" name="property_id" value={property.id} />
            <input name="document_type" required placeholder="Ex.: Matrícula atualizada" className="field flex-1" />
            <PendingButton className="btn-secondary shrink-0" pendingLabel="Adicionando">
              <IconPlus className="h-4 w-4" />
              Adicionar
            </PendingButton>
          </form>
        )}
      </div>
    </section>
  );
}
