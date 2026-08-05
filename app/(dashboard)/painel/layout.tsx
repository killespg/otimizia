import { redirect } from "next/navigation";
import { ProductNavigation } from "@/components/design-system/product-navigation";
import { ProductTopbar } from "@/components/design-system/product-topbar";
import { LegalProductNavigation } from "@/components/design-system/legal-product-navigation";
import { LegalProductTopbar } from "@/components/design-system/legal-product-topbar";
import { SellerProductNavigation } from "@/components/design-system/seller-product-navigation";
import { SellerProductTopbar } from "@/components/design-system/seller-product-topbar";
import { RealEstateProductNavigation } from "@/components/design-system/real-estate-product-navigation";
import { RealEstateProductTopbar } from "@/components/design-system/real-estate-product-topbar";
import { SellerDashboardBackground } from "@/components/design-system/seller-dashboard-background";
import NeuralBackground from "@/components/design-system/neural-background";
import { DashboardRoutePreloader } from "@/components/design-system/dashboard-route-preloader";
import { DashboardNavigationFeedback } from "@/components/design-system/dashboard-navigation-feedback";
import { AssistantChatProvider } from "@/lib/ai/AssistantChatProvider";
import { getDashboardPreferences } from "@/lib/workspace/dashboard-preferences";
import { canViewFinance, canViewLegal } from "@/lib/law/law-office";
import { getActiveOrgId } from "@/lib/workspace/org";
import { getUserPlanAccess } from "@/lib/billing/plan-access";
import { getProfessionPreset } from "@/lib/people/professions";
import { canManageRealEstate, canViewRealEstate } from "@/lib/real-estate/real-estate";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceLabels, parseWorkspacePreferences } from "@/lib/workspace/workspace-preferences";
import { getWorkspaceKey, getWorkspaceOptions } from "@/lib/workspace/workspaces";
import { TrialBanner } from "./TrialBanner";

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OT"
  );
}

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, orgId] = await Promise.all([
    supabase
      .from("profiles")
      .select("profession_type, profession_types, is_admin, dashboard_preferences")
      .eq("id", user.id)
      .maybeSingle(),
    getActiveOrgId(supabase, user.id),
  ]);

  const isAdmin = profile?.is_admin ?? false;
  const workspaceKey = getWorkspaceKey(
    profile?.profession_type,
    user.user_metadata?.profession_type,
    isAdmin,
  );
  const preset = getProfessionPreset(workspaceKey);
  const isLawOffice = preset.key === "law_office";
  const isAutonomousSeller = preset.key === "autonomous_seller";
  const isRealEstateBroker = preset.key === "real_estate_broker";
  const dashboardPreferences = getDashboardPreferences(
    profile?.dashboard_preferences,
    preset,
    workspaceKey,
  );
  const workspaceOptions = isAdmin
    ? []
    : getWorkspaceOptions(profile?.profession_types, preset.key);

  const [{ data: org }, access, { data: membership }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, workspace_preferences")
      .eq("id", orgId)
      .maybeSingle(),
    getUserPlanAccess(supabase, user.id, orgId),
    supabase
      .from("organization_members")
      .select("role, job_role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!access.hasAccess) redirect("/upgrade");

  const isOrgAdmin = membership?.role === "admin";
  const canViewLegalWorkspace =
    isLawOffice && canViewLegal(membership?.job_role, isOrgAdmin);
  const canViewRealEstateWorkspace =
    isRealEstateBroker &&
    canViewRealEstate(membership?.job_role, isOrgAdmin);

  // As contagens também são dados do domínio. Não basta esconder links:
  // elas só são consultadas depois que workspace e cargo foram autorizados.
  const [legalCounts, sellerCountRows, realEstateCountRows] = await Promise.all([
    canViewLegalWorkspace
      ? Promise.all([
          supabase.from("legal_cases").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["intake", "active", "waiting", "suspended"]),
          supabase.from("legal_deadlines").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "pending"),
          supabase.from("legal_documents").select("id", { count: "exact", head: true }).eq("org_id", orgId),
          supabase.from("receivables").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["pending", "partial"]),
        ])
      : Promise.resolve(null),
    isAutonomousSeller
      ? Promise.all([
          supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("workspace_key", workspaceKey),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("workspace_key", workspaceKey).in("stage", ["novo", "em_contato", "negociacao"]),
          supabase.from("tasks").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("workspace_key", workspaceKey).eq("done", false).lt("due_at", new Date().toISOString()),
        ])
      : Promise.resolve(null),
    canViewRealEstateWorkspace
      ? Promise.all([
          supabase.from("real_estate_properties").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("workspace_key", "real_estate_broker"),
          supabase.from("real_estate_visits").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["requested", "scheduled"]),
          supabase.from("real_estate_share_collections").select("id", { count: "exact", head: true }).eq("org_id", orgId).is("revoked_at", null),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("workspace_key", "real_estate_broker"),
          // Alimentam o sino do resumo, agora na topbar. São contagens
          // (head: true), não leitura de linhas: a de comissão vencida
          // reproduz `isCommissionOverdue` em consulta, para não precisar
          // carregar a carteira inteira em toda rota.
          supabase.from("real_estate_visits").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "requested"),
          supabase.from("real_estate_offers").select("id", { count: "exact", head: true }).eq("org_id", orgId).in("status", ["sent", "viewed"]),
          supabase
            .from("real_estate_commissions")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId)
            .not("status", "in", "(received,cancelled)")
            .not("due_at", "is", null)
            .lt("due_at", new Date().toISOString()),
        ])
      : Promise.resolve(null),
  ]);
  // Alimenta os atalhos de aviso das configurações rápidas, também na topbar.
  const { data: notificationRow } = canViewRealEstateWorkspace
    ? await supabase
        .from("notification_preferences")
        .select("daily_push, daily_summary_email, stalled_deal_email")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const notificationPreferences = {
    dailyPush: notificationRow?.daily_push ?? true,
    dailySummaryEmail: notificationRow?.daily_summary_email ?? true,
    stalledDealEmail: notificationRow?.stalled_deal_email ?? true,
  };
  const labels = getWorkspaceLabels(
    preset,
    org?.workspace_preferences,
    workspaceKey,
    preset.key === "livestock_producer",
  );
  const sellerOperationPreferences = parseWorkspacePreferences(
    org?.workspace_preferences,
  ).autonomous_seller?.sellerOperation;
  const lawOfficeAccess = {
    enabled: preset.key === "law_office",
    canViewLegal: canViewLegal(membership?.job_role, isOrgAdmin),
    canViewFinance: canViewFinance(membership?.job_role, isOrgAdmin),
  };
  const realEstateAccess = {
    enabled: canViewRealEstateWorkspace,
    canManage: canManageRealEstate(membership?.job_role, isOrgAdmin),
  };
  const handle = user.email?.split("@")[0] || "Usuário";
  const displayName =
    typeof user.user_metadata?.name === "string" && user.user_metadata.name
      ? user.user_metadata.name
      : handle;
  const counts = {
    cases: legalCounts?.[0].count ?? 0,
    deadlines: legalCounts?.[1].count ?? 0,
    documents: legalCounts?.[2].count ?? 0,
    receivables: legalCounts?.[3].count ?? 0,
  };
  const sellerCounts = {
    contacts: sellerCountRows?.[0].count ?? 0,
    deals: sellerCountRows?.[1].count ?? 0,
    reminders: sellerCountRows?.[2].count ?? 0,
  };
  const operationSummary = {
    requestedVisits: realEstateCountRows?.[4].count ?? 0,
    openOffers: realEstateCountRows?.[5].count ?? 0,
    overdueCommissions: realEstateCountRows?.[6].count ?? 0,
  };
  const realEstateCounts = {
    properties: realEstateCountRows?.[0].count ?? 0,
    visits: realEstateCountRows?.[1].count ?? 0,
    collections: realEstateCountRows?.[2].count ?? 0,
    deals: realEstateCountRows?.[3].count ?? 0,
  };
  return (
    <AssistantChatProvider>
      <div className={`dark product-workspace workspace-${preset.key}`}>
        <DashboardRoutePreloader />
        <DashboardNavigationFeedback />
        {canViewLegalWorkspace ? (
          <LegalProductNavigation
            displayName={displayName}
            organizationName={org?.name || "Seu escritório"}
            canViewFinance={lawOfficeAccess.canViewFinance}
            counts={counts}
          />
        ) : isAutonomousSeller ? (
          <SellerProductNavigation
            workspaceKey={workspaceKey}
            workspaceOptions={workspaceOptions}
            displayName={displayName}
            organizationName={org?.name || "Seu negócio"}
            counts={sellerCounts}
            enabledModules={(sellerOperationPreferences?.enabled_modules ?? ["catalog", "orders"]) as import("@/lib/supabase/types").SellerModule[]}
          />
        ) : canViewRealEstateWorkspace ? (
          <RealEstateProductNavigation
            workspaceKey={workspaceKey}
            workspaceOptions={workspaceOptions}
            displayName={displayName}
            organizationName={org?.name || "Sua imobiliária"}
            counts={realEstateCounts}
          />
        ) : (
          <ProductNavigation
            workspaceKey={workspaceKey}
            workspaceOptions={workspaceOptions}
            workspaceLabel={preset.signupLabel}
            displayName={displayName}
            isAdmin={isAdmin}
            lawOfficeAccess={lawOfficeAccess}
            realEstateAccess={realEstateAccess}
            labels={{
              contacts: labels.contacts,
              pipeline: labels.pipeline,
              followups: labels.followups,
            }}
          />
        )}
        <div
          className={`product-content relative isolate flex min-h-screen flex-col ${isLawOffice || isAutonomousSeller || isRealEstateBroker ? "overflow-hidden" : ""}`}
        >
          {isLawOffice || isAutonomousSeller || isRealEstateBroker ? (
            <>
              {isAutonomousSeller || isRealEstateBroker ? (
                <SellerDashboardBackground enabled={dashboardPreferences.showAnimatedBackground} />
              ) : null}
              {isLawOffice ? (
                <div
                  className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="sticky top-0 h-screen opacity-[0.12]"
                    data-dashboard-particles="legal"
                  >
                    <NeuralBackground
                      color="#8b5cf6"
                      backgroundColor="#151419"
                      trailOpacity={0.2}
                      particleCount={260}
                      speed={0.5}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          {canViewLegalWorkspace ? (
            <LegalProductTopbar initials={getInitials(displayName)} />
          ) : isAutonomousSeller ? (
            <SellerProductTopbar initials={getInitials(displayName)} reminderCount={sellerCounts.reminders} />
          ) : canViewRealEstateWorkspace ? (
            <RealEstateProductTopbar
              displayName={displayName}
              visitCount={realEstateCounts.visits}
              operationSummary={operationSummary}
              notificationPreferences={notificationPreferences}
            />
          ) : (
            <ProductTopbar initials={getInitials(displayName)} />
          )}
          {access.status === "trialing" && access.trialDaysLeft !== null ? (
            <TrialBanner trialDaysLeft={access.trialDaysLeft} />
          ) : null}
          <main
            className={`relative z-10 w-full flex-1 ${isLawOffice || isAutonomousSeller || isRealEstateBroker ? "p-4 pb-6 md:p-8 md:pb-8" : "px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-7"}`}
          >
            {children}
          </main>
        </div>
      </div>
    </AssistantChatProvider>
  );
}
