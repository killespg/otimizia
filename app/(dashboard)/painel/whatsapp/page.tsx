import { getActiveOrgId, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import type { WhatsappConversation } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { ConnectWhatsappPanel } from "./ConnectWhatsappPanel";
import { WhatsappInbox } from "./WhatsappInbox";

export default async function WhatsappPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [orgId, { data: profile }] = await Promise.all([
    getActiveOrgId(supabase, user!.id),
    supabase.from("profiles").select("profession_type, is_admin").maybeSingle(),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin ?? false,
  );
  const isSeller = workspaceKey === "autonomous_seller";
  const isRealEstate = workspaceKey === "real_estate_broker";
  const usesFlatSurface = isSeller || isRealEstate;
  const role = await getOrgRole(supabase, orgId, user!.id);

  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("status, phone_number")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!instance || instance.status !== "conectado") {
    return (
      <WhatsappFrame isSeller={isSeller} isRealEstate={isRealEstate}><ConnectWhatsappPanel currentStatus={instance?.status ?? "nao_conectado"} isAdmin={role === "admin"} flat={usesFlatSurface}/></WhatsappFrame>
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

  // Prévia da última mensagem de cada conversa — é o que faz a lista ler como
  // caixa de entrada em vez de uma lista de telefones. Uma query só, do mais
  // recente pro mais antigo: a primeira ocorrência de cada conversa é a última
  // mensagem dela.
  const previews: Record<string, { content: string; outbound: boolean }> = {};
  const { data: recentMessages } = await supabase
    .from("whatsapp_messages")
    .select("conversation_id, content, direction")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(400);
  for (const row of recentMessages ?? []) {
    const key = row.conversation_id as string;
    if (previews[key]) continue;
    previews[key] = {
      content: (row.content as string | null) ?? "",
      outbound: row.direction === "outbound",
    };
  }

  // Ações rápidas do corretor: mandar uma vitrine já criada direto na conversa.
  // Só faz sentido no workspace imobiliário.
  let shareCollections: Array<{ id: string; title: string; token: string }> = [];
  if (isRealEstate) {
    const { data: collectionRows } = await supabase
      .from("real_estate_share_collections")
      .select("id, title, token")
      .eq("org_id", orgId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(8);
    shareCollections = (collectionRows ?? []) as Array<{ id: string; title: string; token: string }>;
  }

  return (
    <WhatsappFrame isSeller={isSeller} isRealEstate={isRealEstate}><WhatsappInbox
      orgId={orgId}
      initialConversations={(conversations ?? []) as WhatsappConversation[]}
      initialUnreadCounts={unreadCounts}
      initialPreviews={previews}
      shareCollections={shareCollections}
    /></WhatsappFrame>
  );
}

// Caixa de entrada ocupa a tela inteira (fura o padding do <main> com margem
// negativa), como qualquer app de mensagem. Sem cabeçalho de página grande:
// a tela já se identifica pela navegação, e o título repetido só roubava
// altura da conversa — a mesma correção feita na tela do Tim.
function WhatsappFrame({ children }: { children: React.ReactNode; isSeller: boolean; isRealEstate: boolean }) {
  return (
    <div className="-mx-5 -mb-6 -mt-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-[#1e1d22] md:-mx-8 md:-mb-8 md:-mt-8">
      {children}
    </div>
  );
}
