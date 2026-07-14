import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PropertyReactionButtons } from "@/components/real-estate/PropertyReactionButtons";

// Fora do grupo (app): não cai em nenhum prefixo protegido de
// lib/supabase/middleware.ts, então é público por padrão — sem sessão, sem
// cookies, só a anon key. get_shared_property_collection() nunca seleciona
// created_by/assignee_id/ai_suggested_fields/extra_features/condo_fee_cents/
// iptu_cents/endereço exato — ausência estrutural na query, não filtro de
// app aqui na página.
export const dynamic = "force-dynamic";

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartamento: "Apartamento", casa: "Casa", cobertura: "Cobertura", terreno: "Terreno",
  comercial: "Comercial", sala: "Sala", galpao: "Galpão", rural: "Rural", outro: "Outro",
};
const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  venda: "Venda", aluguel: "Aluguel", venda_aluguel: "Venda ou aluguel",
};

type SharedProperty = {
  id: string;
  title: string;
  property_type: string;
  transaction_type: string;
  price_cents: number | null;
  rent_price_cents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  area_m2: number | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  description: string | null;
  photos: string[];
};

type SharedCollection = {
  title: string;
  token: string;
  properties: SharedProperty[];
};

function centsToReais(cents: number | null): string | null {
  if (cents === null) return null;
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default async function SharedPropertyCollectionPage({ params }: { params: { token: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) notFound();

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.rpc("get_shared_property_collection", { p_token: params.token });
  if (error || !data) notFound();
  const shared = data as SharedCollection;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
      <header className="panel p-5 sm:p-6">
        <p className="text-sm font-black text-brand-700">Seleção de imóveis</p>
        <h1 className="mt-2 text-[clamp(1.6rem,5vw,2.6rem)] font-black tracking-[-.04em] text-ink">{shared.title}</h1>
      </header>

      {shared.properties.length === 0 ? (
        <section className="panel p-6 text-center text-sm font-medium text-ink-muted">
          Nenhum imóvel nesta seleção no momento.
        </section>
      ) : (
        <div className="space-y-4">
          {shared.properties.map((property) => {
            const price = centsToReais(property.price_cents);
            const rent = centsToReais(property.rent_price_cents);
            return (
              <section key={property.id} className="panel overflow-hidden">
                {property.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto p-3">
                    {property.photos.map((path) => (
                      <img
                        key={path}
                        src={supabase.storage.from("property-photos").getPublicUrl(path).data.publicUrl}
                        alt=""
                        className="h-40 w-56 shrink-0 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
                <div className="border-t border-line p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tag bg-brand-50 text-brand-700">
                      {PROPERTY_TYPE_LABEL[property.property_type] ?? property.property_type}
                    </span>
                    <span className="tag bg-surface-2 text-ink-muted">
                      {TRANSACTION_TYPE_LABEL[property.transaction_type] ?? property.transaction_type}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-black text-ink">{property.title}</h2>
                  <p className="mt-1 text-sm font-bold text-ink-muted">
                    {[property.address_neighborhood, property.address_city, property.address_state].filter(Boolean).join(" · ") || "Localização sob consulta"}
                  </p>
                  <p className="mt-2 text-xl font-black text-ink">
                    {price ?? (rent ? `${rent}/mês` : "Sob consulta")}
                  </p>
                  <p className="mt-2 text-sm font-bold text-ink-muted">
                    {property.bedrooms ?? "-"} quartos · {property.bathrooms ?? "-"} banheiros · {property.parking_spots ?? "-"} vagas
                    {property.area_m2 ? ` · ${property.area_m2} m²` : ""}
                  </p>
                  {property.description && (
                    <p className="mt-3 text-sm font-medium leading-relaxed text-ink-soft">{property.description}</p>
                  )}
                  <div className="mt-4">
                    <PropertyReactionButtons token={shared.token} propertyId={property.id} />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs font-medium text-ink-muted">Seleção compartilhada por um corretor.</p>
    </div>
  );
}
