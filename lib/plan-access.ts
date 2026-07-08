import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/logger";
import { getActiveOrgId } from "@/lib/org";
import { getPlanAccess, type PlanAccess } from "@/lib/plan";

// Plano/billing vivem na organização (não mais em profiles) — uma
// assinatura cobre todos os membros da empresa.
export async function getUserPlanAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanAccess> {
  try {
    const orgId = await getActiveOrgId(supabase, userId);
    const { data: org, error } = await supabase
      .from("organizations")
      .select("plan, plan_status, trial_ends_at, stripe_subscription_id")
      .eq("id", orgId)
      .maybeSingle();

    if (error) {
      logError("plan-access", error, { userId });
      return { hasAccess: false, status: "free", trialDaysLeft: null };
    }

    return getPlanAccess(org);
  } catch (error) {
    logError("plan-access", error, { userId });
    return { hasAccess: false, status: "free", trialDaysLeft: null };
  }
}
