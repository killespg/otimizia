import { authenticateApiKey } from "@/lib/api-auth";
import { hasScope } from "@/lib/api-keys";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// 2.4 (Fase 2): API pública de leitura, v1 — ver app/api/v1/deals/route.ts
// para o racional de autenticação/paginação, idêntico aqui.
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
    .from("contacts")
    .select("id, name, phone, email, company, source, workspace_key, created_at", { count: "exact" })
    .eq("org_id", auth.orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: "Não foi possível listar os contatos." }, { status: 500 });
  }

  return Response.json({ data, pagination: { limit, offset, total: count ?? 0 } });
}
