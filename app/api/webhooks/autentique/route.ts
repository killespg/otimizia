import { NextResponse } from "next/server";
import { logError } from "@/lib/utils/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSignedDocumentUrl, verifyAutentiqueSignature } from "@/lib/law/autentique";

export const runtime = "nodejs";

type AutentiqueWebhookPayload = {
  event: {
    id: string;
    type: string;
    data?: {
      email?: string;
      document?: { id?: string };
    };
  };
};

const STATUS_BY_EVENT: Record<string, "viewed" | "signed" | "rejected" | "delivery_failed"> = {
  "signature.viewed": "viewed",
  "signature.accepted": "signed",
  "signature.rejected": "rejected",
  "signature.delivery_failed": "delivery_failed",
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-autentique-signature");
  if (!verifyAutentiqueSignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  let payload: AutentiqueWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const event = payload.event;
  if (!event?.id || !event.type) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: dedupeError } = await supabase
    .from("autentique_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (dedupeError) {
    if (dedupeError.code === "23505") {
      // Já processado (reentrega) — não repete os side effects.
      return NextResponse.json({ received: true });
    }
    logError("autentique-webhook.dedupe-failed", dedupeError, { eventId: event.id, eventType: event.type });
    return NextResponse.json({ error: "Falha ao registrar evento." }, { status: 500 });
  }

  const newStatus = STATUS_BY_EVENT[event.type];
  const autentiqueDocumentId = event.data?.document?.id;
  if (newStatus && autentiqueDocumentId) {
    try {
      const update: Record<string, unknown> = { status: newStatus };
      if (newStatus === "signed") {
        update.signed_file_url = await fetchSignedDocumentUrl(autentiqueDocumentId);
      }
      let query = supabase
        .from("legal_document_signatures")
        .update(update)
        .eq("autentique_document_id", autentiqueDocumentId);
      // Restringe pelo e-mail do signatário quando o evento traz o dado —
      // um documento pode ter mais de um signatário, e cada evento é
      // individual; sem isso, marcaríamos todos como assinados quando só um
      // assinou.
      if (event.data?.email) query = query.eq("signer_email", event.data.email);
      const { error } = await query;
      if (error) logError("autentique-webhook.update-failed", error, { eventId: event.id, eventType: event.type });
    } catch (err) {
      logError("autentique-webhook.processing-failed", err, { eventId: event.id, eventType: event.type });
    }
  }

  return NextResponse.json({ received: true });
}
