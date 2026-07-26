import { authenticateApiKey } from "@/lib/api-auth";
import { hasScope } from "@/lib/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// 2.4 (Fase 2): API pública de leitura, v1. Autenticada por chave de API
// (Authorization: Bearer <chave>), escopo "read". Sempre escopada à
// organização da própria chave — nunca aceita org_id vindo da query.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return Response.json({ error: "Chave de API inválida ou ausente." }, { status: 401 });
  }
  if (!hasScope(auth.scopes, "read")) {
    return Response.json({ error: "Esta chave não tem escopo de leitura." }, { status: 403 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("deals")
    .select("id, title, stage, value_cents, contact_id, pipeline_id, workspace_key, created_at, closed_at", {
      count: "exact",
    })
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: "Não foi possível listar os negócios." }, { status: 500 });
  }

  return Response.json({ data, pagination: { limit, offset, total: count ?? 0 } });
}
