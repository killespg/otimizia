import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/ai/AssistantChatProvider";

const DEFAULT_LIMIT = 30;

// assistant_messages é append-only (RLS só libera select/insert — ver
// 0024_assistant_messages.sql). Nunca chamar delete/update nela.
export async function getRecentAssistantMessages(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  limit: number = DEFAULT_LIMIT
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("role, content")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[ai/history]", error);
    return [];
  }

  return (data ?? [])
    .slice()
    .reverse()
    .map((row) => ({ role: row.role as ChatMessage["role"], content: row.content as string }));
}

export async function saveAssistantMessage(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  role: ChatMessage["role"],
  content: string
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from("assistant_messages")
    .insert({ user_id: userId, org_id: orgId, role, content: trimmed });
  if (error) {
    console.error("[ai/history]", error);
  }
}
