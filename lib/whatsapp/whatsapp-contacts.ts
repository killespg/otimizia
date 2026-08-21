import type { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/utils/logger";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

export type FoundOrCreatedContact = { contactId: string | null; isNew: boolean };

// Compartilhado pelo webhook (mensagem nova) e pela importação de histórico:
// acha o contato pelo telefone dentro da org ou cria um novo (fonte "WhatsApp"),
// usando o workspace_key de um membro qualquer da org como padrão razoável —
// o webhook não tem "usuário atual" pra herdar isso. `isNew` importa pro
// webhook decidir se a IA já pode responder sozinha (número que já era
// cliente conhecido) ou se deve esperar revisão humana (número nunca visto —
// em número compartilhado com uso pessoal, evita a IA responder amigo/família).
export async function findOrCreateContact(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  phoneNumber: string,
  pushName: string | null
): Promise<FoundOrCreatedContact> {
  const { data: existing } = await admin
    .from("contacts")
    .select("id")
    .eq("org_id", orgId)
    .eq("phone", phoneNumber)
    .maybeSingle();
  if (existing) return { contactId: existing.id as string, isNew: false };

  const { data: firstMember } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!firstMember) return { contactId: null, isNew: true };

  const { data: profile } = await admin
    .from("profiles")
    .select("profession_type, is_admin")
    .eq("id", firstMember.user_id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(profile?.profession_type, undefined, profile?.is_admin ?? false);

  const { data: created, error } = await admin
    .from("contacts")
    .insert({
      owner_id: firstMember.user_id,
      org_id: orgId,
      workspace_key: workspaceKey,
      name: pushName ?? phoneNumber,
      phone: phoneNumber,
      source: "WhatsApp",
    })
    .select("id")
    .single();
  if (error) {
    logError("whatsapp-contacts.create-failed", error, { orgId, phoneNumber });
    return { contactId: null, isNew: true };
  }
  return { contactId: created.id as string, isNew: true };
}

// Cria a venda no funil (etapa "novo") quando a IA detecta intenção real de
// compra/contratação numa conversa de WhatsApp — só se o contato ainda não
// tiver nenhuma venda (evita duplicar a cada mensagem com intenção na mesma
// conversa). Herda owner_id/workspace_key do próprio contato, não de um
// membro qualquer da org, pra ficar consistente com o resto do CRM dele.
export async function createDealIfNeeded(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  contactId: string,
  title: string,
  extraDetails?: Record<string, string>,
): Promise<{ created: boolean; dealId: string | null }> {
  const { data: existingDeal } = await admin
    .from("deals")
    .select("id")
    .eq("org_id", orgId)
    .eq("contact_id", contactId)
    .limit(1)
    .maybeSingle();
  if (existingDeal) return { created: false, dealId: existingDeal.id as string };

  const { data: contact } = await admin
    .from("contacts")
    .select("owner_id, workspace_key")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return { created: false, dealId: null };

  const { data: created, error } = await admin
    .from("deals")
    .insert({
      owner_id: contact.owner_id,
      org_id: orgId,
      workspace_key: contact.workspace_key,
      contact_id: contactId,
      title,
      stage: "novo",
      ...(extraDetails ? { details: extraDetails } : {}),
    })
    .select("id")
    .single();
  if (error) {
    logError("whatsapp-contacts.deal-create-failed", error, { orgId, contactId });
    return { created: false, dealId: null };
  }
  return { created: true, dealId: created.id as string };
}
