import { createAdminClient } from "@/lib/supabase/admin";
import {
  legacyWhatsappStoragePath,
  WHATSAPP_ATTACHMENTS_BUCKET,
  whatsappAttachmentExpiresAt,
  whatsappAttachmentUrl,
} from "@/lib/whatsapp/whatsapp-attachments";

export const runtime = "nodejs";
export const maxDuration = 60;

const LEGACY_DEAL_PHOTOS_BUCKET = "deal-photos";

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

  const { data: expiredWhatsapp, error: whatsappExpiryError } = await admin
    .from("whatsapp_attachments")
    .select("id, message_id, storage_path")
    .lte("expires_at", new Date().toISOString())
    .limit(500);
  if (whatsappExpiryError) {
    return Response.json({ error: whatsappExpiryError.message }, { status: 500 });
  }

  if (expiredWhatsapp?.length) {
    const { error: removeError } = await admin.storage
      .from(WHATSAPP_ATTACHMENTS_BUCKET)
      .remove(expiredWhatsapp.map((attachment) => attachment.storage_path as string));
    if (removeError) {
      return Response.json({ error: removeError.message }, { status: 500 });
    }
    const messageIds = expiredWhatsapp.map((attachment) => attachment.message_id);
    const { error: clearError } = await admin
      .from("whatsapp_messages")
      .update({ media_url: null })
      .in("id", messageIds);
    if (clearError) {
      return Response.json({ error: clearError.message }, { status: 500 });
    }
    const { error: metadataDeleteError } = await admin
      .from("whatsapp_attachments")
      .delete()
      .in("id", expiredWhatsapp.map((attachment) => attachment.id));
    if (metadataDeleteError) {
      return Response.json({ error: metadataDeleteError.message }, { status: 500 });
    }
  }

  const { data: legacyMessages, error: legacyReadError } = await admin
    .from("whatsapp_messages")
    .select("id, org_id, media_url, created_at")
    .like("media_url", "%/storage/v1/object/public/deal-photos/%/whatsapp/%")
    .order("created_at", { ascending: true })
    .limit(100);
  if (legacyReadError) {
    return Response.json({ error: legacyReadError.message }, { status: 500 });
  }

  let migratedLegacy = 0;
  let removedExpiredLegacy = 0;
  let legacyFailures = 0;
  for (const message of legacyMessages ?? []) {
    const legacyPath = legacyWhatsappStoragePath(message.media_url as string | null);
    if (!legacyPath) {
      legacyFailures += 1;
      continue;
    }

    const expiresAt = whatsappAttachmentExpiresAt(
      new Date(message.created_at as string),
    );
    if (expiresAt.getTime() <= Date.now()) {
      const { error: removeLegacyError } = await admin.storage
        .from(LEGACY_DEAL_PHOTOS_BUCKET)
        .remove([legacyPath]);
      if (removeLegacyError) {
        legacyFailures += 1;
        continue;
      }
      const { error: clearLegacyError } = await admin
        .from("whatsapp_messages")
        .update({ media_url: null })
        .eq("id", message.id);
      if (clearLegacyError) {
        legacyFailures += 1;
        continue;
      }
      removedExpiredLegacy += 1;
      continue;
    }

    const { data: existingAttachment } = await admin
      .from("whatsapp_attachments")
      .select("id")
      .eq("message_id", message.id)
      .maybeSingle();
    if (existingAttachment) {
      const { error: removeLegacyError } = await admin.storage
        .from(LEGACY_DEAL_PHOTOS_BUCKET)
        .remove([legacyPath]);
      if (removeLegacyError) {
        legacyFailures += 1;
        continue;
      }
      const { error: recoverMessageError } = await admin
        .from("whatsapp_messages")
        .update({ media_url: whatsappAttachmentUrl(message.id as string) })
        .eq("id", message.id);
      if (recoverMessageError) {
        legacyFailures += 1;
        continue;
      }
      migratedLegacy += 1;
      continue;
    }

    const { data: legacyFile, error: downloadError } = await admin.storage
      .from(LEGACY_DEAL_PHOTOS_BUCKET)
      .download(legacyPath);
    if (downloadError || !legacyFile) {
      legacyFailures += 1;
      continue;
    }

    const fileName = legacyPath.split("/").at(-1) ?? `${message.id}.jpg`;
    const privatePath = `${message.org_id}/${message.id}/${fileName}`;
    const mediaType = ["image/jpeg", "image/png", "image/webp"].includes(
      legacyFile.type,
    )
      ? legacyFile.type
      : "image/jpeg";
    const { error: uploadError } = await admin.storage
      .from(WHATSAPP_ATTACHMENTS_BUCKET)
      .upload(privatePath, legacyFile, {
        contentType: mediaType,
        upsert: true,
      });
    if (uploadError) {
      legacyFailures += 1;
      continue;
    }

    const { error: metadataError } = await admin
      .from("whatsapp_attachments")
      .upsert(
        {
          message_id: message.id,
          org_id: message.org_id,
          storage_path: privatePath,
          media_type: mediaType,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "message_id" },
      );
    if (metadataError) {
      await admin.storage
        .from(WHATSAPP_ATTACHMENTS_BUCKET)
        .remove([privatePath]);
      legacyFailures += 1;
      continue;
    }

    const { error: removeLegacyError } = await admin.storage
      .from(LEGACY_DEAL_PHOTOS_BUCKET)
      .remove([legacyPath]);
    if (removeLegacyError) {
      legacyFailures += 1;
      continue;
    }

    const { error: messageUpdateError } = await admin
      .from("whatsapp_messages")
      .update({ media_url: whatsappAttachmentUrl(message.id as string) })
      .eq("id", message.id);
    if (messageUpdateError) {
      legacyFailures += 1;
      continue;
    }
    migratedLegacy += 1;
  }

  return Response.json({
    removedAssistantAttachments: expired?.length ?? 0,
    removedWhatsappAttachments: expiredWhatsapp?.length ?? 0,
    migratedLegacy,
    removedExpiredLegacy,
    legacyFailures,
  });
}
