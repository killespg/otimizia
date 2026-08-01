import { randomUUID } from "node:crypto";
import { EvolutionApiError, sendEvolutionMedia, sendEvolutionText } from "@/lib/whatsapp/evolution";
import { logError } from "@/lib/utils/logger";
import { getActiveOrgId } from "@/lib/workspace/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  extensionForImageType,
  WHATSAPP_ATTACHMENTS_BUCKET,
  whatsappAttachmentExpiresAt,
  whatsappAttachmentUrl,
} from "@/lib/whatsapp/whatsapp-attachments";

export const runtime = "nodejs";

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

async function uploadImage(
  orgId: string,
  messageId: string,
  image: IncomingImage,
): Promise<string> {
  const extension = extensionForImageType(image.mediaType);
  const path = `${orgId}/${messageId}/${randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(WHATSAPP_ATTACHMENTS_BUCKET)
    .upload(path, Buffer.from(image.data, "base64"), { contentType: image.mediaType, upsert: false });
  if (error) throw error;
  return path;
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

  const messageId = randomUUID();
  let mediaStoragePath: string | null = null;
  if (image) {
    try {
      mediaStoragePath = await uploadImage(orgId, messageId, image);
    } catch (error) {
      logError("api/whatsapp/send.upload-failed", error, { orgId, conversationId });
      return Response.json({ error: "Não consegui preparar a imagem. Tente de novo." }, { status: 502 });
    }
  }

  try {
    if (image) {
      await sendEvolutionMedia(
        instance.instance_name,
        conversation.phone_number,
        image.data,
        text || undefined,
      );
    } else {
      await sendEvolutionText(instance.instance_name, conversation.phone_number, text);
    }
  } catch (error) {
    if (mediaStoragePath) {
      await createAdminClient().storage
        .from(WHATSAPP_ATTACHMENTS_BUCKET)
        .remove([mediaStoragePath]);
    }
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
      id: messageId,
      conversation_id: conversationId,
      org_id: orgId,
      direction: "outbound",
      message_type: image ? "image" : "text",
      content: text || null,
      media_url: image ? whatsappAttachmentUrl(messageId) : null,
      sent_by: "human",
    })
    .select("*")
    .single();
  if (insertError) {
    if (mediaStoragePath) {
      await createAdminClient().storage
        .from(WHATSAPP_ATTACHMENTS_BUCKET)
        .remove([mediaStoragePath]);
    }
    logError("api/whatsapp/send.persist-failed", insertError, { orgId, conversationId });
    // A mensagem já foi entregue pelo WhatsApp — não falha a requisição por
    // causa do registro, só avisa que o histórico pode ficar incompleto.
    return Response.json({ warning: "Mensagem enviada, mas houve falha ao salvar no histórico." });
  }

  if (image && mediaStoragePath) {
    const admin = createAdminClient();
    const { error: attachmentError } = await admin
      .from("whatsapp_attachments")
      .insert({
        message_id: messageId,
        org_id: orgId,
        storage_path: mediaStoragePath,
        media_type: image.mediaType,
        expires_at: whatsappAttachmentExpiresAt().toISOString(),
      });
    if (attachmentError) {
      await admin.storage
        .from(WHATSAPP_ATTACHMENTS_BUCKET)
        .remove([mediaStoragePath]);
      await admin
        .from("whatsapp_messages")
        .update({ media_url: null })
        .eq("id", messageId)
        .eq("org_id", orgId);
      saved.media_url = null;
      logError("api/whatsapp/send.attachment-persist-failed", attachmentError, {
        orgId,
        conversationId,
      });
    }
  }

  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return Response.json({ message: saved });
}
