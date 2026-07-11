import { findEvolutionMessages, type EvolutionMessageRecord } from "@/lib/evolution";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractMessageText, resolveWhatsappPhone } from "@/lib/whatsapp-jid";
import { findOrCreateContact } from "@/lib/whatsapp-contacts";

export const runtime = "nodejs";
export const maxDuration = 300;

const PAGE_SIZE = 100;

// Importa o histórico que a Evolution já tinha sincronizado internamente do
// número conectado (Baileys guarda uma cópia local do WhatsApp, mesmo antes
// de qualquer webhook novo). Idempotente por conversa: se a conversa já tem
// mensagens, pula — não reimporta nem duplica.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("instance_name, status")
    .eq("org_id", orgId)
    .maybeSingle();
  if (!instance || instance.status !== "conectado") {
    return Response.json({ error: "WhatsApp não está conectado." }, { status: 409 });
  }

  const admin = createAdminClient();

  let allMessages: EvolutionMessageRecord[] = [];
  try {
    let page = 1;
    let totalPages = 1;
    do {
      const { records, pages } = await findEvolutionMessages(instance.instance_name, page, PAGE_SIZE);
      allMessages = allMessages.concat(records);
      totalPages = pages || 1;
      page++;
    } while (page <= totalPages);
  } catch (error) {
    logError("api/whatsapp/import-history.fetch-failed", error, { orgId });
    return Response.json({ error: "Não consegui buscar o histórico na Evolution API." }, { status: 502 });
  }

  // Agrupa por telefone real (resolve @lid via remoteJidAlt) e dedupe por
  // wa message id dentro do próprio lote — sem depender de constraint no banco.
  const byPhone = new Map<string, EvolutionMessageRecord[]>();
  const seenMessageIds = new Set<string>();
  for (const record of allMessages) {
    const waId = record.key?.id;
    if (waId) {
      if (seenMessageIds.has(waId)) continue;
      seenMessageIds.add(waId);
    }
    const phone = resolveWhatsappPhone(record.key?.remoteJid, record.key?.remoteJidAlt);
    if (!phone) continue;
    const text = extractMessageText(record.message);
    if (!text) continue; // mídia — fora de escopo desta importação
    const bucket = byPhone.get(phone) ?? [];
    bucket.push(record);
    byPhone.set(phone, bucket);
  }

  let conversationsImported = 0;
  let messagesImported = 0;
  let conversationsSkipped = 0;

  for (const [phone, records] of Array.from(byPhone.entries())) {
    records.sort((a, b) => a.messageTimestamp - b.messageTimestamp);

    let conversationId: string;
    const { data: existingConversation } = await admin
      .from("whatsapp_conversations")
      .select("id")
      .eq("org_id", orgId)
      .eq("phone_number", phone)
      .maybeSingle();

    if (existingConversation) {
      const { count } = await admin
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", existingConversation.id);
      if ((count ?? 0) > 0) {
        conversationsSkipped++;
        continue; // já tem mensagens — assume que já foi importada ou já está viva
      }
      conversationId = existingConversation.id as string;
    } else {
      const contactName = records.find((r) => !r.key.fromMe)?.pushName ?? null;
      const { contactId, isNew } = await findOrCreateContact(admin, orgId, phone, contactName);
      const { data: created, error } = await admin
        .from("whatsapp_conversations")
        .insert({
          org_id: orgId,
          contact_id: contactId,
          phone_number: phone,
          contact_name: contactName,
          // Mesma proteção do webhook: contato que a importação está
          // criando agora (nunca foi cliente conhecido) começa com IA
          // pausada, já que number pode ser de uso pessoal.
          ...(isNew ? { ia_active: false } : {}),
        })
        .select("id")
        .single();
      if (error || !created) {
        logError("api/whatsapp/import-history.conversation-create-failed", error, { orgId, phone });
        continue;
      }
      conversationId = created.id as string;
    }

    const rows = records.map((record) => ({
      conversation_id: conversationId,
      org_id: orgId,
      direction: record.key.fromMe ? ("outbound" as const) : ("inbound" as const),
      message_type: "text" as const,
      content: extractMessageText(record.message),
      sent_by: record.key.fromMe ? ("human" as const) : ("contact" as const),
      created_at: new Date(record.messageTimestamp * 1000).toISOString(),
      read_at: new Date(record.messageTimestamp * 1000).toISOString(),
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin.from("whatsapp_messages").insert(chunk);
      if (error) {
        logError("api/whatsapp/import-history.messages-insert-failed", error, { orgId, conversationId });
        break;
      }
      messagesImported += chunk.length;
    }

    const lastTimestamp = records[records.length - 1]?.messageTimestamp;
    if (lastTimestamp) {
      await admin
        .from("whatsapp_conversations")
        .update({ last_message_at: new Date(lastTimestamp * 1000).toISOString() })
        .eq("id", conversationId);
    }

    conversationsImported++;
  }

  return Response.json({ conversationsImported, messagesImported, conversationsSkipped });
}
