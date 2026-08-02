export const WHATSAPP_ATTACHMENTS_BUCKET = "whatsapp-attachments";
export const WHATSAPP_ATTACHMENT_RETENTION_DAYS = 30;

export function whatsappAttachmentUrl(messageId: string) {
  return `/api/whatsapp/media/${messageId}`;
}

export function whatsappAttachmentExpiresAt(createdAt = new Date()) {
  return new Date(
    createdAt.getTime() +
      WHATSAPP_ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function legacyWhatsappStoragePath(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/deal-photos/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length),
    );
    if (!path || !path.split("/").includes("whatsapp")) return null;
    return path;
  } catch {
    return null;
  }
}

export function extensionForMediaType(mediaType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "application/pdf": "pdf",
  };
  return extensions[mediaType] ?? "jpg";
}
