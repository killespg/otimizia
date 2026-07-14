import { sendEvolutionText } from "@/lib/evolution";
import { logError } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push";
import { markEventSent } from "@/lib/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Disparado pelo Vercel Cron (vercel.json) de hora em hora — mais frequente
// que os outros crons (daily-*) de propósito, porque estes lembretes são
// por EVENTO (2h/24h antes da visita, 24h antes da proposta expirar), não
// um resumo diário. Cobre visita (RE-3xx) e expiração de proposta (RE-4xx)
// no mesmo cron — mesma cadência, mesmo mecanismo de dedupe — em vez de
// multiplicar rotas de cron quase idênticas. Mesma autenticação dos outros
// crons: Vercel injeta "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const HOUR = 3_600_000;

  const [whatsappResult, pushResult, offerResult] = await Promise.all([
    sendWhatsappReminders(admin, now, HOUR),
    sendPushReminders(admin, now, HOUR),
    sendOfferExpiryReminders(admin, now, HOUR),
  ]);

  return Response.json({ whatsapp: whatsappResult, push: pushResult, offers: offerResult });
}

// Cadência horária = janela de 1h em torno do alvo (23h-24h / 1h-2h antes)
// garante exatamente uma chance de disparo por visita, sem depender de um
// cron mais granular que talvez não esteja disponível no plano da Vercel
// em uso — se o produto crescer e precisar de precisão maior, trocar pra
// */15 * * * * e estreitar a janela é a mudança, não a lógica.
async function sendWhatsappReminders(admin: ReturnType<typeof createAdminClient>, now: number, hour: number) {
  const windowStart = new Date(now + 23 * hour).toISOString();
  const windowEnd = new Date(now + 24 * hour).toISOString();

  const { data: visits } = await admin
    .from("real_estate_visits")
    .select("id, org_id, contact_id, broker_id, property_id, scheduled_at")
    .eq("status", "scheduled")
    .gte("scheduled_at", windowStart)
    .lt("scheduled_at", windowEnd);

  let sent = 0;
  for (const visit of visits ?? []) {
    try {
      const ok = await sendVisitWhatsappReminder(admin, visit);
      if (ok) sent++;
    } catch (err) {
      logError("cron/visit-reminders.whatsapp-failed", err, { visitId: visit.id });
    }
  }
  return { checked: visits?.length ?? 0, sent };
}

async function sendVisitWhatsappReminder(
  admin: ReturnType<typeof createAdminClient>,
  visit: { id: string; org_id: string; contact_id: string; broker_id: string; property_id: string; scheduled_at: string }
): Promise<boolean> {
  // A preferência que vale é a do corretor (é ele quem "manda" o lembrete
  // automático em nome dele) — contatos do CRM não têm linha em
  // notification_preferences, essa tabela é só pra usuários do app.
  const [{ data: prefs }, { data: contact }, { data: property }, { data: instance }] = await Promise.all([
    admin.from("notification_preferences").select("visit_reminders_enabled").eq("user_id", visit.broker_id).maybeSingle(),
    admin.from("contacts").select("phone, name").eq("id", visit.contact_id).maybeSingle(),
    admin.from("real_estate_properties").select("title, address_street, address_number, address_neighborhood").eq("id", visit.property_id).maybeSingle(),
    admin.from("whatsapp_instances").select("instance_name, status").eq("org_id", visit.org_id).maybeSingle(),
  ]);
  if (prefs?.visit_reminders_enabled === false) return false;
  if (!contact?.phone || !property) return false;
  if (!instance || instance.status !== "conectado") return false;

  // notification_log.user_id referencia auth.users — usa o corretor (é
  // quem "envia" o lembrete), não o contato (que não é um usuário do app).
  const isNewSend = await markEventSent(admin, visit.broker_id, visit.id, "visit_reminder_24h_whatsapp");
  if (!isNewSend) return false;

  const address = [property.address_street, property.address_number, property.address_neighborhood].filter(Boolean).join(", ");
  const when = new Date(visit.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  const text = `Oi${contact.name ? " " + contact.name.split(" ")[0] : ""}! Passando pra lembrar da visita ao imóvel "${property.title}"${address ? ` (${address})` : ""} amanhã, ${when}. Confirma pra gente?`;

  await sendEvolutionText(instance.instance_name, contact.phone, text);

  const { data: conversation } = await admin
    .from("whatsapp_conversations")
    .upsert(
      { org_id: visit.org_id, contact_id: visit.contact_id, phone_number: contact.phone, contact_name: contact.name, last_message_at: new Date().toISOString() },
      { onConflict: "org_id,phone_number" }
    )
    .select("id")
    .single();
  if (conversation) {
    await admin.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      org_id: visit.org_id,
      direction: "outbound",
      message_type: "text",
      content: text,
      sent_by: "system",
    });
  }

  await admin.from("real_estate_visits").update({ reminder_sent_at: new Date().toISOString() }).eq("id", visit.id);
  return true;
}

async function sendPushReminders(admin: ReturnType<typeof createAdminClient>, now: number, hour: number) {
  const windowStart = new Date(now + hour).toISOString();
  const windowEnd = new Date(now + 2 * hour).toISOString();

  const { data: visits } = await admin
    .from("real_estate_visits")
    .select("id, broker_id, property_id, scheduled_at")
    .eq("status", "scheduled")
    .gte("scheduled_at", windowStart)
    .lt("scheduled_at", windowEnd);

  let sent = 0;
  for (const visit of visits ?? []) {
    try {
      const { data: prefs } = await admin
        .from("notification_preferences")
        .select("visit_reminders_enabled")
        .eq("user_id", visit.broker_id)
        .maybeSingle();
      if (prefs?.visit_reminders_enabled === false) continue;

      const isNewSend = await markEventSent(admin, visit.broker_id, visit.id, "visit_reminder_2h_push");
      if (!isNewSend) continue;

      const { data: property } = await admin
        .from("real_estate_properties")
        .select("title, address_street, address_number, address_neighborhood")
        .eq("id", visit.property_id)
        .maybeSingle();
      const address = property ? [property.address_street, property.address_number, property.address_neighborhood].filter(Boolean).join(", ") : "";

      const { sent: pushed } = await sendPushToUser(admin, visit.broker_id, {
        title: "Visita em 2h",
        body: `${property?.title ?? "Imóvel"}${address ? ` — ${address}` : ""}`,
        url: "/imoveis/visitas",
      });
      if (pushed > 0) sent++;
    } catch (err) {
      logError("cron/visit-reminders.push-failed", err, { visitId: visit.id });
    }
  }
  return { checked: visits?.length ?? 0, sent };
}

// RE-4xx: "lembrete automático antes de expirar" — mesma janela horária
// (23h-24h antes) e o mesmo princípio de dedupe por evento das visitas.
// Vai pro criador da proposta (created_by), não pro assignee do imóvel —
// quem negociou é quem precisa saber que está prestes a expirar.
async function sendOfferExpiryReminders(admin: ReturnType<typeof createAdminClient>, now: number, hour: number) {
  const windowStart = new Date(now + 23 * hour).toISOString();
  const windowEnd = new Date(now + 24 * hour).toISOString();

  const { data: offers } = await admin
    .from("real_estate_offers")
    .select("id, created_by, property_id, amount_cents, expires_at")
    .in("status", ["sent", "viewed"])
    .gte("expires_at", windowStart)
    .lt("expires_at", windowEnd);

  let sent = 0;
  for (const offer of offers ?? []) {
    try {
      const { data: prefs } = await admin.from("notification_preferences").select("visit_reminders_enabled").eq("user_id", offer.created_by).maybeSingle();
      if (prefs?.visit_reminders_enabled === false) continue;

      const isNewSend = await markEventSent(admin, offer.created_by, offer.id, "offer_expiry_push");
      if (!isNewSend) continue;

      const { data: property } = await admin.from("real_estate_properties").select("title").eq("id", offer.property_id).maybeSingle();
      const amount = offer.amount_cents !== null ? (offer.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";

      const { sent: pushed } = await sendPushToUser(admin, offer.created_by, {
        title: "Proposta expira em 24h",
        body: `${property?.title ?? "Imóvel"}${amount ? ` — ${amount}` : ""}`,
        url: "/imoveis",
      });
      if (pushed > 0) sent++;
    } catch (err) {
      logError("cron/visit-reminders.offer-expiry-failed", err, { offerId: offer.id });
    }
  }
  return { checked: offers?.length ?? 0, sent };
}
