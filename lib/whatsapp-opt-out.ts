import type { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";

const OPT_OUT_KEYWORDS = new Set(["parar", "pare", "sair", "cancelar", "stop"]);

const COMBINING_DIACRITICS_RE = /[̀-ͯ]/g;

// Compara a mensagem INTEIRA normalizada contra as palavras-chave, não
// substring — assim "quero cancelar a visita de amanhã" não aciona opt-out
// por engano. É o mesmo padrão de opt-out do WhatsApp Business/SMS: só a
// palavra sozinha (ignorando acento, caixa e pontuação final) conta.
export function isOptOutKeyword(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS_RE, "")
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/, "");
  return OPT_OUT_KEYWORDS.has(normalized);
}

export const OPT_OUT_CONFIRMATION_TEXT =
  "Prontinho, você não vai mais receber mensagens automáticas por aqui. Se precisar de algo, é só chamar o corretor direto.";

export async function markWhatsappOptOut(
  admin: ReturnType<typeof createAdminClient>,
  contactId: string
): Promise<void> {
  const { error } = await admin
    .from("contacts")
    .update({ whatsapp_opt_out: true, whatsapp_opt_out_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) logError("whatsapp-opt-out.mark-failed", error, { contactId });
}
