import { dealsToCsv } from "@/lib/deals-report";
import { getActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { Deal } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const monthsParam = Number(url.searchParams.get("months"));
  const monthsBack = [3, 6, 12].includes(monthsParam) ? monthsParam : 6;

  const orgId = await getActiveOrgId(supabase, user.id);
  const { data: profile } = await supabase
    .from("profiles")
    .select("profession_type, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    profile?.is_admin ?? false
  );
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("org_id", orgId)
    .eq("workspace_key", workspaceKey)
    .or(`created_at.gte.${from.toISOString()},closed_at.gte.${from.toISOString()}`)
    .order("created_at", { ascending: true });

  const csv = dealsToCsv((data ?? []) as Deal[]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vendas-${monthsBack}meses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
