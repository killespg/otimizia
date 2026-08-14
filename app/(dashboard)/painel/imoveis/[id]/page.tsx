import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/ui/PendingButton";
import { PropertyAddressFields } from "@/components/real-estate/PropertyAddressFields";
import { Field, FormSection, Select, TransactionAndPriceFields } from "@/components/real-estate/PropertyForm";
import { PropertyPhotoManager } from "@/components/real-estate/PropertyPhotoManager";
import { PropertyPhotoUploader } from "@/components/real-estate/PropertyPhotoUploader";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import {
  canManageRealEstate,
  canViewRealEstate,
  centsToReais,
  isRealEstateV2Enabled,
  propertyStatusLabel,
  propertyStatusTagClass,
  propertyTypeLabel,
  REAL_ESTATE_PROPERTY_STATUSES,
  REAL_ESTATE_PROPERTY_TYPES,
  transactionTypeLabel,
} from "@/lib/real-estate/real-estate";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type {
  AiSuggestedField,
  Contact,
  RealEstateProperty,
  RealEstatePropertyDocument,
  RealEstatePropertyMedia,
} from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { IconCheck, IconPlus, IconTrash, IconX } from "../../icons";
import {
  addPropertyToCollection,
  confirmPropertyAiField,
  deleteProperty,
  discardPropertyAiField,
  updateProperty,
} from "../actions";
import { ListingQualitySection } from "./ListingQualitySection";

const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  property_type: "Tipo",
  transaction_type: "Transação",
  status: "Status",
  price_cents: "Preço de venda",
  rent_price_cents: "Preço de aluguel",
  condo_fee_cents: "Condomínio",
  iptu_cents: "IPTU",
  bedrooms: "Quartos",
  bathrooms: "Banheiros",
  parking_spots: "Vagas",
  area_m2: "Área (m²)",
  description: "Descrição",
  address_street: "Rua",
  address_number: "Número",
  address_neighborhood: "Bairro",
  address_city: "Cidade",
  address_state: "UF",
  address_zip: "CEP",
};

export default async function ImovelDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin)) notFound();
  const canManage = canManageRealEstate(membership?.job_role, isAdmin);

  const [{ data: propertyRow }, { data: mediaRows }, { data: collectionRows }, { data: contactRows }, members, { data: org }] =
    await Promise.all([
      supabase.from("real_estate_properties").select("*").eq("id", params.id).eq("org_id", orgId).maybeSingle(),
      supabase
        .from("real_estate_property_media")
        .select("*")
        .eq("property_id", params.id)
        .order("position", { ascending: true }),
      supabase
        .from("real_estate_share_collections")
        .select("id, title")
        .eq("org_id", orgId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("contacts")
        .select("id, name")
        .eq("org_id", orgId)
        .eq("workspace_key", "real_estate_broker")
        .order("name"),
      getOrgMembers(supabase, orgId),
      supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
    ]);
  if (!propertyRow) notFound();
  const property = propertyRow as RealEstateProperty;
  const media = (mediaRows ?? []) as RealEstatePropertyMedia[];
  const collections = collectionRows ?? [];
  const contactList = (contactRows ?? []) as Pick<Contact, "id" | "name">[];
  const memberNames = new Map(members.map((m) => [m.user_id, m.name ?? "Sem nome"]));
  const ownerContact = property.owner_contact_id ? contactList.find((c) => c.id === property.owner_contact_id) : null;
  // RE-004: rollout progressivo por organização, mesmo flag de novo/page.tsx.
  const v2Enabled = isRealEstateV2Enabled(org);

  const { data: documentRows } = v2Enabled
    ? await supabase.from("real_estate_property_documents").select("*").eq("org_id", orgId).eq("property_id", params.id).order("created_at", { ascending: true })
    : { data: [] };
  const documents = (documentRows ?? []) as RealEstatePropertyDocument[];

  const photoUrls = media.map((item) => ({
    id: item.id,
    url: supabase.storage.from("property-photos").getPublicUrl(item.storage_path).data.publicUrl,
  }));

  const suggestions = Object.entries(property.ai_suggested_fields ?? {}) as [string, AiSuggestedField][];

  const priceLine = (() => {
    const sale = property.price_cents !== null ? centsToReais(property.price_cents) : null;
    const rent = property.rent_price_cents !== null ? `${centsToReais(property.rent_price_cents)}/mês` : null;
    if (sale && rent) return `${sale} · ${rent}`;
    return sale ?? rent ?? "Sob consulta";
  })();
  const addressLine =
    [property.address_neighborhood, property.address_city, property.address_state].filter(Boolean).join(" · ") ||
    "Endereço não informado";

  return (
    <div className="max-w-6xl space-y-6">
      <RealEstatePageHeader eyebrow="Imobiliário / Carteira" title={property.title} action={canManage ? (
          <form action={deleteProperty}>
            <input type="hidden" name="id" value={property.id} />
            <PendingButton
              className="press-sm rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-bold text-danger-600 hover:bg-danger-50"
              pendingLabel="Excluindo"
            >
              <IconTrash className="h-4 w-4" />
              Excluir
            </PendingButton>
          </form>
        ) : null} />
      <section className="real-estate-flat-section py-5 sm:py-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={"tag " + propertyStatusTagClass(property.status)}>{propertyStatusLabel(property.status)}</span>
          <span className="tag">{propertyTypeLabel(property.property_type)}</span>
          <span className="tag">{transactionTypeLabel(property.transaction_type)}</span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{priceLine}</p>
        <p className="mt-1 text-sm font-bold text-ink-muted">{addressLine}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-bold text-ink-soft">
          <span>{property.bedrooms ?? "-"} quartos</span>
          <span>{property.bathrooms ?? "-"} banheiros</span>
          <span>{property.parking_spots ?? "-"} vagas</span>
          {property.area_m2 !== null && <span>{property.area_m2} m²</span>}
        </div>
        {property.description && (
          <p className="mt-4 text-sm font-medium leading-relaxed text-ink-soft">{property.description}</p>
        )}
        {v2Enabled && (
          <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <Info
              label="Proprietário"
              value={
                ownerContact ? (
                  <Link href={`/painel/contatos/${ownerContact.id}`} className="nav-item text-brand-700 hover:underline">
                    {ownerContact.name}
                  </Link>
                ) : (
                  "Não informado"
                )
              }
            />
            <Info label="Captado por" value={property.captured_by ? memberNames.get(property.captured_by) ?? "Sem nome" : "Não informado"} />
            <Info label="Origem da captação" value={property.capture_source ?? "Não informada"} />
          </dl>
        )}
      </section>
      {v2Enabled && <ListingQualitySection property={property} documents={documents} canManage={canManage} />}
      {suggestions.length > 0 && (
        <section className="space-y-2 border-y border-od-accent/20 bg-od-accent/[0.025] py-5">
          <div>
            <h2 className="text-sm font-semibold text-brand-700">IA sugere — confirme antes de publicar</h2>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              A IA leu o que você mandou (foto, áudio ou texto) e sugeriu estes valores. Nada muda no imóvel até você
              confirmar ou descartar cada sugestão.
            </p>
          </div>
          <div className="space-y-2">
            {suggestions.map(([field, suggestion]) => (
              <div key={field} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] py-3 first:border-t-0">
                <p className="text-sm font-bold text-ink">
                  {FIELD_LABELS[field] ?? field}: <span className="text-ink-soft">{suggestion.value}</span>
                </p>
                <div className="flex gap-2">
                  <form action={confirmPropertyAiField}>
                    <input type="hidden" name="property_id" value={property.id} />
                    <input type="hidden" name="field" value={field} />
                    <PendingButton className="press-sm rounded-md bg-brand-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-800" pendingLabel="...">
                      <IconCheck className="h-3.5 w-3.5" />
                      Confirmar
                    </PendingButton>
                  </form>
                  <form action={discardPropertyAiField}>
                    <input type="hidden" name="property_id" value={property.id} />
                    <input type="hidden" name="field" value={field} />
                    <PendingButton className="press-sm rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2" pendingLabel="...">
                      <IconX className="h-3.5 w-3.5" />
                      Descartar
                    </PendingButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="real-estate-flat-section overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Fotos</h2>
          <p className="mt-0.5 text-xs font-medium text-ink-muted">
            A ordem aqui é a ordem que o cliente vê na vitrine. JPG, PNG, WEBP ou GIF, até 6 MB cada.
          </p>
        </div>
        {photoUrls.length === 0 ? (
          <p className="p-5 text-center text-sm font-medium text-ink-muted">
            Nenhuma foto ainda — a vitrine fica bem mais atraente com pelo menos uma.
          </p>
        ) : canManage ? (
          <PropertyPhotoManager propertyId={property.id} propertyTitle={property.title} photos={photoUrls} />
        ) : (
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            {photoUrls.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element -- vem de storage público, sem next/image configurado
              (<img key={photo.id} src={photo.url} alt={`Foto de ${property.title}`} className="aspect-square w-full rounded-md border border-line object-cover" />)
            ))}
          </div>
        )}
        {canManage && <PropertyPhotoUploader propertyId={property.id} />}
      </section>
      {canManage && (
        <details className="collapsible-details real-estate-flat-section overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-surface-2">
            <span>
              <span className="block text-base font-semibold text-ink">Editar dados do imóvel</span>
              <span className="block text-xs font-medium text-ink-muted">
                Mesmos campos do cadastro, já preenchidos — altere só o que mudou.
              </span>
            </span>
            <svg viewBox="0 0 24 24" className="filter-chevron h-4 w-4 shrink-0 text-ink-muted" aria-hidden>
              <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <form action={updateProperty} className="divide-y divide-line p-5 sm:p-6">
            <input type="hidden" name="id" value={property.id} />

            <FormSection
              title="Sobre o imóvel"
              description="O título é a primeira coisa que o cliente vê na vitrine e na listagem. Status controla se o imóvel aparece como ativo, reservado, vendido, etc."
              className="pb-5"
            >
              <Field name="title" label="Título" defaultValue={property.title} required className="md:col-span-2" />
              <Select name="property_type" label="Tipo de imóvel" defaultValue={property.property_type} options={REAL_ESTATE_PROPERTY_TYPES} />
              <Select
                name="status"
                label="Status"
                defaultValue={property.status}
                options={REAL_ESTATE_PROPERTY_STATUSES}
                hint="Só imóveis Ativos entram na lista de escolha ao criar uma vitrine nova. Um imóvel já numa vitrine existente continua visível pro cliente mesmo se o status mudar depois."
              />
            </FormSection>

            <FormSection
              title="Transação e preço"
              description="Clique em Venda, Aluguel ou Ambos — só o(s) campo(s) de preço correspondente(s) aparece(m) abaixo."
              className="py-5"
            >
              <TransactionAndPriceFields
                defaultTransactionType={property.transaction_type}
                defaultPrice={property.price_cents !== null ? String(property.price_cents / 100) : ""}
                defaultRentPrice={property.rent_price_cents !== null ? String(property.rent_price_cents / 100) : ""}
                defaultCondoFee={property.condo_fee_cents !== null ? String(property.condo_fee_cents / 100) : ""}
                defaultIptu={property.iptu_cents !== null ? String(property.iptu_cents / 100) : ""}
              />
            </FormSection>

            <FormSection
              title="Características"
              description="Quartos, banheiros, vagas e área aparecem na listagem e na vitrine, ajudando o cliente a comparar imóveis."
              className="py-5"
            >
              <Field name="bedrooms" label="Quartos" defaultValue={property.bedrooms ?? ""} />
              <Field name="bathrooms" label="Banheiros" defaultValue={property.bathrooms ?? ""} />
              <Field name="parking_spots" label="Vagas" defaultValue={property.parking_spots ?? ""} />
              <Field name="area_m2" label="Área (m²)" defaultValue={property.area_m2 ?? ""} />
            </FormSection>

            <FormSection
              title="Endereço"
              description={
                v2Enabled
                  ? "Digite o CEP e o resto se preenche sozinho. Bairro e cidade aparecem na vitrine pública; rua e número ficam só na sua carteira."
                  : "Bairro e cidade aparecem na vitrine pública; rua e número ficam só na sua carteira — o cliente nunca vê o endereço exato."
              }
              className="py-5"
            >
              {v2Enabled ? (
                <PropertyAddressFields
                  defaultValues={{
                    address_zip: property.address_zip ?? "",
                    address_street: property.address_street ?? "",
                    address_number: property.address_number ?? "",
                    address_neighborhood: property.address_neighborhood ?? "",
                    address_city: property.address_city ?? "",
                    address_state: property.address_state ?? "",
                    latitude: property.latitude !== null ? String(property.latitude) : "",
                    longitude: property.longitude !== null ? String(property.longitude) : "",
                  }}
                />
              ) : (
                <>
                  <Field name="address_street" label="Rua" defaultValue={property.address_street ?? ""} className="md:col-span-2" />
                  <Field name="address_number" label="Número" defaultValue={property.address_number ?? ""} />
                  <Field name="address_neighborhood" label="Bairro" defaultValue={property.address_neighborhood ?? ""} />
                  <Field name="address_city" label="Cidade" defaultValue={property.address_city ?? ""} />
                  <Field name="address_state" label="UF" defaultValue={property.address_state ?? ""} />
                  <Field
                    name="address_zip"
                    label="CEP"
                    defaultValue={property.address_zip ?? ""}
                    placeholder="Ex.: 01310-000"
                    hint="Opcional — ajuda a localizar o imóvel, mas não aparece na vitrine."
                  />
                </>
              )}
            </FormSection>

            {v2Enabled && (
              <FormSection
                title="Captação"
                description="Ajuda a lembrar de onde veio o imóvel e quem é o dono — não aparece na vitrine pro cliente."
                className="py-5"
              >
                <label className="block">
                  <span className="label">Proprietário (opcional)</span>
                  <select name="owner_contact_id" defaultValue={property.owner_contact_id ?? ""} className="field mt-1.5">
                    <option value="">Sem vincular</option>
                    {contactList.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field name="capture_source" label="Origem da captação" defaultValue={property.capture_source ?? ""} />
              </FormSection>
            )}

            <FormSection
              title="Descrição"
              description="Esse texto some junto com as fotos quando você compartilhar o imóvel em uma vitrine."
              className="pt-5"
            >
              <label className="block md:col-span-2">
                <span className="label">Texto para a vitrine</span>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={property.description ?? ""}
                  maxLength={2000}
                  rows={4}
                  className="field mt-1.5 min-h-24 resize-y"
                />
              </label>
            </FormSection>

            <div className="pt-5">
              <PendingButton className="btn" pendingLabel="Salvando">
                Salvar alterações
              </PendingButton>
            </div>
          </form>
        </details>
      )}
      {canManage && collections.length > 0 && (
        <section className="real-estate-flat-section space-y-3 py-5 sm:py-6">
          <div>
            <h2 className="text-base font-semibold text-ink">Adicionar a uma vitrine</h2>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              Escolha uma vitrine já criada para incluir este imóvel nela — o link não muda, o cliente só vê o imóvel
              novo aparecer.
            </p>
          </div>
          <form action={addPropertyToCollection} className="flex flex-wrap gap-2">
            <input type="hidden" name="property_id" value={property.id} />
            <select name="collection_id" required className="field flex-1">
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                </option>
              ))}
            </select>
            <PendingButton className="btn-secondary shrink-0" pendingLabel="Adicionando">
              <IconPlus className="h-4 w-4" />
              Adicionar
            </PendingButton>
          </form>
        </section>
      )}
      <Link href="/painel/imoveis" className="nav-item inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}
