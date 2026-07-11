import { EvolutionApiError, sendEvolutionText } from "@/lib/evolution";
import { generateWhatsappReply } from "@/lib/ai/whatsapp-reply";
import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact } from "@/lib/whatsapp-contacts";
import { extractMessageText, resolveWhatsappPhone } from "@/lib/whatsapp-jid";

export const runtime = "nodejs";

// Webhook da Evolution API (sem sessão de usuário — sempre createAdminClient).
// Evento tratado: messages.upsert (mensagem recebida). Demais eventos
// (connection.update, etc.) só são confirmados, sem processamento.
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    logError("api/whatsapp/webhook.invalid-json", error);
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const eventType = String(body?.event ?? "").toLowerCase();
  if (eventType !== "messages.upsert") {
    return Response.json({ received: true });
  }

  const data = body?.data;
  const messageId = data?.key?.id;
  const instanceName = body?.instance;
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

  const phoneNumber = resolveWhatsappPhone(data?.key?.remoteJid, data?.key?.remoteJidAlt);
  if (!phoneNumber) {
    // Grupo, ou @lid sem remoteJidAlt resolvível — fora de escopo do MVP.
    return Response.json({ received: true });
  }
  const pushName = typeof data?.pushName === "string" ? data.pushName : null;

  const conversationText = extractMessageText(data?.message);
  // TODO: mídia (imagem/áudio/documento) não é tratada nesta primeira
  // versão — fica registrada como "unsupported" pra aparecer no chat, mas
  // não dispara resposta automática.
  const messageType = conversationText ? "text" : "unsupported";
  const content = conversationText ?? "[mensagem de mídia — ainda não suportada]";

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

    const { data: existingConversation } = await admin
      .from("whatsapp_conversations")
      .select("id, ia_active, contact_name")
      .eq("org_id", orgId)
      .eq("phone_number", phoneNumber)
      .maybeSingle();

    let conversationId: string;
    let iaActive: boolean;

    if (existingConversation) {
      conversationId = existingConversation.id as string;
      iaActive = existingConversation.ia_active as boolean;
      await admin
        .from("whatsapp_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          contact_name: existingConversation.contact_name ?? pushName,
        })
        .eq("id", conversationId);
    } else {
      const { contactId, isNew } = await findOrCreateContact(admin, orgId, phoneNumber, pushName);
      const { data: created, error: createError } = await admin
        .from("whatsapp_conversations")
        .insert({
          org_id: orgId,
          contact_id: contactId,
          phone_number: phoneNumber,
          contact_name: pushName,
          // Número desconhecido (nunca foi contato/cliente antes): a IA fica
          // pausada até revisão humana — protege contra responder
          // automaticamente amigo/família quando o número é compartilhado
          // entre uso pessoal e o WhatsApp do negócio. Contato já conhecido
          // (isNew=false) mantém o padrão da coluna (IA ativa).
          ...(isNew ? { ia_active: false } : {}),
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
      conversation_id: conversationId,
      org_id: orgId,
      direction: "inbound",
      message_type: messageType,
      content,
      sent_by: "contact",
    });

    if (iaActive && messageType === "text") {
      try {
        const reply = await generateWhatsappReply(
          admin,
          orgId,
          conversationId,
          existingConversation?.contact_name ?? pushName
        );
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
