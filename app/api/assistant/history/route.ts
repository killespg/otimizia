import { getRecentAssistantMessages, resolveLatestConversationId } from "@/lib/ai/history";
import { getActiveOrgId } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import { NIL_CONVERSATION_UUID } from "@/lib/ai/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ messages: [] }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const requested = new URL(request.url).searchParams.get("conversation_id");
  const hasRequestedConversation = Boolean(requested && UUID_RE.test(requested));

  // O sentinel NIL representa a conversa "clássica" (pré-0085, mensagens com
  // conversation_id NULL): nesse caso passamos null pro getRecent... para o
  // filtro ser .is("conversation_id", null). Sem conversation_id o servidor
  // resolve a conversa mais recente; com um uuid normal respeita — inclusive
  // uma conversa nova ainda vazia.
  const conversationId = hasRequestedConversation
    ? requested === NIL_CONVERSATION_UUID
      ? null
      : requested
    : await resolveLatestConversationId(supabase, user.id, orgId);
  const messages = await getRecentAssistantMessages(supabase, user.id, orgId, undefined, conversationId);

  return Response.json(
    { messages, conversation_id: conversationId },
    { headers: { "Cache-Control": "no-store" } }
  );
}
