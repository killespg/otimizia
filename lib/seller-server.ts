import "server-only";

import { redirect } from "next/navigation";
import { getActiveOrgId, getOrgRole } from "@/lib/org";
import { getUserPlanAccess } from "@/lib/plan-access";
import { sellerProfileWithDefaults } from "@/lib/seller-operations";
import { createClient } from "@/lib/supabase/server";
import type { SellerBusinessProfile } from "@/lib/supabase/types";
import { parseWorkspacePreferences } from "@/lib/workspace-preferences";
import { getWorkspaceKey } from "@/lib/workspaces";

export async function getSellerPageContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const orgId = await getActiveOrgId(supabase, user.id);
  const [{ data: account }, access, role] = await Promise.all([
    supabase.from("profiles").select("profession_type,is_admin").eq("id", user.id).maybeSingle(),
    getUserPlanAccess(supabase, user.id, orgId),
    getOrgRole(supabase, orgId, user.id),
  ]);
  if (!access.hasAccess) redirect("/upgrade");
  const workspaceKey = getWorkspaceKey(account?.profession_type, user.user_metadata?.profession_type, account?.is_admin);
  if (workspaceKey !== "autonomous_seller") redirect("/painel");
  const [{ data: storedProfile }, { data: organization }] = await Promise.all([
    supabase.from("seller_business_profiles")
      .select("*").eq("org_id", orgId).eq("workspace_key", "autonomous_seller").maybeSingle(),
    supabase.from("organizations").select("workspace_preferences").eq("id", orgId).maybeSingle(),
  ]);
  const preferences = parseWorkspacePreferences(organization?.workspace_preferences);
  const compatibilityProfile = preferences.autonomous_seller?.sellerOperation;
  const profile = sellerProfileWithDefaults((compatibilityProfile ?? storedProfile) as Partial<SellerBusinessProfile> | null);
  return { supabase, user, orgId, isOrgAdmin: role === "admin", profile };
}

export function sellerProductImageUrl(storagePath: string | null | undefined) {
  if (!storagePath) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl}/storage/v1/object/public/seller-product-images/${storagePath}`;
}
