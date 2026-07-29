import { randomUUID } from "node:crypto";
import { EvolutionApiError, sendEvolutionMedia, sendEvolutionText } from "@/lib/evolution";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Mesmo bucket/política das fotos do chat do Tim — só muda o prefixo.
const CHAT_PHOTOS_BUCKET = "deal-photos";
const IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type IncomingImage = { mediaType: string; data: string };

function sanitizeImage(raw: unknown): IncomingImage | null {
  if (!raw || typeof raw !== "object") return null;
  const mediaType = (raw as { mediaType?: unknown }).mediaType;
  const data = (raw as { data?: unknown }).data;
  if (typeof mediaType !== "string" || !ALLOWED_IMAGE_TYPES.has(mediaType)) return null;
  if (typeof data !== "string" || !data) return null;
  if ((data.length * 3) / 4 > IMAGE_MAX_BYTES) return null;
  return { mediaType, data };
}

async function uploadImage(orgId: string, userId: string, image: IncomingImage): Promise<string> {
  const extension = image.mediaType.split("/")[1] || "jpg";
  const path = `${orgId}/whatsapp/${userId}/${randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(CHAT_PHOTOS_BUCKET)
    .upload(path, Buffer.from(image.data, "base64"), { contentType: image.mediaType, upsert: false });
  if (error) throw error;
  return admin.storage.from(CHAT_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Envio manual: o usuário digita no painel, o sistema entrega via Evolution
// e grava a mensagem como enviada por "human". A gravação usa o client com
// sessão (RLS org-scoped) — só a chamada à Evolution precisa da service key
// da instância, resolvida a partir da própria organização do usuário.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  let conversationId: string;
  let text: string;
  let image: IncomingImage | null;
  try {
    const body = await request.json();
    conversationId = String(body?.conversationId ?? "");
    text = String(body?.text ?? "").trim();
    image = sanitizeImage(body?.image);
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!conversationId || (!text && !image)) {
    return Response.json({ error: "Conversa e conteúdo são obrigatórios." }, { status: 400 });
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

  let mediaUrl: string | null = null;
  if (image) {
    try {
      mediaUrl = await uploadImage(orgId, user.id, image);
    } catch (error) {
      logError("api/whatsapp/send.upload-failed", error, { orgId, conversationId });
      return Response.json({ error: "Não consegui preparar a imagem. Tente de novo." }, { status: 502 });
    }
  }

  try {
    if (mediaUrl) {
      await sendEvolutionMedia(instance.instance_name, conversation.phone_number, mediaUrl, text || undefined);
    } else {
      await sendEvolutionText(instance.instance_name, conversation.phone_number, text);
    }
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
      message_type: mediaUrl ? "image" : "text",
      content: text || null,
      media_url: mediaUrl,
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
