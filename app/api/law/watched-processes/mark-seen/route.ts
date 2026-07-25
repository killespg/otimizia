import { canViewLegal, hasLegalWorkspace } from "@/lib/law-office";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const [orgRole, { data: membership }, { data: profile }] = await Promise.all([
    getOrgRole(supabase, orgId, user.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("is_admin,profession_type,profession_types").eq("id", user.id).maybeSingle(),
  ]);
  // Faltava o primeiro fator aqui: canViewLegal sozinho libera qualquer admin de
  // organização, e todo cliente é admin da própria. Mesma regra do layout de
  // /painel/juridico e da rota do DataJud.
  if (!profile || !hasLegalWorkspace(profile)) {
    return Response.json({ error: "Disponível apenas no workspace de advocacia." }, { status: 403 });
  }
  if (!canViewLegal(membership?.job_role, orgRole === "admin")) {
    return Response.json({ error: "Seu cargo não acessa a área jurídica." }, { status: 403 });
  }

  let id: string;
  try {
    const body = await request.json();
    id = String(body?.id ?? "");
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!id) {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { error } = await supabase
    .from("legal_watched_processes")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) {
    return Response.json({ error: "Não foi possível marcar como visto." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
