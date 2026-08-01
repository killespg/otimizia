import type { SupabaseClient } from "@supabase/supabase-js";

// RE-2xx (Fase 2): compartilhado entre app/(app)/imoveis/actions.ts
// (criação/edição de vitrine pela UI) e lib/ai/tools/preferences.ts
// (create_property_showcase) — quando uma vitrine é vinculada a um
// atendimento, os imóveis dela entram/avançam como 'sent' em
// real_estate_deal_properties. Nunca regride um status já mais adiantado
// (interested/visit_scheduled/...): só toca linhas inexistentes ou ainda
// em suggested/selected.
export async function advancePropertiesToSent(
  supabase: SupabaseClient,
  orgId: string,
  dealId: string | null,
  propertyIds: string[]
) {
  if (!dealId || propertyIds.length === 0) return;
  const { data: existingRows } = await supabase
    .from("real_estate_deal_properties")
    .select("property_id, status")
    .eq("org_id", orgId)
    .eq("deal_id", dealId)
    .in("property_id", propertyIds);
  const statusByProperty = new Map((existingRows ?? []).map((r) => [r.property_id as string, r.status as string]));
  const EARLY_STAGES = new Set(["suggested", "selected"]);
  const now = new Date().toISOString();

  const toInsert = propertyIds.filter((id) => !statusByProperty.has(id));
  const toAdvance = propertyIds.filter((id) => EARLY_STAGES.has(statusByProperty.get(id) ?? ""));

  if (toInsert.length > 0) {
    await supabase.from("real_estate_deal_properties").insert(
      toInsert.map((propertyId) => ({
        org_id: orgId,
        deal_id: dealId,
        property_id: propertyId,
        status: "sent",
        source: "share_collection",
        sent_at: now,
      }))
    );
  }
  if (toAdvance.length > 0) {
    await supabase
      .from("real_estate_deal_properties")
      .update({ status: "sent", sent_at: now })
      .eq("org_id", orgId)
      .eq("deal_id", dealId)
      .in("property_id", toAdvance);
  }
}
