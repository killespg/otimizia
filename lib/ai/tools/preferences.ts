import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMatchScore } from "@/lib/real-estate-match";
import type { RealEstateLeadPreferences, RealEstateProperty } from "@/lib/supabase/types";
import type { ToolInput } from "./types";
import { clampInt, detailsObject, ensureOk, optionalStr, str, visibleContactIdOrNull } from "./validation";

const TRANSACTION_TYPES = ["venda", "aluguel", "venda_aluguel"];
const PROPERTY_TYPES = ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"];
const MATCHABLE_STATUSES = ["ativo", "reservado"];

function optionalStringArray(v: unknown, allowed?: string[]): string[] {
  if (!Array.isArray(v)) return [];
  const values = v.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((s) => s.trim());
  return allowed ? values.filter((value) => allowed.includes(value)) : values;
}

function optionalCentsOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error("Valor em reais inválido.");
  return Math.round(n * 100);
}

async function requireVisibleDealId(supabase: SupabaseClient, orgId: string, workspaceKey: string, v: unknown): Promise<string> {
  const id = str(v, "atendimento_id");
  const { data, error } = await supabase
    .from("deals")
    .select("id, contact_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Atendimento não encontrado.");
  return id;
}

export async function getClientPreferences(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const dealId = await requireVisibleDealId(supabase, orgId, workspaceKey, input.atendimento_id);
  const { data, error } = await supabase
    .from("real_estate_lead_preferences")
    .select("*")
    .eq("org_id", orgId)
    .eq("deal_id", dealId)
    .maybeSingle();
  ensureOk(error);
  if (!data) return JSON.stringify({ tem_preferencias: false });
  return JSON.stringify({ tem_preferencias: true, preferencias: data });
}

export async function updateClientPreferences(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const dealId = await requireVisibleDealId(supabase, orgId, workspaceKey, input.atendimento_id);
  const { data: deal } = await supabase.from("deals").select("contact_id").eq("id", dealId).eq("org_id", orgId).maybeSingle();
  const contactId =
    (await visibleContactIdOrNull(supabase, orgId, workspaceKey, input.contato_id)) ?? (deal?.contact_id as string | null);
  if (!contactId) throw new Error("Este atendimento não tem contato vinculado — informe contato_id.");

  const tipoTransacao = optionalStr(input.tipo_transacao, 24);
  if (tipoTransacao && !TRANSACTION_TYPES.includes(tipoTransacao)) throw new Error(`tipo_transacao inválido: ${tipoTransacao}`);

  // Upsert parcial: só entra no patch o que a IA de fato recebeu do
  // usuário — não zera campo já preenchido antes só porque a IA não falou
  // dele nesta chamada (mesmo espírito de update_property).
  const patch: Record<string, unknown> = { org_id: orgId, contact_id: contactId, deal_id: dealId };
  if (input.tipo_transacao !== undefined) patch.transaction_type = tipoTransacao || null;
  if (input.tipos_imovel !== undefined) patch.property_types = optionalStringArray(input.tipos_imovel, PROPERTY_TYPES);
  if (input.preco_min_reais !== undefined) patch.min_price_cents = optionalCentsOrNull(input.preco_min_reais);
  if (input.preco_max_reais !== undefined) patch.max_price_cents = optionalCentsOrNull(input.preco_max_reais);
  if (input.bairros !== undefined) patch.neighborhoods = optionalStringArray(input.bairros);
  if (input.cidades !== undefined) patch.cities = optionalStringArray(input.cidades);
  if (input.quartos_min !== undefined) patch.min_bedrooms = clampInt(input.quartos_min, 0, 50, 0);
  if (input.vagas_min !== undefined) patch.min_parking_spots = clampInt(input.vagas_min, 0, 50, 0);
  if (input.area_min_m2 !== undefined) patch.min_area_m2 = Number(input.area_min_m2) || null;
  if (input.caracteristicas_obrigatorias !== undefined) patch.required_features = detailsObject(input.caracteristicas_obrigatorias);
  if (input.caracteristicas_desejadas !== undefined) patch.desired_features = detailsObject(input.caracteristicas_desejadas);
  if (input.financiamento_necessario !== undefined) patch.financing_needed = Boolean(input.financiamento_necessario);
  if (input.prazo_mudanca !== undefined) patch.move_deadline = optionalStr(input.prazo_mudanca, 10);
  if (input.observacoes !== undefined) patch.notes = optionalStr(input.observacoes, 1200);

  const { data, error } = await supabase
    .from("real_estate_lead_preferences")
    .upsert(patch, { onConflict: "deal_id" })
    .select("*")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, preferencias: data });
}

// Leitura pura — nunca grava em real_estate_deal_properties (isso é uma
// decisão explícita do corretor via UI/recalculateDealMatches, não algo
// que a IA decide sozinha).
export async function matchPropertiesForClient(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const dealId = await requireVisibleDealId(supabase, orgId, workspaceKey, input.atendimento_id);
  const { data: preferencesRow, error: prefError } = await supabase
    .from("real_estate_lead_preferences")
    .select("*")
    .eq("org_id", orgId)
    .eq("deal_id", dealId)
    .maybeSingle();
  ensureOk(prefError);
  if (!preferencesRow) return JSON.stringify({ erro: "Este atendimento ainda não tem preferências de busca definidas." });
  const preferences = preferencesRow as RealEstateLeadPreferences;

  const { data: propertyRows, error: propError } = await supabase
    .from("real_estate_properties")
    .select("*")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .in("status", MATCHABLE_STATUSES);
  ensureOk(propError);
  const properties = (propertyRows ?? []) as RealEstateProperty[];

  const limite = clampInt(input.limite, 1, 20, 5);
  const matches = properties
    .map((property) => ({ property, result: computeMatchScore(preferences, property) }))
    .filter(({ result }) => result.matchable)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, limite)
    .map(({ property, result }) => ({
      imovel_id: property.id,
      titulo: property.title,
      score: result.score,
      explicacao: result.explanation,
    }));

  return JSON.stringify({ total_avaliado: properties.length, matches });
}
