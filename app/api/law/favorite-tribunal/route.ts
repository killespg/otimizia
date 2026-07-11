import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { DATAJUD_TRIBUNAL_ALIASES } from "@/lib/datajud-tribunals";
import { getWorkspaceKey } from "@/lib/workspaces";

export const runtime = "nodejs";

// Alterna um tribunal na lista de favoritos do usuário (não é por
// organização — cada advogado pode atuar em estados diferentes).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, is_admin, favorite_tribunals")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin ?? false);
  if (workspaceKey !== "law_office") {
    return Response.json({ error: "Disponível apenas no workspace de advocacia." }, { status: 403 });
  }
  await getActiveOrgId(supabase, user.id);

  let tribunalAlias: string;
  try {
    const body = await request.json();
    tribunalAlias = String(body?.tribunalAlias ?? "");
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!DATAJUD_TRIBUNAL_ALIASES.has(tribunalAlias)) {
    return Response.json({ error: "Tribunal inválido." }, { status: 400 });
  }

  const current: string[] = profile?.favorite_tribunals ?? [];
  const isFavorite = current.includes(tribunalAlias);
  const next = isFavorite ? current.filter((alias) => alias !== tribunalAlias) : [...current, tribunalAlias];

  const { error } = await supabase.from("profiles").update({ favorite_tribunals: next }).eq("id", user.id);
  if (error) {
    return Response.json({ error: "Não foi possível salvar o favorito." }, { status: 500 });
  }

  return Response.json({ favoriteTribunals: next });
}
