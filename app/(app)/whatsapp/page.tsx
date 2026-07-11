import { getActiveOrgId, getOrgRole } from "@/lib/org";
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

  const [{ data: conversations }, { data: unreadRows }] = await Promise.all([
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
  ]);

  const unreadCounts: Record<string, number> = {};
  for (const row of unreadRows ?? []) {
    const key = row.conversation_id as string;
    unreadCounts[key] = (unreadCounts[key] ?? 0) + 1;
  }

  return (
    <WhatsappInbox
      orgId={orgId}
      initialConversations={(conversations ?? []) as WhatsappConversation[]}
      initialUnreadCounts={unreadCounts}
    />
  );
}
