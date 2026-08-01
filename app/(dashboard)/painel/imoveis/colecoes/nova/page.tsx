import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import { PropertyPicker } from "@/components/real-estate/PropertyPicker";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import { canManageRealEstate } from "@/lib/real-estate/real-estate";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { Contact, Deal, RealEstateProperty } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconPlus } from "../../../icons";
import { createShareCollection } from "../../actions";

export default async function NovaColecaoPage(props: { searchParams: Promise<{ ids?: string }> }) {
  const searchParams = await props.searchParams;
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

  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
  ]);
  if (!canManageRealEstate(membership?.job_role, orgRole === "admin")) notFound();

  const [{ data: properties }, { data: contacts }, { data: deals }] = await Promise.all([
    supabase
      .from("real_estate_properties")
      .select("id, title, property_type, price_cents, rent_price_cents, address_neighborhood")
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
    supabase
      .from("deals")
      .select("id, title, contact_id")
      .eq("org_id", orgId)
      .eq("workspace_key", "real_estate_broker")
      .order("created_at", { ascending: false }),
  ]);
  const propertyList = (properties ?? []) as Pick<
    RealEstateProperty,
    "id" | "title" | "property_type" | "price_cents" | "rent_price_cents" | "address_neighborhood"
  >[];
  const contactList = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  const dealRows = (deals ?? []) as Pick<Deal, "id" | "title" | "contact_id">[];
  const contactNameById = new Map(contactList.map((c) => [c.id, c.name]));

  // Mesmo padrão da listagem: só a foto de capa (position 0) de cada
  // imóvel ativo, pra reconhecer visualmente ao montar a vitrine.
  const coverByPropertyId = new Map<string, string>();
  if (propertyList.length > 0) {
    const { data: coverRows } = await supabase
      .from("real_estate_property_media")
      .select("property_id, storage_path")
      .in("property_id", propertyList.map((p) => p.id))
      .eq("position", 0);
    for (const row of coverRows ?? []) {
      coverByPropertyId.set(
        row.property_id as string,
        supabase.storage.from("property-photos").getPublicUrl(row.storage_path as string).data.publicUrl
      );
    }
  }
  const pickerProperties = propertyList.map((property) => ({
    ...property,
    cover_url: coverByPropertyId.get(property.id),
  }));

  // Vem do atalho "Criar vitrine com selecionados" na listagem — nem todo
  // id necessariamente está Ativo, então parte pode não aparecer aqui.
  const requestedIds = (searchParams.ids ?? "").split(",").filter(Boolean);
  const availableIds = new Set(propertyList.map((p) => p.id));
  const droppedCount = requestedIds.filter((id) => !availableIds.has(id)).length;

  return (
    <div className="max-w-4xl space-y-6">
      <RealEstatePageHeader eyebrow="Imobiliário / Vitrines" title="Nova vitrine" description="Escolha os imóveis, dê um título e gere um link para compartilhar com o cliente." />

      <section className="panel p-5 sm:p-6">
        <form action={createShareCollection} className="space-y-4">
          <label className="block">
            <span className="label">
              Título da vitrine <span className="ml-1 text-brand-700">*</span>
            </span>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              Esse é o texto que o cliente vê ao abrir o link — não precisa ser o nome dele, pode ser algo como
              &ldquo;Apartamentos na Zona Sul&rdquo;.
            </p>
            <input name="title" required maxLength={180} placeholder="Ex.: Apartamentos para a Maria" className="field mt-1.5" />
          </label>

          <label className="block">
            <span className="label">Cliente (opcional)</span>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              Vincular a um contato ajuda você a lembrar quem recebeu essa seleção — o cliente não vê esse vínculo.
            </p>
            <select name="client_contact_id" defaultValue="" className="field mt-1.5">
              <option value="">Sem vincular</option>
              {contactList.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Atendimento (opcional)</span>
            <select name="deal_id" defaultValue="" className="field mt-1.5">
              <option value="">Sem vincular</option>
              {dealRows.map((deal) => {
                const contactName = deal.contact_id ? contactNameById.get(deal.contact_id) : null;
                return (
                  <option key={deal.id} value={deal.id}>
                    {contactName ? `${contactName} — ${deal.title}` : deal.title}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs font-medium text-ink-muted">
              Vincular a um atendimento registra os imóveis como &quot;enviados&quot; nele e atualiza a jornada quando o cliente abrir o link.
            </p>
          </label>

          <div>
            <span className="label">Imóveis ativos</span>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              Só aparecem aqui imóveis com status Ativo — se algum não aparecer, mude o status dele na própria página
              do imóvel. Marque os que quer incluir; dá para adicionar mais depois, na página de cada imóvel.
            </p>
            {droppedCount > 0 && (
              <p className="mt-2 rounded-md border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink-soft">
                {droppedCount} imóvel(is) selecionado(s) na listagem não aparecem aqui porque não estão com status
                Ativo.
              </p>
            )}
            {propertyList.length === 0 ? (
              <p className="mt-2 text-sm font-medium text-ink-muted">Nenhum imóvel ativo na carteira ainda.</p>
            ) : (
              <div className="mt-1.5">
                <PropertyPicker properties={pickerProperties} initialSelectedIds={requestedIds} />
              </div>
            )}
          </div>

          <PendingButton className="btn" pendingLabel="Criando">
            <IconPlus className="h-4 w-4" />
            Criar vitrine
          </PendingButton>
        </form>
      </section>

      <Link href="/painel/imoveis/colecoes" className="nav-item inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para vitrines
      </Link>
    </div>
  );
}

