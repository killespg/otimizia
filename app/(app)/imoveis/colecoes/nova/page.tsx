import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { canManageRealEstate } from "@/lib/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, RealEstateProperty } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconPlus } from "../../../icons";
import { createShareCollection } from "../../actions";

export default async function NovaColecaoPage() {
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

  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
  ]);
  if (!canManageRealEstate(membership?.job_role, orgRole === "admin")) notFound();

  const [{ data: properties }, { data: contacts }] = await Promise.all([
    supabase
      .from("real_estate_properties")
      .select("id, title, property_type, price_cents")
      .eq("org_id", orgId)
      .eq("workspace_key", "real_estate_broker")
      .eq("status", "ativo")
      .order("created_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("id, name")
      .eq("org_id", orgId)
      .eq("workspace_key", "real_estate_broker")
      .order("name"),
  ]);
  const propertyList = (properties ?? []) as Pick<RealEstateProperty, "id" | "title" | "property_type" | "price_cents">[];
  const contactList = (contacts ?? []) as Pick<Contact, "id" | "name">[];

  return (
    <div className="max-w-2xl space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Vitrines</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          Nova vitrine
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          Escolha os imóveis, dê um título e gere um link para compartilhar com o cliente.
        </p>
      </header>

      <section className="panel p-5 sm:p-6">
        <form action={createShareCollection} className="space-y-4">
          <label className="block">
            <span className="label">
              Título da vitrine <span className="ml-1 text-brand-700">*</span>
            </span>
            <input name="title" required maxLength={180} placeholder="Ex.: Apartamentos para a Maria" className="field mt-1.5" />
          </label>

          <label className="block">
            <span className="label">Cliente (opcional)</span>
            <select name="client_contact_id" defaultValue="" className="field mt-1.5">
              <option value="">Sem vincular</option>
              {contactList.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="label">Imóveis ativos</span>
            {propertyList.length === 0 ? (
              <p className="mt-2 text-sm font-medium text-ink-muted">Nenhum imóvel ativo na carteira ainda.</p>
            ) : (
              <div className="mt-1.5 max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
                {propertyList.map((property) => (
                  <label key={property.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                    <input type="checkbox" name="property_ids" value={property.id} className="h-4 w-4" />
                    <span className="text-sm font-bold text-ink">{property.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <PendingButton className="btn" pendingLabel="Criando">
            <IconPlus className="h-4 w-4" />
            Criar vitrine
          </PendingButton>
        </form>
      </section>

      <Link href="/imoveis/colecoes" className="nav-item inline-block text-sm font-black text-brand-700 hover:underline">
        Voltar para vitrines
      </Link>
    </div>
  );
}
