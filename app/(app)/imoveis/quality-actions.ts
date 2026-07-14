"use server";

import { revalidatePath } from "next/cache";
import { requiredText, text } from "@/lib/form-parse";
import { computeListingQuality } from "@/lib/real-estate-listing-quality";
import type { RealEstateProperty } from "@/lib/supabase/types";
import { requireRealEstate } from "./actions";

// RE-5xx (Fase 5): recalcula o score 0-100 e cria uma tarefa por gap
// relevante — "adicionar foto de capa", "preencher preço", "revisar
// descrição", "anexar matrícula" (exemplos citados no plano). Dedup
// simples: não duplica se já existe uma tarefa aberta com o mesmo título
// pra este imóvel (revisitar o score toda hora não deve empilhar tarefas
// repetidas).
export async function recalculateListingQuality(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);

  const [{ data: propertyRow }, { data: mediaRows }, { data: openTasks }] = await Promise.all([
    supabase.from("real_estate_properties").select("*").eq("id", propertyId).eq("org_id", orgId).maybeSingle(),
    supabase.from("real_estate_property_media").select("id").eq("property_id", propertyId),
    supabase.from("tasks").select("title").eq("org_id", orgId).eq("done", false).not("title", "is", null),
  ]);
  if (!propertyRow) throw new Error("Imóvel não encontrado.");
  const property = propertyRow as RealEstateProperty;
  const { score, gaps } = computeListingQuality(property, mediaRows?.length ?? 0);

  await supabase.from("real_estate_properties").update({ listing_quality_score: score }).eq("id", propertyId).eq("org_id", orgId);

  const openTitles = new Set((openTasks ?? []).map((t) => t.title as string));
  const assignee = property.assignee_id ?? property.created_by;
  const newTasks = gaps
    .filter((gap) => gap.points > 0 || gap.field === "registration_number")
    .map((gap) => `${gap.suggestion} — ${property.title}`)
    .filter((title) => !openTitles.has(title))
    .map((title) => ({
      owner_id: user.id,
      org_id: orgId,
      workspace_key: "real_estate_broker",
      assignee_id: assignee,
      title,
      due_at: new Date().toISOString(),
    }));
  if (newTasks.length > 0) {
    await supabase.from("tasks").insert(newTasks);
  }

  revalidatePath(`/imoveis/${propertyId}`);
}

export async function addDocumentChecklistItem(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const documentType = requiredText(formData.get("document_type"), "Documento", 160);

  const { error } = await supabase.from("real_estate_property_documents").insert({
    org_id: orgId,
    property_id: propertyId,
    document_type: documentType,
    created_by: user.id,
  });
  if (error) throw new Error("Não foi possível adicionar o item ao checklist.");
  revalidatePath(`/imoveis/${propertyId}`);
}

export async function updateDocumentChecklistStatus(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const documentId = requiredText(formData.get("document_id"), "Documento", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const status = text(formData.get("status"), 16);
  if (!["pending", "received", "waived"].includes(status)) throw new Error("Status inválido.");

  const { error } = await supabase.from("real_estate_property_documents").update({ status }).eq("id", documentId).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível atualizar o documento.");
  revalidatePath(`/imoveis/${propertyId}`);
}

export async function removeDocumentChecklistItem(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const documentId = requiredText(formData.get("document_id"), "Documento", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const { error } = await supabase.from("real_estate_property_documents").delete().eq("id", documentId).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível remover o item.");
  revalidatePath(`/imoveis/${propertyId}`);
}
