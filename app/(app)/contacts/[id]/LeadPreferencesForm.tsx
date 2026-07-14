import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { REAL_ESTATE_PROPERTY_TYPES } from "@/lib/real-estate";
import type { Deal, RealEstateLeadPreferences } from "@/lib/supabase/types";
import { saveLeadPreferences } from "../../imoveis/match-actions";

function centsToText(cents: number | null): string {
  return cents !== null ? String(cents / 100) : "";
}

// Um formulário por atendimento (deal) — RE-1xx: "uma preferência por
// atendimento, não só por contato". Cada deal do cliente no workspace
// imobiliário aparece como um cartão próprio.
export function LeadPreferencesForm({
  deal,
  contactId,
  preferences,
}: {
  deal: Pick<Deal, "id" | "title" | "stage">;
  contactId: string;
  preferences: RealEstateLeadPreferences | null;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-ink">{deal.title}</p>
        <Link href={`/imoveis/match/${deal.id}`} className="nav-item text-xs font-black text-brand-700 hover:underline">
          Encontrar imóveis compatíveis →
        </Link>
      </div>
      <form action={saveLeadPreferences} className="grid gap-2.5 sm:grid-cols-2">
        <input type="hidden" name="deal_id" value={deal.id} />
        <input type="hidden" name="contact_id" value={contactId} />

        <label className="block sm:col-span-2">
          <span className="label">Transação</span>
          <select name="transaction_type" defaultValue={preferences?.transaction_type ?? ""} className="field mt-1">
            <option value="">Não informado</option>
            <option value="venda">Venda</option>
            <option value="aluguel">Aluguel</option>
            <option value="venda_aluguel">Venda ou aluguel</option>
          </select>
        </label>

        <fieldset className="sm:col-span-2">
          <legend className="label">Tipos de imóvel aceitos</legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
            {REAL_ESTATE_PROPERTY_TYPES.map((type) => (
              <label key={type.value} className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                <input
                  type="checkbox"
                  name="property_types"
                  value={type.value}
                  defaultChecked={preferences?.property_types.includes(type.value) ?? false}
                  className="h-4 w-4"
                />
                {type.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="label">Preço mínimo (R$)</span>
          <input name="min_price" defaultValue={centsToText(preferences?.min_price_cents ?? null)} className="field mt-1" />
        </label>
        <label className="block">
          <span className="label">Preço máximo (R$)</span>
          <input name="max_price" defaultValue={centsToText(preferences?.max_price_cents ?? null)} className="field mt-1" />
        </label>

        <label className="block">
          <span className="label">Bairros de interesse (separados por vírgula)</span>
          <input name="neighborhoods" defaultValue={preferences?.neighborhoods.join(", ") ?? ""} className="field mt-1" />
        </label>
        <label className="block">
          <span className="label">Cidades de interesse (separadas por vírgula)</span>
          <input name="cities" defaultValue={preferences?.cities.join(", ") ?? ""} className="field mt-1" />
        </label>

        <label className="block">
          <span className="label">Mínimo de quartos</span>
          <input name="min_bedrooms" defaultValue={preferences?.min_bedrooms ?? ""} className="field mt-1" />
        </label>
        <label className="block">
          <span className="label">Mínimo de vagas</span>
          <input name="min_parking_spots" defaultValue={preferences?.min_parking_spots ?? ""} className="field mt-1" />
        </label>
        <label className="block">
          <span className="label">Área mínima (m²)</span>
          <input name="min_area_m2" defaultValue={preferences?.min_area_m2 ?? ""} className="field mt-1" />
        </label>
        <label className="block">
          <span className="label">Mudança prevista para</span>
          <input type="date" name="move_deadline" defaultValue={preferences?.move_deadline ?? ""} className="field mt-1" />
        </label>

        <label className="block sm:col-span-2">
          <span className="label">Características obrigatórias (ex.: piscina=sim, vaga coberta=sim)</span>
          <input
            name="required_features"
            defaultValue={Object.entries(preferences?.required_features ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")}
            className="field mt-1"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Características desejadas (não eliminatórias)</span>
          <input
            name="desired_features"
            defaultValue={Object.entries(preferences?.desired_features ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")}
            className="field mt-1"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-ink-soft sm:col-span-2">
          <input type="checkbox" name="financing_needed" defaultChecked={preferences?.financing_needed ?? false} className="h-4 w-4" />
          Precisa de financiamento
        </label>

        <label className="block sm:col-span-2">
          <span className="label">Observações</span>
          <textarea name="notes" defaultValue={preferences?.notes ?? ""} rows={2} className="field mt-1 min-h-[64px] resize-y" />
        </label>

        <div className="sm:col-span-2">
          <PendingButton className="btn-soft" pendingLabel="Salvando">
            Salvar preferências
          </PendingButton>
        </div>
      </form>
    </div>
  );
}
