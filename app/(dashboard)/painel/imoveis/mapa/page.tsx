import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyMap } from "@/components/real-estate/PropertyMap";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import { canViewRealEstate, isRealEstateV2Enabled } from "@/lib/real-estate/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

export default async function ImoveisMapaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user?.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") notFound();

  const [orgRole, { data: membership }, { data: org }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  if (!canViewRealEstate(membership?.job_role, orgRole === "admin") || !isRealEstateV2Enabled(org)) notFound();

  const { data: properties } = await supabase
    .from("real_estate_properties")
    .select(
      "id, title, latitude, longitude, price_cents, rent_price_cents, transaction_type, status, property_type, address_neighborhood, bedrooms, bathrooms, parking_spots, area_m2"
    )
    .eq("org_id", orgId)
    .eq("workspace_key", "real_estate_broker")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const list = properties ?? [];

  // Foto de capa (position 0) de cada imóvel do mapa — mesmo padrão da
  // listagem/vitrines (bucket público property-photos).
  const coverByPropertyId = new Map<string, string>();
  if (list.length > 0) {
    const { data: coverRows } = await supabase
      .from("real_estate_property_media")
      .select("property_id, storage_path")
      .in("property_id", list.map((p) => p.id as string))
      .eq("position", 0);
    for (const row of coverRows ?? []) {
      coverByPropertyId.set(
        row.property_id as string,
        supabase.storage.from("property-photos").getPublicUrl(row.storage_path as string).data.publicUrl
      );
    }
  }

  const money = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const STATUS_LABEL: Record<string, string> = {
    ativo: "Ativo", reservado: "Reservado", vendido: "Vendido", alugado: "Alugado", inativo: "Inativo", rascunho: "Rascunho",
  };
  const TYPE_LABEL: Record<string, string> = {
    apartamento: "Apartamento", casa: "Casa", cobertura: "Cobertura", sala: "Sala comercial",
    comercial: "Comercial", terreno: "Terreno", galpao: "Galpão", loja: "Loja",
  };

  const points = list.map((p) => {
    const isRent = p.transaction_type === "aluguel";
    const cents = isRent ? p.rent_price_cents ?? p.price_cents : p.price_cents ?? p.rent_price_cents;
    const facts = [
      p.bedrooms != null ? `${p.bedrooms} qts` : null,
      p.bathrooms != null ? `${p.bathrooms} banh.` : null,
      p.parking_spots != null ? `${p.parking_spots} vagas` : null,
      p.area_m2 != null ? `${p.area_m2} m²` : null,
    ].filter(Boolean).join(" · ");
    return {
      id: p.id as string,
      title: p.title as string,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      coverUrl: coverByPropertyId.get(p.id as string) ?? null,
      priceLabel: cents != null ? (isRent ? `${money(cents)}/mês` : money(cents)) : "Sob consulta",
      neighborhood: (p.address_neighborhood as string | null) ?? "Localização não informada",
      typeLabel: TYPE_LABEL[p.property_type as string] ?? "Imóvel",
      statusKey: (p.status as string) ?? "",
      statusLabel: STATUS_LABEL[p.status as string] ?? "",
      facts,
      href: `/imoveis/${p.id}`,
    };
  });

  return (
    <div className="max-w-[1400px] space-y-6">
      <RealEstatePageHeader eyebrow="Imobiliário / Mapa" description="Visualize a distribuição da carteira. Clique em um pin para ver o imóvel." />
      <section className="panel overflow-hidden">
        <PropertyMap properties={points} />
      </section>
      <Link href="/imoveis" className="nav-item inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}
