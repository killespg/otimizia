import type { SupabaseClient } from "@supabase/supabase-js";
import { isCommissionOverdue } from "@/lib/real-estate/real-estate-commissions";
import type { RealEstateCommissionStatus } from "@/lib/supabase/types";
import type { ToolInput } from "./types";
import { clampInt } from "./validation";

// RE-6xx (Fase 6) — leitura pura, mesmos números do dashboard
// (/imoveis/dashboard), só que resumidos pra conversa em vez de uma
// tela cheia de widgets.
export async function getRealEstatePipelineSummary(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const dias = clampInt(input.dias, 1, 365, 30);
  const from = new Date(Date.now() - dias * 86_400_000).toISOString();

  const [{ count: capturedCount }, { count: showcaseCount }, { data: visits }, { data: offers }, { data: commissions }] = await Promise.all([
    supabase.from("real_estate_properties").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("workspace_key", workspaceKey).gte("created_at", from),
    supabase.from("real_estate_share_collections").select("id", { count: "exact", head: true }).eq("org_id", orgId).gte("created_at", from),
    supabase.from("real_estate_visits").select("status").eq("org_id", orgId).gte("created_at", from),
    supabase.from("real_estate_offers").select("status").eq("org_id", orgId).gte("created_at", from),
    supabase.from("real_estate_commissions").select("status, due_at, expected_amount_cents, received_amount_cents").eq("org_id", orgId).gte("created_at", from),
  ]);

  const visitsList = visits ?? [];
  const offersList = offers ?? [];
  const commissionsList = (commissions ?? []) as { status: RealEstateCommissionStatus; due_at: string | null; expected_amount_cents: number; received_amount_cents: number }[];

  return JSON.stringify({
    periodo_dias: dias,
    imoveis_captados: capturedCount ?? 0,
    vitrines_enviadas: showcaseCount ?? 0,
    visitas: {
      total: visitsList.length,
      agendadas: visitsList.filter((v) => v.status === "scheduled").length,
      concluidas: visitsList.filter((v) => v.status === "completed").length,
      nao_compareceu: visitsList.filter((v) => v.status === "no_show").length,
    },
    propostas: {
      total: offersList.length,
      enviadas: offersList.filter((o) => o.status === "sent" || o.status === "viewed").length,
      aceitas: offersList.filter((o) => o.status === "accepted").length,
      recusadas: offersList.filter((o) => o.status === "declined").length,
    },
    comissao: {
      prevista_centavos: commissionsList.reduce((sum, c) => sum + (c.expected_amount_cents as number), 0),
      recebida_centavos: commissionsList.reduce((sum, c) => sum + (c.received_amount_cents as number), 0),
      vencidas: commissionsList.filter((c) => isCommissionOverdue(c)).length,
    },
  });
}
