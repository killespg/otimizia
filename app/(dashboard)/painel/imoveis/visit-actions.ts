"use server";

import { revalidatePath } from "next/cache";
import { optionalUuid, requiredText, text } from "@/lib/utils/form-parse";
import { requireRealEstate } from "./actions";

function requiredIsoDateTime(v: FormDataEntryValue | null): string {
  const raw = text(v, 32);
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) throw new Error("Informe uma data/hora válida.");
  return date.toISOString();
}

// Agenda uma visita nova (a partir de um imóvel/atendimento) ou marca uma
// solicitação existente ('requested', criada por record_property_reaction
// quando o cliente reage "quero visitar" na vitrine) como agendada.
export async function scheduleVisit(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const visitId = optionalUuid(formData.get("visit_id"));
  const scheduledAt = requiredIsoDateTime(formData.get("scheduled_at"));
  const durationMinutes = Number(text(formData.get("duration_minutes"), 5)) || 45;
  const brokerNotes = text(formData.get("broker_notes"), 800) || null;

  if (visitId) {
    const { error } = await supabase
      .from("real_estate_visits")
      .update({ status: "scheduled", scheduled_at: scheduledAt, duration_minutes: durationMinutes, broker_notes: brokerNotes })
      .eq("id", visitId)
      .eq("org_id", orgId);
    if (error) throw new Error("Não foi possível agendar a visita.");
  } else {
    const contactId = requiredText(formData.get("contact_id"), "Cliente", 80);
    const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
    const dealId = optionalUuid(formData.get("deal_id"));
    const { error } = await supabase.from("real_estate_visits").insert({
      org_id: orgId,
      contact_id: contactId,
      deal_id: dealId,
      property_id: propertyId,
      broker_id: user.id,
      status: "scheduled",
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      broker_notes: brokerNotes,
    });
    if (error) throw new Error("Não foi possível agendar a visita.");

    if (dealId) {
      await supabase
        .from("real_estate_deal_properties")
        .upsert(
          { org_id: orgId, deal_id: dealId, property_id: propertyId, status: "visit_scheduled" },
          { onConflict: "deal_id,property_id" }
        );
    }
  }

  revalidatePath("/imoveis/visitas");
  if (formData.get("deal_id")) revalidatePath(`/imoveis/match/${formData.get("deal_id")}`);
}

export async function confirmVisit(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const visitId = requiredText(formData.get("visit_id"), "Visita", 80);
  const confirmed = text(formData.get("confirmation_status"), 12);
  if (confirmed !== "confirmed" && confirmed !== "declined") throw new Error("Status de confirmação inválido.");

  const { error } = await supabase
    .from("real_estate_visits")
    .update({ confirmation_status: confirmed })
    .eq("id", visitId)
    .eq("org_id", orgId);
  if (error) throw new Error("Não foi possível atualizar a confirmação.");
  revalidatePath("/imoveis/visitas");
}

// "Visita concluída -> feedback rápido; feedback positivo -> sugere criar
// proposta" (RE-3xx): a sugestão vira uma tarefa (mesmo mecanismo usado
// pro resto do produto pra "algo que precisa de atenção"), não uma
// proposta criada sozinha — só o corretor decide.
export async function completeVisit(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const visitId = requiredText(formData.get("visit_id"), "Visita", 80);
  const feedback = text(formData.get("client_feedback"), 1200) || null;
  const interested = formData.get("client_interested") === "on";

  const { data: visit, error } = await supabase
    .from("real_estate_visits")
    .update({ status: "completed", client_feedback: feedback, completed_at: new Date().toISOString() })
    .eq("id", visitId)
    .eq("org_id", orgId)
    .select("id, deal_id, property_id, broker_id")
    .single();
  if (error || !visit) throw new Error("Não foi possível registrar a conclusão da visita.");

  if (visit.deal_id) {
    await supabase
      .from("real_estate_deal_properties")
      .update({ status: interested ? "offer" : "interested" })
      .eq("org_id", orgId)
      .eq("deal_id", visit.deal_id)
      .eq("property_id", visit.property_id);
  }

  if (interested) {
    const { data: property } = await supabase.from("real_estate_properties").select("title").eq("id", visit.property_id).maybeSingle();
    await supabase.from("tasks").insert({
      owner_id: user.id,
      org_id: orgId,
      workspace_key: "real_estate_broker",
      assignee_id: visit.broker_id,
      deal_id: visit.deal_id,
      title: `Preparar proposta — ${property?.title ?? "imóvel visitado"}`,
      due_at: new Date().toISOString(),
    });
  }

  revalidatePath("/imoveis/visitas");
}

// "Não compareceu -> tarefa de remarcação + histórico" — a linha da visita
// em si já é o histórico (status='no_show' fica registrado, não é
// apagada); só falta o follow-up.
export async function markVisitNoShow(formData: FormData) {
  const { supabase, user, orgId } = await requireRealEstate();
  const visitId = requiredText(formData.get("visit_id"), "Visita", 80);

  const { data: visit, error } = await supabase
    .from("real_estate_visits")
    .update({ status: "no_show" })
    .eq("id", visitId)
    .eq("org_id", orgId)
    .select("id, contact_id, deal_id, property_id, broker_id")
    .single();
  if (error || !visit) throw new Error("Não foi possível registrar a ausência.");

  const { data: property } = await supabase.from("real_estate_properties").select("title").eq("id", visit.property_id).maybeSingle();
  await supabase.from("tasks").insert({
    owner_id: user.id,
    org_id: orgId,
    workspace_key: "real_estate_broker",
    assignee_id: visit.broker_id,
    contact_id: visit.contact_id,
    deal_id: visit.deal_id,
    title: `Remarcar visita — ${property?.title ?? "imóvel"}`,
    due_at: new Date().toISOString(),
  });

  revalidatePath("/imoveis/visitas");
}

export async function cancelVisit(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const visitId = requiredText(formData.get("visit_id"), "Visita", 80);
  const { error } = await supabase.from("real_estate_visits").update({ status: "cancelled" }).eq("id", visitId).eq("org_id", orgId);
  if (error) throw new Error("Não foi possível cancelar a visita.");
  revalidatePath("/imoveis/visitas");
}

