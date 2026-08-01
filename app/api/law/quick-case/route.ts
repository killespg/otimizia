import { canManageLegal } from "@/lib/law/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import { DATAJUD_TRIBUNAL_ALIASES } from "@/lib/law/datajud-tribunals";
import { normalizeProcessNumber } from "@/lib/law/datajud";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

export const runtime = "nodejs";

// Cria um caso já vinculado ao processo, direto do resultado de uma busca —
// sem precisar preencher o formulário completo de "Abrir novo caso".
export async function POST(request: Request) {
  const supabase = await createClient();
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
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin ?? false);
  if (workspaceKey !== "law_office") {
    return Response.json({ error: "Disponível apenas no workspace de advocacia." }, { status: 403 });
  }
  const [orgRole, { data: membership }] = await Promise.all([
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!canManageLegal(membership?.job_role, orgRole === "admin")) {
    return Response.json({ error: "Seu cargo não pode abrir casos." }, { status: 403 });
  }

  let tribunalAlias: string;
  let numeroProcesso: string;
  let title: string;
  try {
    const body = await request.json();
    tribunalAlias = String(body?.tribunalAlias ?? "");
    numeroProcesso = normalizeProcessNumber(String(body?.numeroProcesso ?? ""));
    title = String(body?.title ?? "").trim().slice(0, 180);
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!DATAJUD_TRIBUNAL_ALIASES.has(tribunalAlias)) {
    return Response.json({ error: "Tribunal inválido." }, { status: 400 });
  }
  if (numeroProcesso.length !== 20) {
    return Response.json({ error: "Número de processo inválido." }, { status: 400 });
  }
  if (!title) {
    title = `Processo ${numeroProcesso}`;
  }

  const { data: created, error } = await supabase
    .from("legal_cases")
    .insert({
      org_id: orgId,
      workspace_key: "law_office",
      responsible_id: user.id,
      created_by: user.id,
      title,
      case_number: numeroProcesso,
      datajud_tribunal_alias: tribunalAlias,
      status: "intake",
      risk_level: "standard",
      confidentiality: "restricted",
    })
    .select("id")
    .single();
  if (error || !created) {
    return Response.json({ error: "Não foi possível criar o caso." }, { status: 500 });
  }

  // Se esse processo já estava na lista de acompanhamento (foi pesquisado
  // antes), vincula ao caso recém-criado em vez de deixar órfão.
  await supabase
    .from("legal_watched_processes")
    .update({ case_id: created.id })
    .eq("org_id", orgId)
    .eq("tribunal_alias", tribunalAlias)
    .eq("case_number", numeroProcesso);

  return Response.json({ caseId: created.id });
}
