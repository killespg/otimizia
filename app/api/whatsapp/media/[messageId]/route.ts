import { getActiveOrgId } from "@/lib/workspace/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { WHATSAPP_ATTACHMENTS_BUCKET } from "@/lib/whatsapp/whatsapp-attachments";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ messageId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [{ messageId }, orgId] = await Promise.all([
    context.params,
    getActiveOrgId(supabase, user.id),
  ]);
  const { data: attachment } = await supabase
    .from("whatsapp_attachments")
    .select("storage_path, media_type, expires_at")
    .eq("message_id", messageId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!attachment) {
    return Response.json({ error: "Anexo não encontrado." }, { status: 404 });
  }
  if (new Date(attachment.expires_at as string).getTime() <= Date.now()) {
    return Response.json({ error: "Este anexo expirou." }, { status: 410 });
  }

  const { data, error } = await createAdminClient().storage
    .from(WHATSAPP_ATTACHMENTS_BUCKET)
    .download(attachment.storage_path as string);
  if (error || !data) {
    return Response.json({ error: "Anexo indisponível." }, { status: 404 });
  }

  return new Response(data, {
    headers: {
      "Content-Type": attachment.media_type as string,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
