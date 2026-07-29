import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: expired, error } = await admin
    .from("assistant_attachments")
    .select("id, storage_path")
    .lte("expires_at", new Date().toISOString())
    .limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (expired?.length) {
    const paths = expired.map((attachment) => attachment.storage_path as string);
    const { error: storageError } = await admin.storage
      .from("assistant-attachments")
      .remove(paths);
    if (storageError) {
      return Response.json({ error: storageError.message }, { status: 500 });
    }

    const { error: deleteError } = await admin
      .from("assistant_attachments")
      .delete()
      .in("id", expired.map((attachment) => attachment.id));
    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }
  }

  const { error: confirmationDeleteError } = await admin
    .from("assistant_deletion_confirmations")
    .delete()
    .lte("expires_at", new Date().toISOString());
  if (confirmationDeleteError) {
    return Response.json({ error: confirmationDeleteError.message }, { status: 500 });
  }

  return Response.json({ removed: expired?.length ?? 0 });
}
