import { canViewLegal } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { DatajudApiError, searchDatajudProcess } from "@/lib/datajud";
import { DATAJUD_TRIBUNAL_ALIASES } from "@/lib/datajud-tribunals";
import { getWorkspaceKey } from "@/lib/workspaces";
import { logError } from "@/lib/logger";
import { trackWatchedProcess } from "@/lib/law-watched-processes";

export const runtime = "nodejs";

// Consulta avulsa — não vincula a nenhum caso, mas registra o processo na
// lista de acompanhamento (legal_watched_processes) na primeira vez que é
// pesquisado, pra alimentar o cartão "Mudanças recentes" no painel.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [{ data: profile }, orgId] = await Promise.all([
    supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle(),
    getActiveOrgId(supabase, user.id),
  ]);
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin);
  if (workspaceKey !== "law_office") {
    return Response.json({ error: "Disponível apenas no workspace de advocacia." }, { status: 403 });
  }
  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!canViewLegal(membership?.job_role, orgRole === "admin")) {
    return Response.json({ error: "Seu cargo não acessa a área jurídica." }, { status: 403 });
  }

  let tribunalAlias: string;
  let numeroProcesso: string;
  try {
    const body = await request.json();
    tribunalAlias = String(body?.tribunalAlias ?? "");
    numeroProcesso = String(body?.numeroProcesso ?? "");
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!DATAJUD_TRIBUNAL_ALIASES.has(tribunalAlias)) {
    return Response.json({ error: "Tribunal inválido." }, { status: 400 });
  }

  try {
    const process = await searchDatajudProcess(tribunalAlias, numeroProcesso);
    if (!process) {
      return Response.json({ error: "Processo não encontrado nesse tribunal." }, { status: 404 });
    }
    try {
      await trackWatchedProcess(supabase, orgId, user.id, tribunalAlias, numeroProcesso, process);
    } catch (trackError) {
      // Nunca deixa o rastreamento (extra) derrubar a resposta da busca em si.
      logError("api/law/datajud-search.track-failed", trackError, { orgId, tribunalAlias });
    }
    return Response.json({ process });
  } catch (error) {
    const message = error instanceof DatajudApiError ? error.message : "Falha ao consultar o DataJud.";
    return Response.json({ error: message }, { status: 502 });
  }
}
