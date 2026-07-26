"use server";

import { revalidatePath } from "next/cache";
import { decimalOrNull, intOrNull, keyValueListOrEmpty, moneyToCentsOrNull, requiredText, stringListOrEmpty, text } from "@/lib/form-parse";
import { computeMatchScore } from "@/lib/real-estate-match";
import { combineWithBehavior, type DealPropertyHistoryEntry } from "@/lib/real-estate-match-v2";
import type { RealEstateDealPropertyStatus, RealEstateLeadPreferences, RealEstateProperty } from "@/lib/supabase/types";
import { requireRealEstate } from "./actions";

const PROPERTY_TYPES = ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"];
const TRANSACTION_TYPES = ["venda", "aluguel", "venda_aluguel"];
// Status ainda "no jogo" pra fins de match — vendido/alugado/inativo não
// fazem sentido sugerir pra um cliente novo.
const MATCHABLE_STATUSES = ["ativo", "reservado"];

function optionalTransactionType(v: FormDataEntryValue | null): string | null {
  const value = text(v, 24);
  return TRANSACTION_TYPES.includes(value) ? value : null;
}

// RE-1xx (Fase 1): uma preferência por atendimento (deal_id), upsert pelo
// índice único parcial de 0058. contact_id é sempre o dono da preferência,
// mesmo que ela seja editada de novo depois.
export async function saveLeadPreferences(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const dealId = requiredText(formData.get("deal_id"), "Atendimento", 80);
  const contactId = requiredText(formData.get("contact_id"), "Contato", 80);

  const propertyTypes = formData.getAll("property_types").map(String).filter((v) => PROPERTY_TYPES.includes(v));

  const { error } = await supabase.from("real_estate_lead_preferences").upsert(
    {
      org_id: orgId,
      contact_id: contactId,
      deal_id: dealId,
      transaction_type: optionalTransactionType(formData.get("transaction_type")),
      property_types: propertyTypes,
      min_price_cents: moneyToCentsOrNull(formData.get("min_price")),
      max_price_cents: moneyToCentsOrNull(formData.get("max_price")),
      neighborhoods: stringListOrEmpty(formData.get("neighborhoods")),
      cities: stringListOrEmpty(formData.get("cities")),
      min_bedrooms: intOrNull(formData.get("min_bedrooms")),
      min_bathrooms: intOrNull(formData.get("min_bathrooms")),
      min_parking_spots: intOrNull(formData.get("min_parking_spots")),
      min_area_m2: decimalOrNull(formData.get("min_area_m2")),
      required_features: keyValueListOrEmpty(formData.get("required_features")),
      desired_features: keyValueListOrEmpty(formData.get("desired_features")),
      financing_needed: formData.get("financing_needed") === "on",
      move_deadline: text(formData.get("move_deadline"), 10) || null,
      notes: text(formData.get("notes"), 1200) || null,
    },
    { onConflict: "deal_id" }
  );
  if (error) throw new Error("Não foi possível salvar as preferências do cliente.");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath(`/imoveis/match/${dealId}`);
}

// Recalcula o score de todos os imóveis "no jogo" contra a preferência do
// atendimento e grava em real_estate_deal_properties. Só atualiza
// match_score/match_explanation nas linhas que já existem (status e
// histórico da jornada do imóvel dentro do atendimento continuam
// intactos) — status só some do payload de upsert quando a linha é nova,
// aí cai no default 'suggested' da coluna (0058).
export async function recalculateDealMatches(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const dealId = requiredText(formData.get("deal_id"), "Atendimento", 80);

  const { data: preferencesRow } = await supabase
    .from("real_estate_lead_preferences")
    .select("*")
    .eq("org_id", orgId)
    .eq("deal_id", dealId)
    .maybeSingle();
  if (!preferencesRow) throw new Error("Defina as preferências do cliente antes de calcular matches.");
  const preferences = preferencesRow as RealEstateLeadPreferences;

  const { data: propertyRows } = await supabase
    .from("real_estate_properties")
    .select("*")
    .eq("org_id", orgId)
    .eq("workspace_key", "real_estate_broker")
    .in("status", MATCHABLE_STATUSES);
  const properties = (propertyRows ?? []) as RealEstateProperty[];

  // 4.1 (Fase 4): histórico deste mesmo atendimento com outros imóveis —
  // é o sinal de comportamento que o matching v2 usa pra ajustar o score
  // determinístico do v1 (lib/real-estate-match-v2.ts). Só o próprio
  // histórico do negócio, não de outros clientes — nada de aprendizado
  // cruzado entre contas nesta versão.
  const propertyById = new Map(properties.map((p) => [p.id, p]));
  const { data: dealHistoryRows } = await supabase
    .from("real_estate_deal_properties")
    .select("property_id, status")
    .eq("org_id", orgId)
    .eq("deal_id", dealId);
  const dealHistory: DealPropertyHistoryEntry[] = (dealHistoryRows ?? [])
    .map((row) => {
      const property = propertyById.get(row.property_id as string);
      if (!property) return null;
      return {
        status: row.status as RealEstateDealPropertyStatus,
        propertyType: property.property_type,
        neighborhood: property.address_neighborhood,
      };
    })
    .filter((entry): entry is DealPropertyHistoryEntry => entry !== null);

  const matches = properties
    .map((property) => {
      const base = computeMatchScore(preferences, property);
      if (!base.matchable) return { property, result: base };
      const hybrid = combineWithBehavior(base, dealHistory, {
        propertyType: property.property_type,
        neighborhood: property.address_neighborhood,
      });
      return { property, result: { ...base, score: hybrid.score, explanation: hybrid.explanation } };
    })
    .filter(({ result }) => result.matchable);

  if (matches.length > 0) {
    const { error } = await supabase.from("real_estate_deal_properties").upsert(
      matches.map(({ property, result }) => ({
        org_id: orgId,
        deal_id: dealId,
        property_id: property.id,
        match_score: result.score,
        match_explanation: result.explanation,
      })),
      { onConflict: "deal_id,property_id" }
    );
    if (error) throw new Error("Não foi possível calcular os matches.");
  }
  revalidatePath(`/imoveis/match/${dealId}`);
}

const DEAL_PROPERTY_STATUSES: RealEstateDealPropertyStatus[] = [
  "suggested", "selected", "sent", "viewed", "interested", "rejected", "visit_scheduled", "offer", "won",
];

// "Permitir revisar/selecionar/ignorar" (RE-1xx) — atualização simples de
// status; sent_at/viewed_at/reaction ficam pra Fase 2 (fluxo de vitrine
// conectado ao atendimento), aqui é só a decisão do corretor.
export async function updateDealPropertyStatus(formData: FormData) {
  const { supabase, orgId } = await requireRealEstate();
  const dealId = requiredText(formData.get("deal_id"), "Atendimento", 80);
  const propertyId = requiredText(formData.get("property_id"), "Imóvel", 80);
  const status = text(formData.get("status"), 24);
  if (!DEAL_PROPERTY_STATUSES.includes(status as RealEstateDealPropertyStatus)) throw new Error("Status inválido.");
  const rejectedReason = text(formData.get("rejected_reason"), 500) || null;

  const { error } = await supabase
    .from("real_estate_deal_properties")
    .update({ status, rejected_reason: status === "rejected" ? rejectedReason : null })
    .eq("org_id", orgId)
    .eq("deal_id", dealId)
    .eq("property_id", propertyId);
  if (error) throw new Error("Não foi possível atualizar o status do imóvel neste atendimento.");
  revalidatePath(`/imoveis/match/${dealId}`);
}
