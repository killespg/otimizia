import { hashApiKey } from "@/lib/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApiKeyContext = { orgId: string; scopes: string[]; keyId: string };

// 2.4 (Fase 2): autenticação da API pública de leitura. Usa o admin client
// porque a chave de API não é uma sessão de usuário — é a organização
// inteira se autenticando, e a policy de api_keys (0074) só permite select
// pra admin autenticado via sessão, não pra este fluxo.
export async function authenticateApiKey(request: Request): Promise<ApiKeyContext | null> {
  const authHeader = request.headers.get("authorization");
  const rawKey = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!rawKey) return null;

  const admin = createAdminClient();
  const { data: key } = await admin
    .from("api_keys")
    .select("id, org_id, scopes, revoked_at")
    .eq("key_hash", hashApiKey(rawKey))
    .maybeSingle();
  if (!key || key.revoked_at) return null;

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  return { orgId: key.org_id as string, scopes: key.scopes as string[], keyId: key.id as string };
}
