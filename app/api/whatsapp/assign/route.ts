import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// 2.2 (Fase 2): atribuição manual de conversa no inbox comercial. Qualquer
// membro da organização pode se atribuir ou repassar pra outro membro —
// mesmo modelo de acesso de whatsapp_conversations hoje (RLS "all org",
// sem distinção por job_role, documentado em 0.3).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let conversationId: string;
  let assigneeId: string | null;
  try {
    const body = await request.json();
    conversationId = String(body?.conversationId ?? "");
    assigneeId = body?.assigneeId ? String(body.assigneeId) : null;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!conversationId) {
    return Response.json({ error: "Conversa é obrigatória." }, { status: 400 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);

  if (assigneeId) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("user_id", assigneeId)
      .maybeSingle();
    if (!member) {
      return Response.json({ error: "Esse usuário não é membro da organização." }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ assignee_id: assigneeId })
    .eq("id", conversationId)
    .eq("org_id", orgId);
  if (error) {
    return Response.json({ error: "Não deu para atribuir a conversa." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
