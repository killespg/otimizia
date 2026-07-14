import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolInput } from "./types";
import { ensureOk, optionalStr, requireVisibleContactId, requireVisiblePropertyId, str } from "./validation";

// RE-3xx (Fase 3) — equivalente por IA de scheduleVisit
// (app/(app)/imoveis/visit-actions.ts). Sempre cria com status 'scheduled'
// (a IA nunca deixa uma visita "solicitada" pendurada sem dono) — o fluxo
// de 'requested' é exclusivo da reação do cliente na vitrine pública
// (record_property_reaction), não algo que a IA inicia.
export async function schedulePropertyVisit(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  input: ToolInput
) {
  const propertyId = await requireVisiblePropertyId(supabase, orgId, workspaceKey, input.imovel_id);
  const contactId = await requireVisibleContactId(supabase, orgId, workspaceKey, input.contato_id);
  const dealId = input.atendimento_id ? str(input.atendimento_id, "atendimento_id") : null;
  if (dealId) {
    const { data: deal } = await supabase.from("deals").select("id").eq("id", dealId).eq("org_id", orgId).eq("workspace_key", workspaceKey).maybeSingle();
    if (!deal) throw new Error("Atendimento não encontrado.");
  }

  const dataHora = str(input.data_hora, "data_hora");
  const scheduledAt = new Date(dataHora);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("data_hora inválida — use um formato ISO 8601.");

  const duracao = Number(input.duracao_minutos) || 45;
  const notas = optionalStr(input.observacoes, 800);

  const { data, error } = await supabase
    .from("real_estate_visits")
    .insert({
      org_id: orgId,
      contact_id: contactId,
      deal_id: dealId,
      property_id: propertyId,
      broker_id: userId,
      status: "scheduled",
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: duracao,
      broker_notes: notas,
    })
    .select("id, scheduled_at")
    .single();
  ensureOk(error);

  if (dealId) {
    await supabase
      .from("real_estate_deal_properties")
      .upsert({ org_id: orgId, deal_id: dealId, property_id: propertyId, status: "visit_scheduled" }, { onConflict: "deal_id,property_id" });
  }

  return JSON.stringify({ ok: true, visita: data });
}
