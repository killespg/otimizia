import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyMap } from "@/components/real-estate/PropertyMap";
import { canViewRealEstate, isRealEstateV2Enabled } from "@/lib/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspaces";

export default async function ImoveisMapaPage() {
  const supabase = createClient();
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
    .select("id, title, latitude, longitude")
    .eq("org_id", orgId)
    .eq("workspace_key", "real_estate_broker")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const points = (properties ?? []).map((p) => ({ id: p.id as string, title: p.title as string, latitude: p.latitude as number, longitude: p.longitude as number }));

  return (
    <div className="max-w-4xl space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Carteira</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">Mapa de imóveis</h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          Só imóveis com latitude/longitude preenchidas aparecem aqui (edite o imóvel pra adicionar coordenadas).
        </p>
      </header>
      <section className="panel overflow-hidden">
        <PropertyMap properties={points} />
      </section>
      <Link href="/imoveis" className="nav-item inline-block text-sm font-black text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}
