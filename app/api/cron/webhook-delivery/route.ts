import { logError } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { signWebhookPayload } from "@/lib/webhooks";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;

type PendingDelivery = {
  id: string;
  attempts: number;
  webhook_endpoints: { url: string; secret: string } | null;
  crm_domain_events: { event_type: string; aggregate_id: string; payload: Record<string, unknown>; created_at: string } | null;
};

// Mesmo esquema de autenticação dos outros crons (Authorization: Bearer
// <CRON_SECRET>, injetado pela Vercel). Processa entregas pendentes/com
// falha (até MAX_ATTEMPTS) em lote — sem backoff exponencial, só reprocessa
// no próximo disparo do cron (intervalo já dá o espaçamento).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: deliveries } = await admin
    .from("webhook_deliveries")
    .select("id, attempts, webhook_endpoints(url, secret), crm_domain_events(event_type, aggregate_id, payload, created_at)")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  let delivered = 0;
  let failed = 0;

  for (const delivery of (deliveries ?? []) as unknown as PendingDelivery[]) {
    const endpoint = delivery.webhook_endpoints;
    const event = delivery.crm_domain_events;
    if (!endpoint || !event) continue;

    const body = JSON.stringify({
      event_type: event.event_type,
      aggregate_id: event.aggregate_id,
      payload: event.payload,
      occurred_at: event.created_at,
    });
    const signature = signWebhookPayload(endpoint.secret, body);

    let responseStatus: number | null = null;
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Otimizia-Signature": signature },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      responseStatus = response.status;
    } catch (error) {
      logError("cron.webhook-delivery", error, { deliveryId: delivery.id });
    }

    const succeeded = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;
    const { error: updateError } = await admin
      .from("webhook_deliveries")
      .update({
        status: succeeded ? "delivered" : "failed",
        attempts: delivery.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        response_status: responseStatus,
      })
      .eq("id", delivery.id);
    if (updateError) logError("cron.webhook-delivery", updateError, { deliveryId: delivery.id });

    if (succeeded) delivered++;
    else failed++;
  }

  return Response.json({ processed: delivered + failed, delivered, failed });
}
