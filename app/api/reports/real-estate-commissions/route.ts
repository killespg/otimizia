import { commissionsToCsv } from "@/lib/real-estate-commissions";
import { getActiveOrgId } from "@/lib/org";
import { canViewRealEstate } from "@/lib/real-estate";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateCommission } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";

// Mesmo padrão de app/api/reports/deals/route.ts.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const orgId = await getActiveOrgId(supabase, user.id);
  const { data: profile } = await supabase.from("profiles").select("profession_type, is_admin").eq("id", user.id).maybeSingle();
  const workspaceKey = getWorkspaceKey(profile?.profession_type, user.user_metadata?.profession_type, profile?.is_admin ?? false);
  if (workspaceKey !== "real_estate_broker") {
    return Response.json({ error: "Recurso disponível só no workspace imobiliário." }, { status: 403 });
  }
  const { data: membership } = await supabase.from("organization_members").select("job_role, role").eq("org_id", orgId).eq("user_id", user.id).maybeSingle();
  if (!canViewRealEstate(membership?.job_role, membership?.role === "admin")) {
    return Response.json({ error: "Sem acesso." }, { status: 403 });
  }

  const { data } = await supabase.from("real_estate_commissions").select("*").eq("org_id", orgId).order("created_at", { ascending: true });
  const csv = commissionsToCsv((data ?? []) as RealEstateCommission[]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="comissoes.csv"',
      "Cache-Control": "no-store",
    },
  });
}
