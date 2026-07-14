import { logError } from "@/lib/logger";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { type FilterChatTurn, parsePropertyFilters } from "@/lib/ai/property-filter-chat";
import { canViewRealEstate } from "@/lib/real-estate";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspaces";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_MESSAGE_CHARS = 300;
const MAX_HISTORY_TURNS = 8;

function sanitizeHistory(raw: unknown): FilterChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: FilterChatTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) continue;
    turns.push({ role, content: text });
  }
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();
  return turns;
}

// Só interpreta texto e devolve filtros estruturados — nunca lê nem grava
// nada no banco (ver lib/ai/property-filter-chat.ts), então não precisa da
// checagem de real_estate_v2_enabled: os campos de filtro que ele preenche
// já são os mesmos que o formulário manual desta página sempre aceitou.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const access = await getUserPlanAccess(supabase, user.id);
  if (!access.hasAccess) {
    return Response.json({ error: "Seu teste grátis acabou." }, { status: 402 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const [{ data: profile }, orgRole, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle(),
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin ?? false);
  if (workspaceKey !== "real_estate_broker") {
    return Response.json({ error: "Recurso disponível só no workspace imobiliário." }, { status: 403 });
  }
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin)) {
    return Response.json({ error: "Sua função não acessa a carteira de imóveis." }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY não configurada no servidor." }, { status: 500 });
  }

  let history: FilterChatTurn[];
  try {
    const body = await req.json();
    history = sanitizeHistory(body?.history);
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Escreva o que você procura." }, { status: 400 });
  }

  try {
    const parsed = await parsePropertyFilters(history);
    if (!parsed) {
      return Response.json({ error: "Não consegui interpretar agora. Tenta de novo." }, { status: 502 });
    }
    return Response.json(parsed);
  } catch (error) {
    logError("api/imoveis/parse-filters", error, { userId: user.id, orgId });
    return Response.json({ error: "Algo deu errado ao interpretar sua busca." }, { status: 500 });
  }
}
