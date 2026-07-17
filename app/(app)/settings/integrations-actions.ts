"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-keys";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { generateWebhookSecret } from "@/lib/webhooks";

const EVENT_TYPES = ["deal.created", "deal.stage_changed"] as const;

async function requireOrgAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const role = await getOrgRole(supabase, orgId, user.id);
  if (role !== "admin") throw new Error("Só administradores da organização gerenciam integrações.");
  return { supabase, orgId, userId: user.id };
}

// 2.4 (Fase 2): a chave crua só existe nesta resposta — devolvida via
// fragmento da URL (#new_key=...), que o navegador nunca envia ao
// servidor (não fica em log de acesso, diferente de um query param).
// Ainda fica no histórico do navegador — trade-off de MVP documentado em
// docs/roadmap-imobiliario/2.4-webhooks-api-publica.md.
export async function createApiKey(formData: FormData) {
  const { supabase, orgId, userId } = await requireOrgAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120) || "Chave sem nome";
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    org_id: orgId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes: ["read"],
    created_by: userId,
  });
  if (error) throw new Error("Não deu para criar a chave de API.");

  revalidatePath("/settings/integracoes");
  redirect(`/settings/integracoes#new_key=${rawKey}`);
}

export async function revokeApiKey(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const id = String(formData.get("id") ?? "");
  await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("org_id", orgId);
  revalidatePath("/settings/integracoes");
}

export async function createWebhookEndpoint(formData: FormData) {
  const { supabase, orgId, userId } = await requireOrgAdmin();
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https:\/\//.test(url)) throw new Error("A URL do webhook precisa começar com https://.");
  const eventTypes = EVENT_TYPES.filter((type) => formData.get(`event_${type}`) === "on");
  if (eventTypes.length === 0) throw new Error("Selecione ao menos um tipo de evento.");

  const secret = generateWebhookSecret();
  const { error } = await supabase.from("webhook_endpoints").insert({
    org_id: orgId,
    url,
    secret,
    event_types: eventTypes,
    created_by: userId,
  });
  if (error) throw new Error("Não deu para criar o webhook.");

  revalidatePath("/settings/integracoes");
  redirect(`/settings/integracoes#new_secret=${secret}`);
}

export async function toggleWebhookEndpoint(formData: FormData) {
  const { supabase, orgId } = await requireOrgAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  await supabase.from("webhook_endpoints").update({ active }).eq("id", id).eq("org_id", orgId);
  revalidatePath("/settings/integracoes");
}
