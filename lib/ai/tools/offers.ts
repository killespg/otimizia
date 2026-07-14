import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolInput } from "./types";
import { ensureOk, optionalStr, requireVisibleContactId, requireVisiblePropertyId, str } from "./validation";

function requiredCents(v: unknown, field: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${field} inválido.`);
  return Math.round(n * 100);
}

function optionalCents(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error("Valor em reais inválido.");
  return Math.round(n * 100);
}

// RE-4xx (Fase 4) — equivalente por IA de createOffer
// (app/(app)/imoveis/offer-actions.ts). Sempre nasce 'draft': a IA nunca
// envia uma proposta pro cliente sozinha, quem decide enviar é o corretor
// (ver sendOffer na UI) — regra geral de "IA nunca marca proposta como
// aceita/enviada sem ação explícita do usuário".
export async function createRealEstateOffer(supabase: SupabaseClient, userId: string, orgId: string, workspaceKey: string, input: ToolInput) {
  const propertyId = await requireVisiblePropertyId(supabase, orgId, workspaceKey, input.imovel_id);
  const contactId = await requireVisibleContactId(supabase, orgId, workspaceKey, input.contato_id);
  const dealId = str(input.atendimento_id, "atendimento_id");
  const { data: deal } = await supabase.from("deals").select("id").eq("id", dealId).eq("org_id", orgId).eq("workspace_key", workspaceKey).maybeSingle();
  if (!deal) throw new Error("Atendimento não encontrado.");

  const expiresAt = optionalStr(input.valida_ate, 10);

  const { data, error } = await supabase
    .from("real_estate_offers")
    .insert({
      org_id: orgId,
      contact_id: contactId,
      deal_id: dealId,
      property_id: propertyId,
      created_by: userId,
      status: "draft",
      amount_cents: requiredCents(input.valor_reais, "valor_reais"),
      down_payment_cents: optionalCents(input.entrada_reais),
      financing_amount_cents: optionalCents(input.valor_financiado_reais),
      payment_terms: optionalStr(input.condicoes_pagamento, 500),
      conditions: optionalStr(input.condicoes, 1200),
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })
    .select("id, amount_cents, status")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, proposta: data });
}
