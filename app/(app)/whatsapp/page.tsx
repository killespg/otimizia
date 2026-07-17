import { computeConversationSla, type ConversationSla } from "@/lib/inbox-sla";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { WhatsappConversation } from "@/lib/supabase/types";
import { ConnectWhatsappPanel } from "./ConnectWhatsappPanel";
import { WhatsappInbox } from "./WhatsappInbox";

export default async function WhatsappPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const role = await getOrgRole(supabase, orgId, user!.id);

  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("status, phone_number")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!instance || instance.status !== "conectado") {
    return (
      <ConnectWhatsappPanel
        currentStatus={instance?.status ?? "nao_conectado"}
        isAdmin={role === "admin"}
      />
    );
  }

  const [{ data: conversations }, { data: unreadRows }, { data: allMessages }, members] = await Promise.all([
    supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("org_id", orgId)
      .order("last_message_at", { ascending: false }),
    supabase
      .from("whatsapp_messages")
      .select("conversation_id")
      .eq("org_id", orgId)
      .eq("direction", "inbound")
      .is("read_at", null),
    // 2.2 (Fase 2): SLA de resposta — última mensagem inbound/outbound por
    // conversa, pra saber se está esperando resposta e há quanto tempo.
    // Calculado uma vez no carregamento da página, não atualiza em tempo
    // real junto com a lista (limitação conhecida, ver
    // docs/roadmap-imobiliario/2.2-inbox-omnicanal.md).
    supabase.from("whatsapp_messages").select("conversation_id, direction, created_at").eq("org_id", orgId),
    getOrgMembers(supabase, orgId),
  ]);

  const unreadCounts: Record<string, number> = {};
  for (const row of unreadRows ?? []) {
    const key = row.conversation_id as string;
    unreadCounts[key] = (unreadCounts[key] ?? 0) + 1;
  }

  const lastByDirection = new Map<string, { inbound: string | null; outbound: string | null }>();
  for (const message of allMessages ?? []) {
    const key = message.conversation_id as string;
    const entry = lastByDirection.get(key) ?? { inbound: null, outbound: null };
    const createdAt = message.created_at as string;
    if (message.direction === "inbound") {
      if (!entry.inbound || createdAt > entry.inbound) entry.inbound = createdAt;
    } else if (!entry.outbound || createdAt > entry.outbound) {
      entry.outbound = createdAt;
    }
    lastByDirection.set(key, entry);
  }
  const slaByConversation: Record<string, ConversationSla> = {};
  for (const conversation of conversations ?? []) {
    const entry = lastByDirection.get(conversation.id as string);
    slaByConversation[conversation.id as string] = computeConversationSla(
      entry?.inbound ?? null,
      entry?.outbound ?? null
    );
  }

  return (
    <WhatsappInbox
      orgId={orgId}
      initialConversations={(conversations ?? []) as WhatsappConversation[]}
      initialUnreadCounts={unreadCounts}
      initialSla={slaByConversation}
      members={members.map((m) => ({ id: m.user_id, name: m.name }))}
    />
  );
}
