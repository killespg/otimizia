import type { SupabaseClient } from "@supabase/supabase-js";

const STALL_DAYS = 5;

export type StalledDealsByUser = Map<string, { title: string; contactName: string | null }[]>;

// Uma venda é "parada" quando não tem registro de interação (nem foi criada)
// há mais de STALL_DAYS dias e ainda está aberta (fora de ganho/perdido).
export async function getStalledDealsByUser(admin: SupabaseClient): Promise<StalledDealsByUser> {
  const staleBefore = new Date(Date.now() - STALL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: deals } = await admin
    .from("deals")
    .select("id, title, contact_id, assignee_id, owner_id, created_at")
    .not("stage", "in", "(ganho,perdido)")
    .lte("created_at", staleBefore);

  const byUser: StalledDealsByUser = new Map();
  if (!deals || deals.length === 0) return byUser;

  const contactIds = Array.from(
    new Set(deals.map((d) => d.contact_id as string | null).filter(Boolean))
  ) as string[];

  const lastInteractionByContact = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: interactions } = await admin
      .from("interactions")
      .select("contact_id, created_at")
      .in("contact_id", contactIds);
    for (const interaction of interactions ?? []) {
      const contactId = interaction.contact_id as string;
      const createdAt = interaction.created_at as string;
      const current = lastInteractionByContact.get(contactId);
      if (!current || createdAt > current) lastInteractionByContact.set(contactId, createdAt);
    }
  }

  const contactNames = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: contacts } = await admin.from("contacts").select("id, name").in("id", contactIds);
    for (const contact of contacts ?? []) contactNames.set(contact.id as string, contact.name as string);
  }

  for (const deal of deals) {
    const contactId = deal.contact_id as string | null;
    const lastActivity = (contactId && lastInteractionByContact.get(contactId)) || (deal.created_at as string);
    if (lastActivity > staleBefore) continue;

    const userId = (deal.assignee_id as string | null) ?? (deal.owner_id as string);
    const entry = byUser.get(userId) ?? [];
    entry.push({ title: deal.title as string, contactName: contactId ? contactNames.get(contactId) ?? null : null });
    byUser.set(userId, entry);
  }

  return byUser;
}
