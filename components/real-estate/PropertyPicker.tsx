"use client";

import { useMemo, useState } from "react";
import { centsToReais, propertyTypeLabel } from "@/lib/real-estate/real-estate";
import type { RealEstateProperty } from "@/lib/supabase/types";

type PickerProperty = Pick<RealEstateProperty, "id" | "title" | "property_type" | "price_cents" | "rent_price_cents"> & {
  address_neighborhood?: string | null;
  cover_url?: string;
};

function priceLabel(property: PickerProperty): string {
  if (property.price_cents !== null) return centsToReais(property.price_cents);
  if (property.rent_price_cents !== null) return `${centsToReais(property.rent_price_cents)}/mês`;
  return "Sob consulta";
}

export function PropertyPicker({
  properties,
  initialSelectedIds = [],
}: {
  properties: PickerProperty[];
  initialSelectedIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.address_neighborhood ?? "").toLowerCase().includes(q)
    );
  }, [properties, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filtered) next.add(p.id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por título ou bairro"
          className="field flex-1"
        />
        <button type="button" onClick={selectAllFiltered} className="btn-secondary shrink-0 whitespace-nowrap text-xs">
          Selecionar todos ({filtered.length})
        </button>
      </div>
      <p className="mt-2 text-xs font-bold text-ink-muted">{selected.size} imóvel(is) selecionado(s)</p>
      {filtered.length === 0 ? (
        <p className="mt-1.5 rounded-md border border-line px-3 py-6 text-center text-sm font-medium text-ink-muted">
          Nenhum imóvel ativo encontrado.
        </p>
      ) : (
        <div className="mt-1.5 max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {filtered.map((property) => (
            <label key={property.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
              <input
                type="checkbox"
                name="property_ids"
                value={property.id}
                checked={selected.has(property.id)}
                onChange={() => toggle(property.id)}
                className="h-4 w-4 shrink-0"
              />
              {property.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnail vem de storage público
                <img src={property.cover_url} alt={`Foto de capa de ${property.title}`} className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-ink-muted/60">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="none">
                    <rect x="5" y="3.5" width="10" height="17" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M15 9.5h4.5v11H15" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{property.title}</span>
                <span className="block text-xs font-semibold text-ink-muted">
                  {propertyTypeLabel(property.property_type)} · {priceLabel(property)}
                  {property.address_neighborhood ? ` · ${property.address_neighborhood}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
