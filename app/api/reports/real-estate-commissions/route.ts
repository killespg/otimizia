import {
  commissionPeriodOrFilter,
  commissionsToCsv,
  normalizeCommissionPeriod,
} from "@/lib/real-estate-commissions";
import { getActiveOrgId } from "@/lib/org";
import { canViewRealEstate } from "@/lib/real-estate";
import { createClient } from "@/lib/supabase/server";
import type { RealEstateCommission } from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspaces";

// Mesmo padrão de app/api/reports/deals/route.ts.
export async function GET(request: Request) {
  const supabase = await createClient();
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

  const url = new URL(request.url);
  const period = normalizeCommissionPeriod(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
  );
  const broker = url.searchParams.get("broker")?.trim() ?? "";
  let query = supabase
    .from("real_estate_commissions")
    .select("*")
    .eq("org_id", orgId)
    .or(commissionPeriodOrFilter(period));
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(broker)) {
    query = query.eq("broker_id", broker);
  }
  const { data } = await query.order("due_at", { ascending: true });
  const csv = commissionsToCsv((data ?? []) as RealEstateCommission[]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="comissoes.csv"',
      "Cache-Control": "no-store",
    },
  });
}
