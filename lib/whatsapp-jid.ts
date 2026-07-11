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
