import Link from "next/link";
import { notFound } from "next/navigation";
import { PendingButton } from "@/components/PendingButton";
import { PropertyAddressFields } from "@/components/real-estate/PropertyAddressFields";
import {
  canManageRealEstate,
  canViewRealEstate,
  isRealEstateV2Enabled,
  REAL_ESTATE_PROPERTY_STATUSES,
  REAL_ESTATE_PROPERTY_TYPES,
} from "@/lib/real-estate";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type {
  AiSuggestedField,
  Contact,
  RealEstateProperty,
  RealEstatePropertyDocument,
  RealEstatePropertyMedia,
} from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";
import { IconCheck, IconPlus, IconTrash, IconX } from "../../icons";
import {
  addPropertyToCollection,
  confirmPropertyAiField,
  deleteProperty,
  deletePropertyMedia,
  discardPropertyAiField,
  movePropertyMedia,
  updateProperty,
  uploadPropertyPhoto,
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

export default async function ImovelDetailPage({ params }: { params: { id: string } }) {
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

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black text-brand-700">Carteira</p>
          <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.4rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
            {property.title}
          </h1>
        </div>
        {canManage && (
          <form action={deleteProperty}>
            <input type="hidden" name="id" value={property.id} />
            <PendingButton
              className="press-sm rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-danger-600 hover:bg-danger-50"
              pendingLabel="Excluindo"
            >
              <IconTrash className="h-4 w-4" />
              Excluir
            </PendingButton>
          </form>
        )}
      </header>

      {v2Enabled && (
        <section className="panel p-5 sm:p-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Info
              label="Proprietário"
              value={
                ownerContact ? (
                  <Link href={`/contacts/${ownerContact.id}`} className="nav-item text-brand-700 hover:underline">
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
        </section>
      )}

      {v2Enabled && <ListingQualitySection property={property} documents={documents} canManage={canManage} />}

      {suggestions.length > 0 && (
        <section className="panel space-y-2 border-brand-200 bg-brand-50/40 p-5">
          <h2 className="text-sm font-black text-brand-700">IA sugere — confirme antes de publicar</h2>
          <div className="space-y-2">
            {suggestions.map(([field, suggestion]) => (
              <div key={field} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2">
                <p className="text-sm font-bold text-ink">
                  {FIELD_LABELS[field] ?? field}: <span className="text-ink-soft">{suggestion.value}</span>
                </p>
                <div className="flex gap-2">
                  <form action={confirmPropertyAiField}>
                    <input type="hidden" name="property_id" value={property.id} />
                    <input type="hidden" name="field" value={field} />
                    <PendingButton className="press-sm rounded-md bg-brand-700 px-2.5 py-1 text-xs font-black text-white hover:bg-brand-800" pendingLabel="...">
                      <IconCheck className="h-3.5 w-3.5" />
                      Confirmar
                    </PendingButton>
                  </form>
                  <form action={discardPropertyAiField}>
                    <input type="hidden" name="property_id" value={property.id} />
                    <input type="hidden" name="field" value={field} />
                    <PendingButton className="press-sm rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2" pendingLabel="...">
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

      <section className="panel overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-base font-black text-ink">Fotos</h2>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          {photoUrls.map((photo, index) => (
            <div key={photo.id} className="relative overflow-hidden rounded-lg border border-line">
              <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
              {canManage && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 p-1.5">
                  <form action={movePropertyMedia}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="property_id" value={property.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      aria-label={`Mover foto ${index + 1} para trás`}
                      className="rounded px-1.5 py-0.5 text-xs font-black text-white disabled:opacity-30"
                    >
                      ◀
                    </button>
                  </form>
                  <form action={deletePropertyMedia}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="property_id" value={property.id} />
                    <button type="submit" aria-label={`Excluir foto ${index + 1}`} className="rounded px-1.5 py-0.5 text-xs font-black text-white">
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </form>
                  <form action={movePropertyMedia}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="property_id" value={property.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === photoUrls.length - 1}
                      aria-label={`Mover foto ${index + 1} para frente`}
                      className="rounded px-1.5 py-0.5 text-xs font-black text-white disabled:opacity-30"
                    >
                      ▶
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
        {canManage && (
          <form action={uploadPropertyPhoto} encType="multipart/form-data" className="flex flex-wrap items-center gap-2 border-t border-line p-5">
            <input type="hidden" name="property_id" value={property.id} />
            <input type="file" name="photo" accept="image/*" required className="field flex-1" />
            <PendingButton className="btn-soft" pendingLabel="Enviando">
              Adicionar foto
            </PendingButton>
          </form>
        )}
      </section>

      {canManage && (
        <section className="panel p-5 sm:p-6">
          <h2 className="mb-4 text-base font-black text-ink">Editar dados</h2>
          <form action={updateProperty} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={property.id} />
            <Field name="title" label="Título" defaultValue={property.title} required className="md:col-span-2" />
            <Select name="property_type" label="Tipo de imóvel" defaultValue={property.property_type} options={REAL_ESTATE_PROPERTY_TYPES} />
            <Select
              name="transaction_type"
              label="Transação"
              defaultValue={property.transaction_type}
              options={[
                { value: "venda", label: "Venda" },
                { value: "aluguel", label: "Aluguel" },
                { value: "venda_aluguel", label: "Venda ou aluguel" },
              ]}
            />
            <Select name="status" label="Status" defaultValue={property.status} options={REAL_ESTATE_PROPERTY_STATUSES} />
            <Field name="price" label="Preço de venda (R$)" defaultValue={property.price_cents !== null ? String(property.price_cents / 100) : ""} />
            <Field name="rent_price" label="Preço de aluguel (R$)" defaultValue={property.rent_price_cents !== null ? String(property.rent_price_cents / 100) : ""} />
            <Field name="condo_fee" label="Condomínio (R$)" defaultValue={property.condo_fee_cents !== null ? String(property.condo_fee_cents / 100) : ""} />
            <Field name="iptu" label="IPTU (R$)" defaultValue={property.iptu_cents !== null ? String(property.iptu_cents / 100) : ""} />
            <Field name="bedrooms" label="Quartos" defaultValue={property.bedrooms ?? ""} />
            <Field name="bathrooms" label="Banheiros" defaultValue={property.bathrooms ?? ""} />
            <Field name="parking_spots" label="Vagas" defaultValue={property.parking_spots ?? ""} />
            <Field name="area_m2" label="Área (m²)" defaultValue={property.area_m2 ?? ""} />
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
                <Field name="address_street" label="Rua" defaultValue={property.address_street ?? ""} />
                <Field name="address_number" label="Número" defaultValue={property.address_number ?? ""} />
                <Field name="address_neighborhood" label="Bairro" defaultValue={property.address_neighborhood ?? ""} />
                <Field name="address_city" label="Cidade" defaultValue={property.address_city ?? ""} />
                <Field name="address_state" label="UF" defaultValue={property.address_state ?? ""} />
                <Field name="address_zip" label="CEP" defaultValue={property.address_zip ?? ""} />
              </>
            )}
            {v2Enabled && (
              <>
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
              </>
            )}
            <div className="md:col-span-2">
              <label className="label" htmlFor="description">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={property.description ?? ""}
                maxLength={2000}
                rows={4}
                className="field mt-1.5 min-h-24 resize-y"
              />
            </div>
            <div className="md:col-span-2">
              <PendingButton className="btn" pendingLabel="Salvando">
                Salvar alterações
              </PendingButton>
            </div>
          </form>
        </section>
      )}

      {canManage && collections.length > 0 && (
        <section className="panel space-y-3 p-5 sm:p-6">
          <h2 className="text-base font-black text-ink">Adicionar a uma vitrine</h2>
          <form action={addPropertyToCollection} className="flex flex-wrap gap-2">
            <input type="hidden" name="property_id" value={property.id} />
            <select name="collection_id" required className="field flex-1">
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title}
                </option>
              ))}
            </select>
            <PendingButton className="btn-soft shrink-0" pendingLabel="Adicionando">
              <IconPlus className="h-4 w-4" />
              Adicionar
            </PendingButton>
          </form>
        </section>
      )}

      <Link href="/imoveis" className="nav-item inline-block text-sm font-black text-brand-700 hover:underline">
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

function Field({
  name,
  label,
  defaultValue,
  required = false,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="label">{label}</span>
      <input name={name} defaultValue={defaultValue} required={required} className="field mt-1.5" />
    </label>
  );
}

function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} defaultValue={defaultValue} className="field mt-1.5">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
