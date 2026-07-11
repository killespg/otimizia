import type { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/logger";
import { getWorkspaceKey } from "@/lib/workspaces";

// Compartilhado pelo webhook (mensagem nova) e pela importação de histórico:
// acha o contato pelo telefone dentro da org ou cria um novo (fonte "WhatsApp"),
// usando o workspace_key de um membro qualquer da org como padrão razoável —
// o webhook não tem "usuário atual" pra herdar isso.
export async function findOrCreateContact(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  phoneNumber: string,
  pushName: string | null
): Promise<string | null> {
  const { data: existing } = await admin
    .from("contacts")
    .select("id")
    .eq("org_id", orgId)
    .eq("phone", phoneNumber)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: firstMember } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!firstMember) return null;

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
    return null;
  }
  return created.id as string;
}
