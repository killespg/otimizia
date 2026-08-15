import { randomUUID } from "node:crypto";
import {
  EvolutionApiError,
  fetchEvolutionMediaBase64,
  fetchEvolutionProfilePicture,
  sendEvolutionText,
} from "@/lib/whatsapp/evolution";
import { fetchWhatsappHistory, generateWhatsappReply } from "@/lib/ai/whatsapp-reply";
import { detectPurchaseIntent } from "@/lib/ai/whatsapp-intent";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { logError } from "@/lib/utils/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDealIfNeeded, findOrCreateContact } from "@/lib/whatsapp/whatsapp-contacts";
import { isOptOutKeyword, markWhatsappOptOut, OPT_OUT_CONFIRMATION_TEXT } from "@/lib/whatsapp/whatsapp-opt-out";
import { extractInboundMedia, extractMessageText, resolveWhatsappPhone } from "@/lib/whatsapp/whatsapp-jid";
import { verifyEvolutionWebhookAuthorization } from "@/lib/whatsapp/evolution-webhook";
import {
  extensionForMediaType,
  WHATSAPP_ATTACHMENTS_BUCKET,
  whatsappAttachmentExpiresAt,
  whatsappAttachmentUrl,
} from "@/lib/whatsapp/whatsapp-attachments";
import type { WhatsappMessageType } from "@/lib/supabase/types";

export const runtime = "nodejs";
const MAX_WEBHOOK_BYTES = 1_000_000;

type EvolutionWebhookPayload = {
  event?: unknown;
  instance?: unknown;
  data?: {
    key?: {
      id?: unknown;
      fromMe?: unknown;
      remoteJid?: unknown;
      remoteJidAlt?: unknown;
    };
    pushName?: unknown;
    message?: unknown;
  };
};

// Webhook da Evolution API (sem sessão de usuário — sempre createAdminClient).
// Evento tratado: messages.upsert (mensagem recebida). Demais eventos
// (connection.update, etc.) só são confirmados, sem processamento.
export async function POST(request: Request) {
  if (!verifyEvolutionWebhookAuthorization(request.headers.get("authorization"))) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Payload muito grande." }, { status: 413 });
  }

  let body: EvolutionWebhookPayload;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
      return Response.json({ error: "Payload muito grande." }, { status: 413 });
    }
    body = JSON.parse(rawBody) as EvolutionWebhookPayload;
  } catch (error) {
    logError("api/whatsapp/webhook.invalid-json", error);
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const eventType = String(body?.event ?? "").toLowerCase();
  if (eventType !== "messages.upsert") {
    return Response.json({ received: true });
  }

  const data = body?.data;
  const messageId = typeof data?.key?.id === "string" ? data.key.id : "";
  const instanceName = typeof body.instance === "string" ? body.instance : "";
  if (!messageId || !instanceName) {
    return Response.json({ received: true });
  }

  const admin = createAdminClient();

  // Dedupe: a Evolution pode reentregar o mesmo evento em retry.
  const { error: dedupeError } = await admin
    .from("whatsapp_webhook_events")
    .insert({ event_id: messageId, event_type: eventType });
  if (dedupeError) {
    if (dedupeError.code === "23505") {
      return Response.json({ received: true });
    }
    logError("api/whatsapp/webhook.dedupe-failed", dedupeError, { messageId });
    return Response.json({ received: true });
  }

  // Mensagens enviadas pelo próprio número (fromMe) já são gravadas
  // diretamente por /api/whatsapp/send ou pela resposta automática abaixo —
  // processar de novo aqui duplicaria a mensagem no histórico.
  if (data?.key?.fromMe === true) {
    return Response.json({ received: true });
  }

  const remoteJid =
    typeof data?.key?.remoteJid === "string" ? data.key.remoteJid : null;
  const remoteJidAlt =
    typeof data?.key?.remoteJidAlt === "string" ? data.key.remoteJidAlt : null;
  const phoneNumber = resolveWhatsappPhone(remoteJid, remoteJidAlt);
  if (!phoneNumber) {
    // Grupo, ou @lid sem remoteJidAlt resolvível — fora de escopo do MVP.
    return Response.json({ received: true });
  }
  const pushName = typeof data?.pushName === "string" ? data.pushName : null;

  const conversationText = extractMessageText(data?.message);
  const inboundMedia = conversationText ? null : extractInboundMedia(data?.message);
  const dbMessageId = randomUUID();

  try {
    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("org_id")
      .eq("instance_name", instanceName)
      .maybeSingle();
    if (!instance) {
      logError("api/whatsapp/webhook.unknown-instance", new Error("instância não encontrada"), {
        instanceName,
      });
      return Response.json({ received: true });
    }
    const orgId = instance.org_id as string;

    // Mídia é resolvida antes do resto do fluxo: se a Evolution não
    // devolver o base64 ou o storage falhar, cai em "unsupported" igual a
    // hoje — nunca deve travar o webhook por causa de um anexo.
    let messageType: WhatsappMessageType = conversationText ? "text" : "unsupported";
    let content: string | null = conversationText ?? "[mensagem de mídia — ainda não suportada]";
    let mediaUrl: string | null = null;
    let pendingAttachment: { storagePath: string; mediaType: string } | null = null;

    if (inboundMedia) {
      try {
        const base64 = await fetchEvolutionMediaBase64(instanceName, data?.key, data?.message);
        if (base64) {
          const extension = extensionForMediaType(inboundMedia.mimetype);
          const storagePath = `${orgId}/${dbMessageId}/${randomUUID()}.${extension}`;
          const { error: uploadError } = await admin.storage
            .from(WHATSAPP_ATTACHMENTS_BUCKET)
            .upload(storagePath, Buffer.from(base64, "base64"), {
              contentType: inboundMedia.mimetype,
              upsert: false,
            });
          if (!uploadError) {
            messageType = inboundMedia.kind;
            content = inboundMedia.caption;
            mediaUrl = whatsappAttachmentUrl(dbMessageId);
            pendingAttachment = { storagePath, mediaType: inboundMedia.mimetype };
          } else {
            logError("api/whatsapp/webhook.media-upload-failed", uploadError, { orgId, instanceName });
          }
        }
      } catch (error) {
        logError("api/whatsapp/webhook.media-fetch-failed", error, { orgId, instanceName });
      }
    }

    const { data: existingConversation } = await admin
      .from("whatsapp_conversations")
      .select("id, ia_active, contact_name, contact_id, profile_pic_url")
      .eq("org_id", orgId)
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    let conversationId: string;
    let iaActive: boolean;
    let contactId: string | null;

    if (existingConversation) {
      conversationId = existingConversation.id as string;
      iaActive = existingConversation.ia_active as boolean;
      contactId = existingConversation.contact_id as string | null;
      const updatePayload: Record<string, unknown> = {
        last_message_at: new Date().toISOString(),
        contact_name: existingConversation.contact_name ?? pushName,
      };
      // Conversa criada antes dessa foto existir, ou a primeira busca não
      // achou nada (contato ainda sem foto na época): tenta de novo a cada
      // mensagem nova até achar, sem custo extra depois que já tem uma.
      if (!existingConversation.profile_pic_url) {
        const profilePicUrl = await fetchEvolutionProfilePicture(instanceName, phoneNumber);
        if (profilePicUrl) updatePayload.profile_pic_url = profilePicUrl;
      }
      await admin.from("whatsapp_conversations").update(updatePayload).eq("id", conversationId);
    } else {
      const created2 = await findOrCreateContact(admin, orgId, phoneNumber, pushName);
      contactId = created2.contactId;
      const profilePicUrl = await fetchEvolutionProfilePicture(instanceName, phoneNumber);
      const { data: created, error: createError } = await admin
        .from("whatsapp_conversations")
        .insert({
          org_id: orgId,
          contact_id: contactId,
          phone_number: phoneNumber,
          contact_name: pushName,
          profile_pic_url: profilePicUrl,
          // Número desconhecido (nunca foi contato/cliente antes): a IA fica
          // pausada até revisão humana — protege contra responder
          // automaticamente amigo/família quando o número é compartilhado
          // entre uso pessoal e o WhatsApp do negócio. Contato já conhecido
          // (isNew=false) mantém o padrão da coluna (IA ativa).
          ...(created2.isNew ? { ia_active: false } : {}),
        })
        .select("id, ia_active")
        .single();
      if (createError || !created) {
        throw createError ?? new Error("Falha ao criar conversa.");
      }
      conversationId = created.id as string;
      iaActive = created.ia_active as boolean;
    }

    await admin.from("whatsapp_messages").insert({
      id: dbMessageId,
      conversation_id: conversationId,
      org_id: orgId,
      direction: "inbound",
      message_type: messageType,
      content,
      media_url: mediaUrl,
      sent_by: "contact",
    });

    if (pendingAttachment) {
      const { error: attachmentError } = await admin.from("whatsapp_attachments").insert({
        message_id: dbMessageId,
        org_id: orgId,
        storage_path: pendingAttachment.storagePath,
        media_type: pendingAttachment.mediaType,
        expires_at: whatsappAttachmentExpiresAt().toISOString(),
      });
      if (attachmentError) {
        await admin.storage.from(WHATSAPP_ATTACHMENTS_BUCKET).remove([pendingAttachment.storagePath]);
        logError("api/whatsapp/webhook.attachment-persist-failed", attachmentError, { orgId, conversationId });
        // A mensagem já foi salva sem o anexo vinculado — não falha o webhook por isso.
      }
    }

    // "PARAR"/"SAIR"/"CANCELAR" (etc.) na própria mensagem: marca opt-out
    // permanente e responde confirmando, sem passar pelo resto do fluxo
    // (nem detecção de intenção, nem resposta da IA) — é uma confirmação
    // fixa de compliance, não uma resposta gerada, e vale mais que qualquer
    // outra automação nesta mesma mensagem.
    if (messageType === "text" && contactId && isOptOutKeyword(content ?? "")) {
      await markWhatsappOptOut(admin, contactId);
      try {
        await sendEvolutionText(instanceName, phoneNumber, OPT_OUT_CONFIRMATION_TEXT);
        await admin.from("whatsapp_messages").insert({
          conversation_id: conversationId,
          org_id: orgId,
          direction: "outbound",
          message_type: "text",
          content: OPT_OUT_CONFIRMATION_TEXT,
          sent_by: "system",
        });
        await admin
          .from("whatsapp_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      } catch (error) {
        logError("api/whatsapp/webhook.opt-out-confirmation-failed", error, { orgId, conversationId });
      }
      return Response.json({ received: true });
    }

    const contactName = existingConversation?.contact_name ?? pushName;
    const history = messageType === "text" ? await fetchWhatsappHistory(admin, conversationId) : [];

    // Contato que já optou por sair antes: nenhuma automação por WhatsApp
    // (detecção de intenção, resposta da IA) segue daqui em diante — envio
    // manual pelo corretor (api/whatsapp/send) continua funcionando normal,
    // opt-out é só sobre automação.
    const { data: contactOptOut } = contactId
      ? await admin.from("contacts").select("whatsapp_opt_out").eq("id", contactId).maybeSingle()
      : { data: null };
    const optedOut = contactOptOut?.whatsapp_opt_out === true;

    // Rate limit por organização (não tem usuário autenticado num webhook) —
    // protege contra flood de mensagens inbound (real ou forjado direto no
    // endpoint) estourando custo de IA. A mensagem em si já foi salva acima
    // independente disso; só a detecção de intenção e a resposta automática
    // são puladas quando estourado — o webhook sempre responde 200 pra
    // Evolution API (padrão já estabelecido, ver catch no fim do arquivo).
    const rateLimit = await checkRateLimit(admin, "whatsapp_ai_reply", orgId);
    if (!rateLimit.allowed) {
      logError("api/whatsapp/webhook.rate-limited", new Error("limite de IA por organização estourado"), {
        orgId,
        conversationId,
      });
    }

    if (rateLimit.allowed && !optedOut && messageType === "text" && contactId) {
      try {
        const intent = await detectPurchaseIntent(history, contactName);
        if (intent?.hasIntent) {
          await createDealIfNeeded(admin, orgId, contactId, intent.dealTitle);
        }
      } catch (error) {
        // Detecção de intenção é um "extra" — nunca deve impedir o resto do
        // fluxo (mensagem já foi salva, resposta automática segue normal).
        logError("api/whatsapp/webhook.intent-detection-failed", error, { orgId, conversationId });
      }
    }

    if (rateLimit.allowed && !optedOut && iaActive && messageType === "text") {
      try {
        const reply = await generateWhatsappReply(admin, orgId, history, contactName);
        if (reply) {
          await sendEvolutionText(instanceName, phoneNumber, reply);
          await admin.from("whatsapp_messages").insert({
            conversation_id: conversationId,
            org_id: orgId,
            direction: "outbound",
            message_type: "text",
            content: reply,
            sent_by: "ai",
          });
          await admin
            .from("whatsapp_conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversationId);
        }
      } catch (error) {
        // Falha na resposta automática não deve derrubar o webhook — a
        // mensagem recebida já foi salva, o usuário responde manualmente.
        const message =
          error instanceof EvolutionApiError ? error.message : undefined;
        logError("api/whatsapp/webhook.auto-reply-failed", error, {
          orgId,
          conversationId,
          message,
        });
      }
    }
  } catch (error) {
    logError("api/whatsapp/webhook.processing-failed", error, { instanceName, phoneNumber });
    // O evento já está marcado como recebido (dedupe) — não desfazemos aqui
    // porque, ao contrário do Stripe, a Evolution não reenvia webhooks de
    // forma confiável; preferimos não reprocessar do zero em retry.
  }

  return Response.json({ received: true });
}
