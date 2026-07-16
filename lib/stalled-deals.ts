import type { SupabaseClient } from "@supabase/supabase-js";

const STALL_DAYS = 5;

export type StalledDealsByUser = Map<string, { title: string; contactName: string | null }[]>;

export type StalledDeal = {
  id: string;
  title: string;
  contactId: string | null;
  contactName: string | null;
  assigneeId: string;
  lastActivityAt: string;
};

// Uma venda é "parada" quando não tem registro de interação (nem foi criada)
// há mais de STALL_DAYS dias e ainda está aberta (fora de ganho/perdido).
// Sem filtro de org/owner por padrão — é assim que o cron diário (global,
// todas as contas) sempre usou. `filters` é opcional e usado pela Central
// Hoje (1.3a) para escopar à organização/dono da sessão.
export async function computeStalledDeals(
  admin: SupabaseClient,
  filters?: { orgId?: string; ownerId?: string }
): Promise<StalledDeal[]> {
  const staleBefore = new Date(Date.now() - STALL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let query = admin
    .from("deals")
    .select("id, title, contact_id, assignee_id, owner_id, created_at")
    .not("stage", "in", "(ganho,perdido)")
    .lte("created_at", staleBefore);
  if (filters?.orgId) query = query.eq("org_id", filters.orgId);
  if (filters?.ownerId) query = query.or(`assignee_id.eq.${filters.ownerId},owner_id.eq.${filters.ownerId}`);

  const { data: deals } = await query;
  if (!deals || deals.length === 0) return [];

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

  const stalled: StalledDeal[] = [];
  for (const deal of deals) {
    const contactId = deal.contact_id as string | null;
    const lastActivity = (contactId && lastInteractionByContact.get(contactId)) || (deal.created_at as string);
    if (lastActivity > staleBefore) continue;

    stalled.push({
      id: deal.id as string,
      title: deal.title as string,
      contactId,
      contactName: contactId ? contactNames.get(contactId) ?? null : null,
      assigneeId: (deal.assignee_id as string | null) ?? (deal.owner_id as string),
      lastActivityAt: lastActivity,
    });
  }
  return stalled;
}

export async function getStalledDealsByUser(admin: SupabaseClient): Promise<StalledDealsByUser> {
  const stalled = await computeStalledDeals(admin);
  const byUser: StalledDealsByUser = new Map();
  for (const deal of stalled) {
    const entry = byUser.get(deal.assigneeId) ?? [];
    entry.push({ title: deal.title, contactName: deal.contactName });
    byUser.set(deal.assigneeId, entry);
  }
  return byUser;
}
