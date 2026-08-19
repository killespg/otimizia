import { listAssistantConversations } from "@/lib/ai/history";
import { getActiveOrgId } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ conversations: [] }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const conversations = await listAssistantConversations(supabase, user.id, orgId);

  return Response.json({ conversations }, { headers: { "Cache-Control": "no-store" } });
}
