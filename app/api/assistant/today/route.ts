import { getBusinessSummary, listTasks } from "@/lib/ai/tools/read";
import { logError } from "@/lib/utils/logger";
import { getActiveOrgId } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const [{ data: profile }, orgId] = await Promise.all([
      supabase
        .from("profiles")
        .select("profession_type, is_admin")
        .eq("id", user.id)
        .maybeSingle(),
      getActiveOrgId(supabase, user.id),
    ]);
    const workspaceKey = getWorkspaceKey(
      profile?.profession_type,
      user.user_metadata?.profession_type,
      profile?.is_admin ?? false,
    );
    const [summaryRaw, overdueRaw, todayRaw] = await Promise.all([
      getBusinessSummary(supabase, orgId, workspaceKey),
      listTasks(supabase, orgId, workspaceKey, { filtro: "atrasados" }),
      listTasks(supabase, orgId, workspaceKey, { filtro: "hoje" }),
    ]);

    return Response.json(
      {
        summary: JSON.parse(summaryRaw),
        overdueTasks: (JSON.parse(overdueRaw).lembretes ?? []).slice(0, 5),
        todayTasks: (JSON.parse(todayRaw).lembretes ?? []).slice(0, 5),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    logError("api/assistant/today", error, { userId: user.id });
    return Response.json(
      { error: "Resumo do dia indisponível." },
      { status: 500 },
    );
  }
}
