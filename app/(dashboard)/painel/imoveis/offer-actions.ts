"use server";

import { revalidatePath } from "next/cache";
import { moneyToCentsOrNull, requiredText, text } from "@/lib/utils/form-parse";
import { requireRealEstate } from "./actions";

function requiredMoneyToCents(v: FormDataEntryValue | null): number {
  const cents = moneyToCentsOrNull(v);
  if (cents === null) throw new Error("Informe o valor da proposta.");
  return cents;
}

function offerFieldsFromForm(formData: FormData) {
  const expiresRaw = text(formData.get("expires_at"), 32);
  return {
    amount_cents: requiredMoneyToCents(formData.get("amount")),
    down_payment_cents: moneyToCentsOrNull(formData.get("down_payment")),
    financing_amount_cents: moneyToCentsOrNull(formData.get("financing_amount")),
    payment_terms: text(formData.get("payment_terms"), 500) || null,
    conditions: text(formData.get("conditions"), 1200) || null,
    expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
  };
}

export async function createOffer(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const dealId = requiredText(formData.get("deal_id"), "Atendimento", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const contactId = requiredText(formData.get("contact_id"), "Cliente", 80);

  const { error } = await supabase.from("real_estate_offers").insert({
    org_id: orgId,
    contact_id: contactId,
    deal_id: dealId,
    property_id: propertyId,
    created_by: user.id,
    status: "draft",
    ...offerFieldsFromForm(formData),
  });
  if (error) throw new Error("Não foi possível criar a proposta.");
  revalidatePath(`/painel/imoveis/match/${dealId}`);
}

export async function sendOffer(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const offerId = requiredText(formData.get("offer_id"), "Proposta", 80);

  const { data: offer, error } = await supabase
    .from("real_estate_offers")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("org_id", orgId)
    .select("deal_id, property_id")
    .single();
  if (error || !offer) throw new Error("Não foi possível enviar a proposta.");

  await supabase
    .from("real_estate_deal_properties")
    .upsert({ org_id: orgId, deal_id: offer.deal_id, property_id: offer.property_id, status: "offer" }, { onConflict: "deal_id,property_id" });

  revalidatePath(`/painel/imoveis/match/${offer.deal_id}`);
}

export async function markOfferViewed(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const offerId = requiredText(formData.get("offer_id"), "Proposta", 80);
  const { data: offer, error } = await supabase
    .from("real_estate_offers")
    .update({ status: "viewed" })
    .eq("id", offerId)
    .eq("org_id", orgId)
    .eq("status", "sent")
    .select("deal_id")
    .maybeSingle();
  if (error) throw new Error("Não foi possível atualizar a proposta.");
  if (offer) revalidatePath(`/painel/imoveis/match/${offer.deal_id}`);
}

// Contraproposta = registro novo encadeado (RE-4xx) — nunca edita
// amount_cents/conditions de uma proposta já enviada. A original vira
// 'countered' (superada), a nova nasce 'sent' (já é uma resposta concreta,
// não um rascunho).
export async function counterOffer(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const parentId = requiredText(formData.get("parent_offer_id"), "Proposta original", 80);

  const { data: parent } = await supabase
    .from("real_estate_offers")
    .select("deal_id, property_id, contact_id")
    .eq("id", parentId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!parent) throw new Error("Proposta original não encontrada.");

  const { error: insertError } = await supabase.from("real_estate_offers").insert({
    org_id: orgId,
    contact_id: parent.contact_id,
    deal_id: parent.deal_id,
    property_id: parent.property_id,
    created_by: user.id,
    parent_offer_id: parentId,
    status: "sent",
    sent_at: new Date().toISOString(),
    ...offerFieldsFromForm(formData),
  });
  if (insertError) throw new Error("Não foi possível registrar a contraproposta.");

  await supabase.from("real_estate_offers").update({ status: "countered", responded_at: new Date().toISOString() }).eq("id", parentId).eq("org_id", orgId);
  revalidatePath(`/painel/imoveis/match/${parent.deal_id}`);
}

// Aceite NUNCA muda deal.stage nem real_estate_properties.status sozinho
// (RE-4xx: "nunca mudar pra vendido automaticamente sem confirmação
// explícita do corretor") — só sugere via tarefa, igual ao padrão de
// completeVisit (Fase 3).
export async function acceptOffer(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const offerId = requiredText(formData.get("offer_id"), "Proposta", 80);

  const { data: offer, error } = await supabase
    .from("real_estate_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("org_id", orgId)
    .select("id, deal_id, property_id")
    .single();
  if (error || !offer) throw new Error("Não foi possível registrar o aceite.");

  const { data: property } = await supabase.from("real_estate_properties").select("title, assignee_id, created_by").eq("id", offer.property_id).maybeSingle();
  await supabase.from("tasks").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: "real_estate_broker",
    assignee_id: property?.assignee_id ?? property?.created_by ?? user.id,
    deal_id: offer.deal_id,
    title: `Proposta aceita — considere marcar "${property?.title ?? "o imóvel"}" como reservado e o atendimento como ganho`,
    due_at: new Date().toISOString(),
  });

  await supabase
    .from("real_estate_deal_properties")
    .update({ status: "won" })
    .eq("org_id", orgId)
    .eq("deal_id", offer.deal_id)
    .eq("property_id", offer.property_id);

  revalidatePath(`/painel/imoveis/match/${offer.deal_id}`);
}

export async function declineOffer(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const offerId = requiredText(formData.get("offer_id"), "Proposta", 80);
  const { data: offer, error } = await supabase
    .from("real_estate_offers")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("org_id", orgId)
    .select("deal_id")
    .single();
  if (error || !offer) throw new Error("Não foi possível registrar a recusa.");
  revalidatePath(`/painel/imoveis/match/${offer.deal_id}`);
}

