import type { SupabaseClient } from "@supabase/supabase-js";
import { computeListingQuality } from "@/lib/real-estate/real-estate-listing-quality";
import type { RealEstateProperty } from "@/lib/supabase/types";
import type { ToolInput } from "./types";
import {
  aiSuggestedFieldsObject,
  clampInt,
  ensureOk,
  optionalStr,
  requireVisiblePropertyId,
  str,
  visibleContactIdOrNull,
} from "./validation";

const PROPERTY_TYPES = ["apartamento", "casa", "cobertura", "terreno", "comercial", "sala", "galpao", "rural", "outro"];
const TRANSACTION_TYPES = ["venda", "aluguel", "venda_aluguel"];
const STATUSES = ["rascunho", "ativo", "reservado", "vendido", "alugado", "inativo"];

function optionalPropertyType(v: unknown): string | undefined {
  const value = optionalStr(v, 24);
  if (!value) return undefined;
  if (!PROPERTY_TYPES.includes(value)) throw new Error(`tipo_imovel inválido: ${value}`);
  return value;
}

function optionalTransactionType(v: unknown): string | undefined {
  const value = optionalStr(v, 24);
  if (!value) return undefined;
  if (!TRANSACTION_TYPES.includes(value)) throw new Error(`tipo_transacao inválido: ${value}`);
  return value;
}

function optionalStatus(v: unknown): string | undefined {
  const value = optionalStr(v, 24);
  if (!value) return undefined;
  if (!STATUSES.includes(value)) throw new Error(`status inválido: ${value}`);
  return value;
}

function optionalCents(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error("Valor em reais inválido.");
  return Math.round(n * 100);
}

function optionalInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error("Número inválido.");
  return n;
}

function optionalDecimal(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error("Número inválido.");
  return n;
}

async function orderedPhotoUrls(supabase: SupabaseClient, propertyId: string) {
  const { data } = await supabase
    .from("real_estate_property_media")
    .select("storage_path")
    .eq("property_id", propertyId)
    .order("position", { ascending: true });
  return (data ?? []).map((row) => supabase.storage.from("property-photos").getPublicUrl(row.storage_path as string).data.publicUrl);
}

export async function searchProperties(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const status = optionalStatus(input.status) ?? "ativo";
  let query = supabase
    .from("real_estate_properties")
    .select("id, title, property_type, transaction_type, status, price_cents, rent_price_cents, bedrooms, bathrooms, parking_spots, address_neighborhood, address_city")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(clampInt(input.limite, 1, 50, 20));

  const bairro = optionalStr(input.bairro, 120);
  if (bairro) query = query.ilike("address_neighborhood", `%${bairro}%`);
  const tipoImovel = optionalPropertyType(input.tipo_imovel);
  if (tipoImovel) query = query.eq("property_type", tipoImovel);
  const tipoTransacao = optionalTransactionType(input.tipo_transacao);
  if (tipoTransacao) query = query.eq("transaction_type", tipoTransacao);
  const precoMax = optionalCents(input.preco_max_reais);
  if (precoMax) query = query.lte("price_cents", precoMax);
  const quartosMin = optionalInt(input.quartos_min);
  if (quartosMin) query = query.gte("bedrooms", quartosMin);

  const { data, error } = await query;
  ensureOk(error);
  return JSON.stringify({ total: data?.length ?? 0, imoveis: data ?? [] });
}

export async function getProperty(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = str(input.imovel_id, "imovel_id");
  const { data: property, error } = await supabase
    .from("real_estate_properties")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error);
  if (!property) return JSON.stringify({ erro: "Imóvel não encontrado." });

  const fotos = await orderedPhotoUrls(supabase, id);
  return JSON.stringify({ imovel: property, fotos, campos_pendentes_de_confirmacao: property.ai_suggested_fields ?? {} });
}

// RE-5xx (Fase 5) — leitura pura, não escreve nada. "Gerar título/
// descrição" não é o Node fazendo geração de texto: devolve os fatos do
// imóvel bem estruturados pra quem está chamando (a própria IA na
// conversa) escrever o texto em cima, sempre grounded no dado real —
// "IA nunca inventa preço/metragem" (regra geral do plano) vale também
// pra copywriting, não só pra preencher coluna.
export async function generateListingCopy(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = str(input.imovel_id, "imovel_id");
  const { data: property, error } = await supabase
    .from("real_estate_properties")
    .select(
      "title, property_type, transaction_type, price_cents, rent_price_cents, bedrooms, bathrooms, parking_spots, area_m2, address_neighborhood, address_city, extra_features, description"
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error);
  if (!property) return JSON.stringify({ erro: "Imóvel não encontrado." });

  return JSON.stringify({
    fatos_para_copywriting: property,
    canal: optionalStr(input.canal, 40) ?? "geral",
    instrucao: "Use só estes fatos pra escrever título/descrição — nada de inventar característica, preço ou metragem que não esteja aqui.",
  });
}

// Leitura pura — mesmo cálculo de app/(app)/imoveis/quality-actions.ts
// (recalculateListingQuality), sem gravar o score nem criar tarefa. Quem
// decide recalcular/criar tarefas de verdade é o corretor, pela UI.
export async function detectListingGaps(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = str(input.imovel_id, "imovel_id");
  const { data: property, error } = await supabase
    .from("real_estate_properties")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .maybeSingle();
  ensureOk(error);
  if (!property) return JSON.stringify({ erro: "Imóvel não encontrado." });

  const { count } = await supabase.from("real_estate_property_media").select("id", { count: "exact", head: true }).eq("property_id", id);
  const result = computeListingQuality(property as RealEstateProperty, count ?? 0);
  return JSON.stringify({ score: result.score, lacunas: result.gaps });
}

export async function createProperty(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  workspaceKey: string,
  input: ToolInput
) {
  const contactId = await visibleContactIdOrNull(supabase, orgId, workspaceKey, input.contato_id);
  const { data, error } = await supabase
    .from("real_estate_properties")
    .insert({
      org_id: orgId,
      workspace_key: workspaceKey,
      created_by: userId,
      assignee_id: userId,
      title: str(input.titulo, "titulo", 180),
      property_type: (() => {
        const value = optionalPropertyType(input.tipo_imovel);
        if (!value) throw new Error("Campo obrigatório: tipo_imovel.");
        return value;
      })(),
      transaction_type: (() => {
        const value = optionalTransactionType(input.tipo_transacao);
        if (!value) throw new Error("Campo obrigatório: tipo_transacao.");
        return value;
      })(),
      status: optionalStatus(input.status) ?? "ativo",
      owner_contact_id: contactId,
      captured_by: userId,
      price_cents: optionalCents(input.preco_reais) ?? null,
      rent_price_cents: optionalCents(input.preco_aluguel_reais) ?? null,
      bedrooms: optionalInt(input.quartos) ?? null,
      bathrooms: optionalInt(input.banheiros) ?? null,
      parking_spots: optionalInt(input.vagas) ?? null,
      area_m2: optionalDecimal(input.area_m2) ?? null,
      address_neighborhood: optionalStr(input.bairro, 160),
      address_city: optionalStr(input.cidade, 160),
      address_state: optionalStr(input.uf, 2),
      description: optionalStr(input.descricao, 2000),
      // Nunca preenche coluna tipada diretamente a partir de inferência —
      // o que a IA está "achando" (não confirmando) fica pendurado aqui.
      ai_suggested_fields: aiSuggestedFieldsObject(input.sugestoes),
    })
    .select("id, title, property_type, transaction_type, status")
    .single();
  ensureOk(error);
  return JSON.stringify({ ok: true, imovel: data });
}

export async function updateProperty(supabase: SupabaseClient, orgId: string, workspaceKey: string, input: ToolInput) {
  const id = await requireVisiblePropertyId(supabase, orgId, workspaceKey, input.imovel_id);
  const patch: Record<string, unknown> = {};
  if (input.titulo !== undefined) patch.title = str(input.titulo, "titulo", 180);
  if (input.tipo_imovel !== undefined) patch.property_type = optionalPropertyType(input.tipo_imovel);
  if (input.tipo_transacao !== undefined) patch.transaction_type = optionalTransactionType(input.tipo_transacao);
  if (input.status !== undefined) patch.status = optionalStatus(input.status);
  if (input.preco_reais !== undefined) patch.price_cents = optionalCents(input.preco_reais);
  if (input.preco_aluguel_reais !== undefined) patch.rent_price_cents = optionalCents(input.preco_aluguel_reais);
  if (input.quartos !== undefined) patch.bedrooms = optionalInt(input.quartos);
  if (input.banheiros !== undefined) patch.bathrooms = optionalInt(input.banheiros);
  if (input.vagas !== undefined) patch.parking_spots = optionalInt(input.vagas);
  if (input.area_m2 !== undefined) patch.area_m2 = optionalDecimal(input.area_m2);
  if (input.bairro !== undefined) patch.address_neighborhood = optionalStr(input.bairro, 160);
  if (input.cidade !== undefined) patch.address_city = optionalStr(input.cidade, 160);
  if (input.uf !== undefined) patch.address_state = optionalStr(input.uf, 2);
  if (input.descricao !== undefined) patch.description = optionalStr(input.descricao, 2000);

  if (input.sugestoes !== undefined) {
    const { data: existing } = await supabase
      .from("real_estate_properties")
      .select("ai_suggested_fields")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    patch.ai_suggested_fields = { ...(existing?.ai_suggested_fields ?? {}), ...aiSuggestedFieldsObject(input.sugestoes) };
  }

  if (Object.keys(patch).length === 0) throw new Error("Nenhum campo para atualizar.");

  const { data, error } = await supabase
    .from("real_estate_properties")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .select("id, title, property_type, transaction_type, status")
    .maybeSingle();
  ensureOk(error);
  if (!data) throw new Error("Imóvel não encontrado.");
  return JSON.stringify({ ok: true, imovel: data });
}
