import { getRecentAssistantMessages } from "@/lib/ai/history";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ messages: [] }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const messages = await getRecentAssistantMessages(supabase, user.id, orgId);

  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}
