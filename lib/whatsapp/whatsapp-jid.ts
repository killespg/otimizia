// O WhatsApp identifica o mesmo contato de duas formas: o JID clássico
// (55XXXXXXXXXXX@s.whatsapp.net) ou, cada vez mais comum, o "lid"
// (id numérico opaco @lid, modo de endereçamento mais recente e privado) —
// nesse caso o número de telefone real vem em remoteJidAlt. Sem essa
// resolução, o mesmo contato viraria duas conversas diferentes.
export function resolveWhatsappPhone(
  remoteJid: string | null | undefined,
  remoteJidAlt?: string | null
): string | null {
  if (!remoteJid || remoteJid.endsWith("@g.us")) return null; // grupo, fora de escopo
  if (remoteJid.endsWith("@s.whatsapp.net")) return remoteJid.split("@")[0];
  if (remoteJid.endsWith("@lid")) {
    if (remoteJidAlt && remoteJidAlt.endsWith("@s.whatsapp.net")) {
      return remoteJidAlt.split("@")[0];
    }
    return null; // sem remoteJidAlt não dá pra saber o número real
  }
  return null;
}

export function extractMessageText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;
  if (typeof m.conversation === "string") return m.conversation;
  const extended = m.extendedTextMessage as { text?: unknown } | undefined;
  if (typeof extended?.text === "string") return extended.text;
  return null;
}

export type InboundMediaKind = "image" | "audio" | "document";

export type InboundMedia = {
  kind: InboundMediaKind;
  mimetype: string;
  caption: string | null;
};

// Só os tipos que o bucket whatsapp-attachments aceita (ver migration 0080).
// Qualquer outro tipo (vídeo, figurinha, localização...) segue caindo em
// "unsupported", igual mídia hoje.
const SUPPORTED_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/ogg",
  "application/pdf",
]);

// Nota de voz do WhatsApp chega como "audio/ogg; codecs=opus" — normaliza
// pro tipo aceito no bucket antes de comparar.
function normalizeMimetype(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  return raw.split(";")[0].trim().toLowerCase();
}

export function extractInboundMedia(message: unknown): InboundMedia | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;

  const image = m.imageMessage as { mimetype?: unknown; caption?: unknown } | undefined;
  if (image) {
    const mimetype = normalizeMimetype(image.mimetype);
    if (mimetype && SUPPORTED_MEDIA_MIME_TYPES.has(mimetype)) {
      return { kind: "image", mimetype, caption: typeof image.caption === "string" ? image.caption : null };
    }
  }

  const audio = m.audioMessage as { mimetype?: unknown } | undefined;
  if (audio) {
    const mimetype = normalizeMimetype(audio.mimetype);
    if (mimetype && SUPPORTED_MEDIA_MIME_TYPES.has(mimetype)) {
      return { kind: "audio", mimetype, caption: null };
    }
  }

  const document = m.documentMessage as { mimetype?: unknown; caption?: unknown; fileName?: unknown } | undefined;
  if (document) {
    const mimetype = normalizeMimetype(document.mimetype);
    if (mimetype && SUPPORTED_MEDIA_MIME_TYPES.has(mimetype)) {
      const caption =
        typeof document.caption === "string"
          ? document.caption
          : typeof document.fileName === "string"
            ? document.fileName
            : null;
      return { kind: "document", mimetype, caption };
    }
  }

  return null;
}
