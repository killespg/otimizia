import { redirect } from "next/navigation";
import { ProductShell } from "@/components/design-system/product-shell";
import { DashboardRoutePreloader } from "@/components/design-system/dashboard-route-preloader";
import { DashboardNavigationFeedback } from "@/components/design-system/dashboard-navigation-feedback";
import { AssistantChatProvider } from "@/lib/ai/AssistantChatProvider";
import { buildProductNavigation, type ShellVariant } from "@/lib/design-system/navigation";
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
        ])
      : Promise.resolve(null),
  ]);
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
  const realEstateCounts = {
    properties: realEstateCountRows?.[0].count ?? 0,
    visits: realEstateCountRows?.[1].count ?? 0,
    collections: realEstateCountRows?.[2].count ?? 0,
    deals: realEstateCountRows?.[3].count ?? 0,
  };
  const countGroups = [legalCounts, sellerCountRows, realEstateCountRows];
  const countDataUnavailable = countGroups.some((group) =>
    group?.some((response) => Boolean(response.error)),
  );
  const shellVariant: ShellVariant = canViewLegalWorkspace
    ? "legal"
    : isAutonomousSeller
      ? "seller"
      : canViewRealEstateWorkspace
        ? "real-estate"
        : "generic";
  const navigation = buildProductNavigation({
    variant: shellVariant,
    counts:
      shellVariant === "legal"
        ? counts
        : shellVariant === "seller"
          ? sellerCounts
          : shellVariant === "real-estate"
            ? realEstateCounts
            : undefined,
    enabledSellerModules:
      sellerOperationPreferences?.enabled_modules ?? ["catalog", "orders"],
    access: {
      canViewLegal: lawOfficeAccess.canViewLegal,
      canViewFinance: lawOfficeAccess.canViewFinance,
      canViewRealEstate: realEstateAccess.enabled,
      isAdmin,
    },
    labels: {
      contacts: labels.contacts,
      pipeline: labels.pipeline,
      followups: labels.followups,
    },
  });
  const organizationName =
    org?.name ||
    (shellVariant === "legal"
      ? "Seu escritório"
      : shellVariant === "real-estate"
        ? "Sua imobiliária"
        : "Seu negócio");
  const notificationCount =
    shellVariant === "legal"
      ? counts.deadlines
      : shellVariant === "real-estate"
        ? realEstateCounts.visits
        : shellVariant === "seller"
          ? sellerCounts.reminders
          : 0;
  return (
    <AssistantChatProvider>
      <DashboardRoutePreloader />
      <DashboardNavigationFeedback />
      <ProductShell
        navigation={navigation}
        workspaceKey={workspaceKey}
        workspaceOptions={workspaceOptions}
        workspaceLabel={preset.signupLabel}
        organizationName={organizationName}
        displayName={displayName}
        initials={getInitials(displayName)}
        notificationCount={notificationCount}
        dataNotice={
          countDataUnavailable
            ? "Alguns indicadores não puderam ser atualizados. Os dados principais continuam disponíveis nas respectivas áreas."
            : null
        }
        trialBanner={
          access.status === "trialing" && access.trialDaysLeft !== null ? (
            <TrialBanner trialDaysLeft={access.trialDaysLeft} />
          ) : null
        }
      >
        {children}
      </ProductShell>
    </AssistantChatProvider>
  );
}
