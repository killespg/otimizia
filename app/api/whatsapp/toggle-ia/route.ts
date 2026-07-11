import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let conversationId: string;
  let iaActive: boolean;
  try {
    const body = await request.json();
    conversationId = String(body?.conversationId ?? "");
    iaActive = Boolean(body?.iaActive);
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!conversationId) {
    return Response.json({ error: "Conversa é obrigatória." }, { status: 400 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);

  const { data, error } = await supabase
    .from("whatsapp_conversations")
    .update({ ia_active: iaActive })
    .eq("id", conversationId)
    .eq("org_id", orgId)
    .select("id, ia_active")
    .maybeSingle();

  if (error || !data) {
    return Response.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  return Response.json({ conversation: data });
}
