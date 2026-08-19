"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageRealEstate } from "@/lib/real-estate/real-estate";
import { decimalOrNull, intOrNull, moneyToCentsOrNull, normalizeBulkIds, optionalUuid, requiredText, signedDecimalOrNull, text } from "@/lib/utils/form-parse";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { advancePropertiesToSent } from "@/lib/real-estate/real-estate-deal-properties";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import type {
  AiSuggestedField,
  JobRole,
  RealEstatePropertyStatus,
  RealEstatePropertyType,
  RealEstateTransactionType,
} from "@/lib/supabase/types";

const MAX = { title: 180, text: 2000, short: 160 };
const PROPERTY_PHOTOS_BUCKET = "property-photos";
const PROPERTY_PHOTO_MAX_BYTES = 6 * 1024 * 1024;

const PROPERTY_TYPES = ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"];
const TRANSACTION_TYPES = ["venda", "aluguel", "venda_aluguel"];
const STATUSES = ["rascunho", "ativo", "reservado", "vendido", "alugado", "inativo"];

export async function requireRealEstate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const [{ data: profile }, orgRole, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle(),
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "real_estate_broker") {
    throw new Error("Este recurso está disponível apenas no workspace imobiliário.");
  }
  const isAdmin = orgRole === "admin";
  const jobRole = (membership?.job_role as JobRole | undefined) ?? "staff";
  if (!canManageRealEstate(jobRole, isAdmin)) {
    throw new Error("Seu cargo não pode gerenciar imóveis.");
  }
  return { supabase, user, orgId, isAdmin, jobRole };
}

function validPropertyType(v: FormDataEntryValue | null): RealEstatePropertyType {
  const value = text(v, 24);
  if (!PROPERTY_TYPES.includes(value)) throw new Error("Tipo de imóvel inválido.");
  return value as RealEstatePropertyType;
}

function validTransactionType(v: FormDataEntryValue | null): RealEstateTransactionType {
  const value = text(v, 24);
  if (!TRANSACTION_TYPES.includes(value)) throw new Error("Tipo de transação inválido.");
  return value as RealEstateTransactionType;
}

function validStatus(v: FormDataEntryValue | null): RealEstatePropertyStatus {
  const value = text(v, 24);
  return (STATUSES.includes(value) ? value : "ativo") as RealEstatePropertyStatus;
}

function propertyFieldsFromForm(formData: FormData) {
  return {
    title: requiredText(formData.get("title"), "Título", MAX.title),
    property_type: validPropertyType(formData.get("property_type")),
    transaction_type: validTransactionType(formData.get("transaction_type")),
    status: validStatus(formData.get("status")),
    price_cents: moneyToCentsOrNull(formData.get("price")),
    rent_price_cents: moneyToCentsOrNull(formData.get("rent_price")),
    condo_fee_cents: moneyToCentsOrNull(formData.get("condo_fee")),
    iptu_cents: moneyToCentsOrNull(formData.get("iptu")),
    bedrooms: intOrNull(formData.get("bedrooms")),
    bathrooms: intOrNull(formData.get("bathrooms")),
    parking_spots: intOrNull(formData.get("parking_spots")),
    area_m2: decimalOrNull(formData.get("area_m2")),
    address_street: text(formData.get("address_street"), MAX.short) || null,
    address_number: text(formData.get("address_number"), 20) || null,
    address_neighborhood: text(formData.get("address_neighborhood"), MAX.short) || null,
    address_city: text(formData.get("address_city"), MAX.short) || null,
    address_state: text(formData.get("address_state"), 2) || null,
    address_zip: text(formData.get("address_zip"), 12) || null,
    description: text(formData.get("description"), MAX.text) || null,
  };
}

// owner_contact_id/capture_source só aparecem no formulário quando
// real_estate_v2_enabled está ligado pra essa org (RE-004). Em create isso
// não importa (linha nova, sem nada a preservar), mas em update um campo
// ausente do form NÃO pode virar null — senão desligar/religar a flag, ou
// só não ter os campos no form ainda, apagaria valor gravado pela IA
// (lib/ai/tools/properties.ts, que não é gateada pela flag).
function v2FieldsFromFormIfPresent(formData: FormData): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (formData.has("owner_contact_id")) patch.owner_contact_id = optionalUuid(formData.get("owner_contact_id"));
  if (formData.has("capture_source")) patch.capture_source = text(formData.get("capture_source"), MAX.short) || null;
  // latitude/longitude (RE-7xx) só existem no form quando PropertyAddressFields
  // renderiza (v2Enabled) — mesmo cuidado de não regredir campo ausente.
  if (formData.has("latitude")) patch.latitude = signedDecimalOrNull(formData.get("latitude"));
  if (formData.has("longitude")) patch.longitude = signedDecimalOrNull(formData.get("longitude"));
  return patch;
}

export async function createProperty(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const fields = propertyFieldsFromForm(formData);
  const assigneeId = optionalUuid(formData.get("assignee_id")) ?? user.id;
  const { data: property, error } = await supabase
    .from("real_estate_properties")
    .insert({
      org_id: orgId,
      workspace_key: "real_estate_broker",
      created_by: user.id,
      assignee_id: assigneeId,
      owner_contact_id: optionalUuid(formData.get("owner_contact_id")),
      capture_source: text(formData.get("capture_source"), MAX.short) || null,
      latitude: signedDecimalOrNull(formData.get("latitude")),
      longitude: signedDecimalOrNull(formData.get("longitude")),
      // Quem cadastrou pela UI é quem captou — a IA (lib/ai/tools/properties.ts)
      // segue a mesma regra com o usuário que está na conversa.
      captured_by: user.id,
      ...fields,
    })
    .select("id")
    .single();
  if (error || !property) throw new Error("Não foi possível criar o imóvel.");
  revalidateImoveis();
  redirect(`/painel/imoveis/${property.id}`);
}

export async function updateProperty(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const id = requiredText(formData.get("id"), "Imóvel", 80);
  const fields = propertyFieldsFromForm(formData);
  const assigneeId = optionalUuid(formData.get("assignee_id"));
  // captured_by não é reeditável aqui de propósito — é um fato histórico de
  // quem trouxe o imóvel pra carteira, igual created_by/created_at.
  const { error } = await supabase
    .from("real_estate_properties")
    .update({ ...fields, assignee_id: assigneeId, ...v2FieldsFromFormIfPresent(formData) })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível atualizar o imóvel.");
  revalidateImoveis();
  revalidatePath(`/painel/imoveis/${id}`);
}

export async function deleteProperty(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const id = requiredText(formData.get("id"), "Imóvel", 80);

  const { data: media } = await supabase
    .from("real_estate_property_media")
    .select("storage_path")
    .eq("property_id", id);
  const paths = (media ?? []).map((m) => m.storage_path as string);
  if (paths.length > 0) {
    const admin = createAdminClient();
    await admin.storage.from(PROPERTY_PHOTOS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("real_estate_properties").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível excluir o imóvel.");
  revalidateImoveis();
  redirect("/painel/imoveis");
}

// Exclusão em lote da carteira. Só apaga o que é da org (o `in` sozinho não
// basta: um id de outra org viria no array e a RLS silenciaria a linha, mas o
// arquivo do storage já teria ido embora) — por isso o select de conferência
// antes de remover as fotos.
export async function bulkDeleteProperties(ids: string[]) {
  const propertyIds = normalizeBulkIds(ids);
  if (propertyIds.length === 0) return { deleted: 0 };
  const { supabase, orgId } = await requireRealEstate();

  const { data: owned } = await supabase
    .from("real_estate_properties")
    .select("id")
    .in("id", propertyIds)
    .eq("org_id", orgId);
  const ownedIds = (owned ?? []).map((property) => property.id as string);
  if (ownedIds.length === 0) return { deleted: 0 };

  const { data: media } = await supabase
    .from("real_estate_property_media")
    .select("storage_path")
    .in("property_id", ownedIds);
  const paths = (media ?? []).map((item) => item.storage_path as string);

  const { error } = await supabase
    .from("real_estate_properties")
    .delete()
    .in("id", ownedIds)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível excluir os imóveis selecionados.");

  if (paths.length > 0) {
    const admin = createAdminClient();
    await admin.storage.from(PROPERTY_PHOTOS_BUCKET).remove(paths);
  }

  revalidateImoveis();
  return { deleted: ownedIds.length };
}

const PHOTO_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadPropertyPhoto(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Escolha uma foto.");
  if (file.size > PROPERTY_PHOTO_MAX_BYTES) throw new Error("A foto pode ter no máximo 6 MB.");
  const extension = PHOTO_MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error("Tipo de arquivo não suportado. Envie JPG, PNG, WEBP ou GIF.");

  const { data: property } = await supabase
    .from("real_estate_properties")
    .select("id")
    .eq("id", propertyId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!property) throw new Error("Imóvel não encontrado.");

  const { data: lastMedia } = await supabase
    .from("real_estate_property_media")
    .select("position")
    .eq("property_id", propertyId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (lastMedia?.position ?? -1) + 1;

  const path = `${orgId}/${propertyId}/${randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(PROPERTY_PHOTOS_BUCKET)
    .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) throw new Error("Não foi possível enviar a foto.");

  const { error } = await supabase.from("real_estate_property_media").insert({
    org_id: orgId,
    property_id: propertyId,
    storage_path: path,
    position: nextPosition,
    created_by: user.id,
  });
  if (error) {
    await admin.storage.from(PROPERTY_PHOTOS_BUCKET).remove([path]);
    throw new Error("Não foi possível salvar a foto.");
  }
  revalidatePath(`/painel/imoveis/${propertyId}`);
}

export async function deletePropertyMedia(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const id = requiredText(formData.get("id"), "Foto", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);

  const { data: mediaRow } = await supabase
    .from("real_estate_property_media")
    .select("storage_path")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!mediaRow) throw new Error("Foto não encontrada.");

  const { error } = await supabase.from("real_estate_property_media").delete().eq("id", id).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível excluir a foto.");

  const admin = createAdminClient();
  await admin.storage.from(PROPERTY_PHOTOS_BUCKET).remove([mediaRow.storage_path as string]);
  revalidatePath(`/painel/imoveis/${propertyId}`);
}

// Reordenação por arrastar: o cliente manda a lista inteira de ids na nova
// ordem (posição = índice no array) em vez de trocar com o vizinho — um
// único drop já resolve qualquer distância, não só "um passo por clique".
// Valida que o conjunto recebido é exatamente o conjunto de fotos do imóvel
// (mesmo tamanho, mesmos ids) antes de gravar, pra um id de outro imóvel
// nunca conseguir roubar uma posição aqui.
export async function reorderPropertyMedia(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const mediaIds = formData.getAll("media_ids").map(String).filter(Boolean);
  if (mediaIds.length === 0) return;

  const { data: existing } = await supabase
    .from("real_estate_property_media")
    .select("id")
    .eq("property_id", propertyId)
    .eq("org_id", orgId);
  const existingIds = new Set((existing ?? []).map((m) => m.id as string));
  if (mediaIds.length !== existingIds.size || mediaIds.some((id) => !existingIds.has(id))) {
    throw new Error("Lista de fotos inválida.");
  }

  await Promise.all(
    mediaIds.map((id, index) =>
      supabase.from("real_estate_property_media").update({ position: index }).eq("id", id).eq("org_id", orgId)
    )
  );
  revalidatePath(`/painel/imoveis/${propertyId}`);
}

const CONFIRMABLE_INTEGER_FIELDS = new Set(["price_cents", "rent_price_cents", "condo_fee_cents", "iptu_cents", "bedrooms", "bathrooms", "parking_spots"]);
const CONFIRMABLE_DECIMAL_FIELDS = new Set(["area_m2", "latitude", "longitude"]);
const CONFIRMABLE_TEXT_FIELDS = new Set([
  "title", "property_type", "transaction_type", "status", "description",
  "address_street", "address_number", "address_neighborhood", "address_city", "address_state", "address_zip",
]);

async function loadAiSuggestedFields(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  propertyId: string
): Promise<Record<string, AiSuggestedField>> {
  const { data: property } = await supabase
    .from("real_estate_properties")
    .select("ai_suggested_fields")
    .eq("id", propertyId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!property) throw new Error("Imóvel não encontrado.");
  return (property.ai_suggested_fields as Record<string, AiSuggestedField>) ?? {};
}

// Só um clique humano nesta ação move um valor sugerido pela IA para a
// coluna tipada real — o assistente nunca confirma a própria sugestão.
export async function confirmPropertyAiField(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const field = requiredText(formData.get("field"), "Campo", 60);
  const isKnownField =
    CONFIRMABLE_INTEGER_FIELDS.has(field) || CONFIRMABLE_DECIMAL_FIELDS.has(field) || CONFIRMABLE_TEXT_FIELDS.has(field);
  if (!isKnownField) throw new Error("Campo sugerido desconhecido.");

  const suggestedFields = await loadAiSuggestedFields(supabase, orgId, propertyId);
  const suggestion = suggestedFields[field];
  if (!suggestion) throw new Error("Sugestão não encontrada.");

  let value: unknown = suggestion.value;
  if (CONFIRMABLE_INTEGER_FIELDS.has(field)) value = Math.round(Number(suggestion.value)) || null;
  if (CONFIRMABLE_DECIMAL_FIELDS.has(field)) value = Number(suggestion.value) || null;

  const remaining = { ...suggestedFields };
  delete remaining[field];

  const { error } = await supabase
    .from("real_estate_properties")
    .update({ [field]: value, ai_suggested_fields: remaining })
    .eq("id", propertyId)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível confirmar o campo sugerido.");
  revalidatePath(`/painel/imoveis/${propertyId}`);
}

export async function discardPropertyAiField(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const field = requiredText(formData.get("field"), "Campo", 60);

  const suggestedFields = await loadAiSuggestedFields(supabase, orgId, propertyId);
  const remaining = { ...suggestedFields };
  delete remaining[field];

  const { error } = await supabase
    .from("real_estate_properties")
    .update({ ai_suggested_fields: remaining })
    .eq("id", propertyId)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível descartar o campo sugerido.");
  revalidatePath(`/painel/imoveis/${propertyId}`);
}

export async function createShareCollection(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const title = requiredText(formData.get("title"), "Título da vitrine", MAX.title);
  const clientContactId = optionalUuid(formData.get("client_contact_id"));
  const dealId = optionalUuid(formData.get("deal_id"));
  const propertyIds = formData.getAll("property_ids").map(String).filter(Boolean);
  if (propertyIds.length === 0) throw new Error("Selecione pelo menos um imóvel.");

  const { data: collection, error } = await supabase
    .from("real_estate_share_collections")
    .insert({
      org_id: orgId,
      workspace_key: "real_estate_broker",
      created_by: user.id,
      title,
      client_contact_id: clientContactId,
      deal_id: dealId,
    })
    .select("id")
    .single();
  if (error || !collection) throw new Error("Não foi possível criar a vitrine.");

  const items = propertyIds.map((propertyId, index) => ({
    collection_id: collection.id,
    org_id: orgId,
    property_id: propertyId,
    position: index,
  }));
  const { error: itemsError } = await supabase.from("real_estate_share_collection_items").insert(items);
  if (itemsError) {
    await supabase.from("real_estate_share_collections").delete().eq("id", collection.id).eq("org_id", orgId);
    throw new Error("Não foi possível adicionar os imóveis à vitrine.");
  }

  await advancePropertiesToSent(supabase, orgId, dealId, propertyIds);
  revalidatePath("/painel/imoveis/colecoes");
  redirect("/painel/imoveis/colecoes");
}

export async function addPropertyToCollection(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const collectionId = requiredText(formData.get("collection_id"), "Vitrine", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);

  const [{ data: lastItem }, { data: collection }] = await Promise.all([
    supabase
      .from("real_estate_share_collection_items")
      .select("position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("real_estate_share_collections").select("deal_id").eq("id", collectionId).eq("org_id", orgId).maybeSingle(),
  ]);
  const nextPosition = (lastItem?.position ?? -1) + 1;

  const { error } = await supabase.from("real_estate_share_collection_items").insert({
    collection_id: collectionId,
    org_id: orgId,
    property_id: propertyId,
    position: nextPosition,
  });
  if (error) throw new Error("Não foi possível adicionar o imóvel à vitrine (confira se já não está nela).");
  await advancePropertiesToSent(supabase, orgId, (collection?.deal_id as string | null) ?? null, [propertyId]);
  revalidatePath("/painel/imoveis/colecoes");
}

export async function removePropertyFromCollection(formData: FormData) {
  const { supabase } = await requireRealEstate();
  const collectionId = requiredText(formData.get("collection_id"), "Vitrine", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const { error } = await supabase
    .from("real_estate_share_collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("property_id", propertyId);
  if (error) throw new Error("Não foi possível remover o imóvel da vitrine.");
  revalidatePath("/painel/imoveis/colecoes");
}

export async function revokeShareCollection(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const id = requiredText(formData.get("id"), "Vitrine", 80);
  const { error } = await supabase
    .from("real_estate_share_collections")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível revogar a vitrine.");
  revalidatePath("/painel/imoveis/colecoes");
}

function revalidateImoveis() {
  revalidatePath("/painel/imoveis");
  revalidatePath("/painel");
}

