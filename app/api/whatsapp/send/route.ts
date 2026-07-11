import { EvolutionApiError, sendEvolutionText } from "@/lib/evolution";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Envio manual: o usuário digita no painel, o sistema entrega via Evolution
// e grava a mensagem como enviada por "human". A gravação usa o client com
// sessão (RLS org-scoped) — só a chamada à Evolution precisa da service key
// da instância, resolvida a partir da própria organização do usuário.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let conversationId: string;
  let text: string;
  try {
    const body = await request.json();
    conversationId = String(body?.conversationId ?? "");
    text = String(body?.text ?? "").trim();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!conversationId || !text) {
    return Response.json({ error: "Conversa e texto são obrigatórios." }, { status: 400 });
  }
  if (text.length > 4000) {
    return Response.json({ error: "Mensagem muito longa." }, { status: 400 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);

  const [{ data: conversation }, { data: instance }] = await Promise.all([
    supabase
      .from("whatsapp_conversations")
      .select("id, phone_number, org_id")
      .eq("id", conversationId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("whatsapp_instances")
      .select("instance_name, status")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  if (!conversation) {
    return Response.json({ error: "Conversa não encontrada." }, { status: 404 });
  }
  if (!instance || instance.status !== "conectado") {
    return Response.json({ error: "WhatsApp não está conectado." }, { status: 409 });
  }

  try {
    await sendEvolutionText(instance.instance_name, conversation.phone_number, text);
  } catch (error) {
    logError("api/whatsapp/send", error, { orgId, conversationId });
    const message =
      error instanceof EvolutionApiError
        ? error.message
        : "Não consegui enviar a mensagem agora. Tente de novo.";
    return Response.json({ error: message }, { status: 502 });
  }

  const { data: saved, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversationId,
      org_id: orgId,
      direction: "outbound",
      message_type: "text",
      content: text,
      sent_by: "human",
    })
    .select("*")
    .single();
  if (insertError) {
    logError("api/whatsapp/send.persist-failed", insertError, { orgId, conversationId });
    // A mensagem já foi entregue pelo WhatsApp — não falha a requisição por
    // causa do registro, só avisa que o histórico pode ficar incompleto.
    return Response.json({ warning: "Mensagem enviada, mas houve falha ao salvar no histórico." });
  }

  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return Response.json({ message: saved });
}
