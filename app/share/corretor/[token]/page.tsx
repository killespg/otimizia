import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

// Página pública do corretor (RE-7xx, Fase 7) — lista os imóveis ativos da
// organização. Mesmo cuidado de exposição do share/imoveis (0054): nunca
// seleciona created_by/assignee_id/ai_suggested_fields/extra_features/
// condo_fee_cents/iptu_cents/endereço exato — ausência estrutural na
// query, não filtro de app. Sem sessão (fora de (app)/middleware), usa
// admin client porque não há cookie de usuário nessa requisição.
export const dynamic = "force-dynamic";

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartamento: "Apartamento", casa: "Casa", cobertura: "Cobertura", terreno: "Terreno",
  comercial: "Comercial", sala: "Sala", galpao: "Galpão", rural: "Rural", outro: "Outro",
};

function centsToReais(cents: number | null): string {
  if (cents === null) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default async function PublicBrokerPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) notFound();
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, real_estate_public_page_enabled")
    .eq("real_estate_public_page_token", params.token)
    .maybeSingle();
  if (!org || !org.real_estate_public_page_enabled) notFound();

  const { data: properties } = await admin
    .from("real_estate_properties")
    .select("id, title, property_type, transaction_type, price_cents, rent_price_cents, bedrooms, bathrooms, parking_spots, area_m2, address_neighborhood, address_city, description")
    .eq("org_id", org.id)
    .eq("workspace_key", "real_estate_broker")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="border-b border-line pb-4">
        <h1 className="text-2xl font-black text-ink">{org.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">{(properties ?? []).length} imóveis disponíveis</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {(properties ?? []).map((property) => (
          <article key={property.id} className="rounded-lg border border-line p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type}</p>
            <h2 className="mt-1 text-lg font-black text-ink">{property.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{property.address_neighborhood ?? "Bairro não informado"}{property.address_city ? `, ${property.address_city}` : ""}</p>
            <p className="mt-2 text-base font-black text-ink">
              {property.transaction_type !== "aluguel" && centsToReais(property.price_cents)}
              {property.transaction_type === "venda_aluguel" && property.rent_price_cents !== null && ` · Aluguel: ${centsToReais(property.rent_price_cents)}`}
              {property.transaction_type === "aluguel" && centsToReais(property.rent_price_cents)}
            </p>
            <p className="mt-1 text-xs font-bold text-ink-muted">
              {[property.bedrooms && `${property.bedrooms} quartos`, property.bathrooms && `${property.bathrooms} banheiros`, property.parking_spots && `${property.parking_spots} vagas`, property.area_m2 && `${property.area_m2}m²`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {property.description && <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{property.description}</p>}
          </article>
        ))}
      </div>

      {(properties ?? []).length === 0 && <p className="text-sm text-ink-muted">Nenhum imóvel disponível no momento.</p>}
    </div>
  );
}
