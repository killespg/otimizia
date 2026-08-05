import { notFound } from "next/navigation";
import { canManageRealEstate, canViewRealEstate, isRealEstateV2Enabled } from "@/lib/real-estate/real-estate";
import { getActiveOrgId, getOrgMembers, getOrgRole } from "@/lib/workspace/org";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPreferences } from "@/lib/workspace/dashboard-preferences";
import { getProfessionPreset } from "@/lib/people/professions";
import type {
  RealEstateCommission,
  RealEstateOffer,
  RealEstateTarget,
  RealEstateVisit,
} from "@/lib/supabase/types";
import { getWorkspaceKey } from "@/lib/workspace/workspaces";
import { RealEstateDashboard } from "./RealEstateDashboard";

function firstOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function lastOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default async function RealEstateDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; broker?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, orgId] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type, is_admin, dashboard_preferences")
      .eq("id", user!.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user!.id),
  ]);
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user?.user_metadata?.profession_type,
    profile?.is_admin,
  );
  if (workspaceKey !== "real_estate_broker") notFound();
  const dashboardPreferences = getDashboardPreferences(
    profile?.dashboard_preferences,
    getProfessionPreset(workspaceKey),
    workspaceKey,
  );

  const [orgRole, { data: membership }, { data: org }, members] = await Promise.all([
    getOrgRole(supabase, orgId, user!.id),
    supabase.from("organization_members").select("job_role").eq("org_id", orgId).eq("user_id", user!.id).maybeSingle(),
    supabase
      .from("organizations")
      .select("real_estate_v2_enabled, real_estate_public_page_enabled, real_estate_public_page_token")
      .eq("id", orgId)
      .maybeSingle(),
    getOrgMembers(supabase, orgId),
  ]);
  const isAdmin = orgRole === "admin";
  if (!canViewRealEstate(membership?.job_role, isAdmin) || !isRealEstateV2Enabled(org)) notFound();

  const now = new Date();
  const from = filters.from || firstOfMonth(now);
  const to = filters.to || lastOfMonth(now);
  const brokerFilter = filters.broker || "";
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  let capturedQuery = supabase
    .from("real_estate_properties")
    .select("id, captured_by", { count: "exact" })
    .eq("org_id", orgId)
    .eq("workspace_key", "real_estate_broker")
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  const activePropertiesQuery = supabase
    .from("real_estate_properties")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("workspace_key", "real_estate_broker")
    .in("status", ["ativo", "reservado"]);
  const collectionsQuery = supabase
    .from("real_estate_share_collections")
    .select("id", { count: "exact" })
    .eq("org_id", orgId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  let visitsQuery = supabase
    .from("real_estate_visits")
    .select("id, status, broker_id", { count: "exact" })
    .eq("org_id", orgId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  let offersQuery = supabase
    .from("real_estate_offers")
    .select("id, status, created_by", { count: "exact" })
    .eq("org_id", orgId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  let commissionsQuery = supabase
    .from("real_estate_commissions")
    .select("*")
    .eq("org_id", orgId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso);

  if (brokerFilter) {
    capturedQuery = capturedQuery.eq("captured_by", brokerFilter);
    visitsQuery = visitsQuery.eq("broker_id", brokerFilter);
    offersQuery = offersQuery.eq("created_by", brokerFilter);
    commissionsQuery = commissionsQuery.eq("broker_id", brokerFilter);
  }

  const [
    { count: activePropertyCount },
    { count: capturedCount },
    { count: showcaseCount },
    { data: visits },
    { data: offers },
    { data: commissionRows },
    { data: targetRows },
    { data: dealsForCommission },
    { data: propertiesForCommission },
  ] = await Promise.all([
    activePropertiesQuery,
    capturedQuery,
    collectionsQuery,
    visitsQuery,
    offersQuery,
    commissionsQuery.order("created_at", { ascending: false }),
    supabase.from("real_estate_targets").select("*").eq("org_id", orgId).lte("period_start", to).gte("period_end", from),
    supabase.from("deals").select("id, title").eq("org_id", orgId).eq("workspace_key", "real_estate_broker").order("created_at", { ascending: false }).limit(50),
    supabase.from("real_estate_properties").select("id, title").eq("org_id", orgId).eq("workspace_key", "real_estate_broker").order("created_at", { ascending: false }).limit(50),
  ]);

  const displayName =
    typeof user?.user_metadata?.name === "string" && user.user_metadata.name
      ? user.user_metadata.name
      : user?.email?.split("@")[0] ?? "Corretor";

  return (
    <RealEstateDashboard
      now={now}
      displayName={displayName}
      from={from}
      to={to}
      brokerFilter={brokerFilter}
      members={members}
      canManage={canManageRealEstate(membership?.job_role, isAdmin)}
      activePropertyCount={activePropertyCount ?? 0}
      capturedCount={capturedCount ?? 0}
      showcaseCount={showcaseCount ?? 0}
      visits={(visits ?? []) as Pick<RealEstateVisit, "status">[]}
      offers={(offers ?? []) as Pick<RealEstateOffer, "status">[]}
      commissions={(commissionRows ?? []) as RealEstateCommission[]}
      targets={(targetRows ?? []) as RealEstateTarget[]}
      deals={(dealsForCommission ?? []) as Array<{ id: string; title: string }>}
      properties={(propertiesForCommission ?? []) as Array<{ id: string; title: string }>}
      organization={org}
      showAnimatedBackground={dashboardPreferences.showAnimatedBackground}
    />
  );
}
